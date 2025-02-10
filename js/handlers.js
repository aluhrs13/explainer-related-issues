// Core imports
import { state } from './state.js';

// API imports
import { getUserCompany, getAllComments, getIssue } from './api.js';

// UI imports
import {
  createLoadingIndicator,
  renderIssueTable,
  updateCommentsContent,
} from './ui.js';

import { ProgressHandler } from './components/progress-handler.js';

/**
 * Fetches issue data and comments for a given repository and issue number
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {ProgressHandler} progressHandler - Handler for progress updates
 */
async function fetchIssueData(repo, issueNumber, progressHandler) {
  const issueRef = `${repo}#${issueNumber}`;

  try {
    console.log(`Fetching data for ${issueRef}`);
    const [issue, comments] = await Promise.all([
      getIssue(repo, issueNumber),
      getAllComments(repo, issueNumber, (msg) =>
        progressHandler.update(issueRef, msg)
      ),
    ]);

    if (!issue) {
      throw new Error(`Issue ${issueRef} not found`);
    }

    console.log(`Received issue data for ${issueRef}`, {
      issue,
      commentsCount: comments.length,
    });

    return { issue, comments, issueRef };
  } catch (error) {
    console.error(`Error fetching data for ${issueRef}:`, error);
    progressHandler.setError(error.message);
    return null;
  }
}

/**
 * Fetches company information for all unique users in comments
 * @param {Array} comments - Array of comments
 * @returns {Promise<Array>} Array of [username, company] pairs
 */
async function fetchUserCompanies(comments) {
  const uniqueUsers = new Set(comments.map((comment) => comment.user.login));
  console.log('Fetching company info for users:', Array.from(uniqueUsers));

  return Promise.all(
    [...uniqueUsers].map(async (username) => {
      const company = await getUserCompany(username);
      return [username, company];
    })
  );
}

/**
 * Processes issue comments and combines with issue metadata
 * @param {Object} issue - Issue data
 * @param {Array} comments - Comments data
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 */
function processIssueComments(issue, comments, repo, issueNumber) {
  return [
    {
      user: issue.user,
      created_at: issue.created_at,
      body: issue.body,
      isOriginalPost: true,
      issueNumber,
      issueTitle: issue.title,
      repo,
    },
    ...comments.map((comment) => ({
      ...comment,
      issueNumber,
      issueTitle: issue.title,
      repo,
    })),
  ];
}

/**
 * Processes a single tracked issue
 * @param {string} issueRef - Issue reference (repo#number)
 * @param {ProgressHandler} progressHandler - Handler for progress updates
 */
async function processTrackedIssue(issueRef, progressHandler) {
  const [repo, issueNumber] = issueRef.split('#');

  if (!repo || !issueNumber) {
    console.error('Invalid issue reference:', issueRef);
    return;
  }

  const result = await fetchIssueData(repo, issueNumber, progressHandler);
  if (!result) return;

  const { issue, comments } = result;
  const commentsWithMeta = processIssueComments(
    issue,
    comments,
    repo,
    issueNumber
  );
  state.addComments(commentsWithMeta);
}

/**
 * Updates the filtered state of comments based on reference relationships
 * @param {string} activeFilter - Active issue filter
 */
function updateFilteredComments(activeFilter) {
  // First mark all comments that don't match the active filter
  state.allIssueComments.forEach((comment) => {
    comment.setFiltered(activeFilter && comment.issueRef !== activeFilter);
  });

  if (!activeFilter) return;

  // Build a map of comment ID to all related comments
  const relationshipMap = new Map();
  state.allIssueComments.forEach((comment) => {
    if (!relationshipMap.has(comment.id)) {
      relationshipMap.set(comment.id, new Set());
    }

    comment.references.forEach((referencedId) => {
      relationshipMap.get(comment.id).add(referencedId);
      if (!relationshipMap.has(referencedId)) {
        relationshipMap.set(referencedId, new Set());
      }
      relationshipMap.get(referencedId).add(comment.id);
    });
  });

  // Process the reference graph
  const visibleIds = new Set(
    state.allIssueComments
      .filter((comment) => !comment.isFiltered)
      .map((comment) => comment.id)
  );
  const toProcess = [...visibleIds];

  while (toProcess.length > 0) {
    const currentId = toProcess.pop();
    const relatedIds = relationshipMap.get(currentId) || new Set();

    for (const relatedId of relatedIds) {
      if (!visibleIds.has(relatedId)) {
        visibleIds.add(relatedId);
        toProcess.push(relatedId);
      }
    }
  }

  // Update filtered state
  state.allIssueComments.forEach((comment) => {
    if (visibleIds.has(comment.id)) {
      comment.setFiltered(false);
    }
  });
}

// Event handlers
async function refreshAllComments() {
  const progressHandler = new ProgressHandler(
    createLoadingIndicator('Refreshing comments...')
  );

  try {
    if (!state.trackedIssues?.size) {
      progressHandler.setEmpty();
      return;
    }

    state.setComments([]);
    console.log(
      'Starting to fetch comments for issues:',
      Array.from(state.trackedIssues)
    );

    await Promise.all(
      Array.from(state.trackedIssues).map((issueRef) =>
        processTrackedIssue(issueRef, progressHandler)
      )
    );

    const companies = await fetchUserCompanies(state.allIssueComments);
    companies.forEach(([username, company]) =>
      state.setUserCompany(username, company)
    );

    progressHandler.remove();
    console.log('Updating comments display...');
    updateCommentsContent();
  } catch (error) {
    console.error('Error in refreshAllComments:', error);
    progressHandler.setError(error.message);
  }
}

async function handleAddIssue(repo, issueNumber) {
  if (!repo || !issueNumber) {
    alert('Please fill in both repository and issue number');
    return false;
  }

  const issueRef = `${repo}#${issueNumber}`;
  if (!state.addTrackedIssue(issueRef)) {
    alert('This issue is already being tracked');
    return false;
  }

  renderIssueTable();
  await refreshAllComments();
  return true;
}

function handleIssueRemoval(issueRef) {
  state.removeTrackedIssue(issueRef);
  renderIssueTable();
  return refreshAllComments();
}

function handleIssueFilter(issueRef) {
  state.setActiveFilter(state.activeFilter === issueRef ? null : issueRef);
  updateFilteredComments(state.activeFilter);
  updateCommentsContent();
}

function setupEventListeners() {
  const addIssueButton = document.getElementById('addIssueButton');
  const issueTableBody = document.getElementById('issueTableBody');
  const issueContainers = document.getElementById('issueContainers');

  addIssueButton?.addEventListener('click', async () => {
    const repo = document.getElementById('repo').value;
    const issueNumber = document.getElementById('issueNumber').value;

    if (await handleAddIssue(repo, issueNumber)) {
      document.getElementById('repo').value = '';
      document.getElementById('issueNumber').value = '';
    }
  });

  issueTableBody?.addEventListener('click', async (e) => {
    if (e.target.classList.contains('remove-issue')) {
      await handleIssueRemoval(e.target.dataset.issue);
    }
  });

  issueContainers?.addEventListener('click', (e) => {
    if (e.target.classList.contains('issue-reference')) {
      handleIssueFilter(e.target.dataset.issue);
    }
  });
}

export { setupEventListeners, refreshAllComments };
