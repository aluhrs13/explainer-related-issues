import { state } from './state.js';
import { getUserCompany, getAllComments, getIssue } from './api.js';
import {
  createLoadingIndicator,
  renderIssueTable,
  updateCommentsContent,
} from './ui.js';

class ProgressHandler {
  constructor(loadingIndicator) {
    this.loadingIndicator = loadingIndicator;
  }

  update(issueRef, message) {
    const progressElement = this.loadingIndicator.querySelector('span');
    if (progressElement) {
      progressElement.textContent = `${issueRef}: ${message}`;
    }
  }

  setError(message) {
    this.loadingIndicator.innerHTML = `<p>Error: ${message}</p>`;
  }

  setEmpty() {
    this.loadingIndicator.innerHTML =
      '<p>No issues being tracked. Add an issue to see comments.</p>';
  }

  remove() {
    this.loadingIndicator.remove();
  }
}

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
      throw new Error('No issue data received');
    }

    console.log(`Received issue data for ${issueRef}:`, {
      issue,
      commentsCount: comments.length,
    });

    return {
      issue,
      comments,
      issueRef,
    };
  } catch (error) {
    console.error(`Error fetching data for ${issueRef}:`, error);
    progressHandler.update(issueRef, `Error: ${error.message}`);
    return null;
  }
}

async function fetchUserCompanies(comments) {
  const uniqueUsers = new Set(comments.map((comment) => comment.user.login));
  console.log('Fetching company info for users:', Array.from(uniqueUsers));

  const companies = await Promise.all(
    [...uniqueUsers].map(async (username) => {
      const company = await getUserCompany(username);
      return [username, company];
    })
  );

  return companies;
}

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

  // Update filtered state of comments based on active filter
  state.allIssueComments.forEach((comment) => {
    comment.setFiltered(
      state.activeFilter && comment.issueRef !== state.activeFilter
    );
  });

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
