import { state } from './state.js';
import { getUserCompany, getAllComments, getIssue } from './api.js';
import { LoadingIndicator } from './components/loading.js';

/**
 * Fetches issue data and comments for a given repository and issue number
 * @param {string} repo - Repository name
 * @param {number} issueNumber - Issue number
 * @param {LoadingIndicator} loadingIndicator - Handler for progress updates
 */
async function fetchIssueData(repo, issueNumber, loadingIndicator) {
  const issueRef = `${repo}#${issueNumber}`;

  try {
    console.log(`Fetching data for ${issueRef}`);
    const [issue, comments] = await Promise.all([
      getIssue(repo, issueNumber),
      getAllComments(
        repo,
        issueNumber,
        (msg) => (loadingIndicator.message = msg)
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
    loadingIndicator.message = error.message;
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
      id: String(`issue-${repo.replace('/', '-')}-${issueNumber}`),
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
      id: String(comment.id),
      issueNumber,
      issueTitle: issue.title,
      repo,
    })),
  ];
}

/**
 * Processes a single tracked issue
 * @param {string} issueRef - Issue reference (repo#number)
 * @param {LoadingIndicator} loadingIndicator - Handler for progress updates
 */
async function processTrackedIssue(issueRef, loadingIndicator) {
  const [repo, issueNumber] = issueRef.split('#');

  if (!repo || !issueNumber) {
    console.error('Invalid issue reference:', issueRef);
    return;
  }

  const result = await fetchIssueData(repo, issueNumber, loadingIndicator);
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

// Event handlers
async function refreshAllComments() {
  const loadingIndicator = document.createElement('loading-indicator');
  loadingIndicator.message = 'Refreshing comments...';
  document.body.appendChild(loadingIndicator);

  try {
    if (!state.trackedIssues?.size) {
      loadingIndicator.message = 'No issues to refresh';
      setTimeout(() => loadingIndicator.remove(), 2000);
      return;
    }

    state.setComments([]);
    console.log(
      'Starting to fetch comments for issues:',
      Array.from(state.trackedIssues)
    );

    await Promise.all(
      Array.from(state.trackedIssues).map((issueRef) =>
        processTrackedIssue(issueRef, loadingIndicator)
      )
    );

    const companies = await fetchUserCompanies(state.allIssueComments);
    companies.forEach(([username, company]) =>
      state.setUserCompany(username, company)
    );

    loadingIndicator.remove();
    console.log('Comments updated via state changes');
  } catch (error) {
    console.error('Error in refreshAllComments:', error);
    loadingIndicator.message = error.message;
    setTimeout(() => loadingIndicator.remove(), 3000);
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

  // Issue table will update via state subscription
  await refreshAllComments();
  return true;
}

async function handleIssueRemoval(issueRef) {
  if (state.removeTrackedIssue(issueRef)) {
    // Issue table will update via state subscription
    await refreshAllComments();
  }
  return true;
}

function setupEventListeners() {
  const addIssueButton = document.getElementById('addIssueButton');
  const issueTable = document.querySelector('issue-table');

  addIssueButton?.addEventListener('click', async () => {
    const repo = document.getElementById('repo').value;
    const issueNumber = document.getElementById('issueNumber').value;

    if (await handleAddIssue(repo, issueNumber)) {
      document.getElementById('repo').value = '';
      document.getElementById('issueNumber').value = '';
    }
  });

  issueTable?.addEventListener('issue-removed', async (e) => {
    await handleIssueRemoval(e.detail.issue);
  });
}

export { setupEventListeners, refreshAllComments };
