import { state } from './state.js';
import { getUserCompany, getAllComments, getIssue } from './api.js';
import {
  createLoadingIndicator,
  renderIssueTable,
  updateCommentsContent,
} from './ui.js';

async function refreshAllComments() {
  const issueContainers = document.getElementById('issueContainers');
  const loadingIndicator = createLoadingIndicator('Refreshing comments...');
  issueContainers.appendChild(loadingIndicator);
  state.setComments([]);

  try {
    for (const issueRef of state.trackedIssues) {
      const [repo, issueNumber] = issueRef.split('#');
      const updateProgress = (message) => {
        const progressElement = loadingIndicator.querySelector('span');
        if (progressElement)
          progressElement.textContent = `${issueRef}: ${message}`;
      };

      const [issue, comments] = await Promise.all([
        getIssue(repo, issueNumber),
        getAllComments(repo, issueNumber, updateProgress),
      ]);

      const commentsWithMeta = [
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

      state.addComments(commentsWithMeta);
    }

    const uniqueUsers = new Set(
      state.allIssueComments.map((comment) => comment.user.login)
    );
    const companies = await Promise.all(
      [...uniqueUsers].map(async (username) => {
        const company = await getUserCompany(username);
        return [username, company];
      })
    );

    companies.forEach(([username, company]) =>
      state.setUserCompany(username, company)
    );

    loadingIndicator.remove();
    updateCommentsContent();
  } catch (error) {
    loadingIndicator.innerHTML = `<p>Error: ${error.message}</p>`;
  }
}

async function handleAddIssue(repo, issueNumber) {
  const issueRef = `${repo}#${issueNumber}`;

  if (!repo || !issueNumber) {
    alert('Please fill in both repository and issue number');
    return false;
  }

  if (!state.addTrackedIssue(issueRef)) {
    alert('This issue is already being tracked');
    return false;
  }

  renderIssueTable();
  await refreshAllComments();
  return true;
}

function setupEventListeners() {
  document
    .getElementById('addIssueButton')
    .addEventListener('click', async () => {
      const repo = document.getElementById('repo').value;
      const issueNumber = document.getElementById('issueNumber').value;

      if (await handleAddIssue(repo, issueNumber)) {
        document.getElementById('repo').value = '';
        document.getElementById('issueNumber').value = '';
      }
    });

  document
    .getElementById('issueTableBody')
    .addEventListener('click', async (e) => {
      if (e.target.classList.contains('remove-issue')) {
        const issueRef = e.target.dataset.issue;
        state.removeTrackedIssue(issueRef);
        renderIssueTable();
        await refreshAllComments();
      }
    });

  document.getElementById('issueContainers').addEventListener('click', (e) => {
    if (e.target.classList.contains('issue-reference')) {
      const issueRef = e.target.dataset.issue;
      state.setActiveFilter(state.activeFilter === issueRef ? null : issueRef);
      updateCommentsContent();
    }
  });
}

export { setupEventListeners, refreshAllComments };
