import { state } from './js/state.js';
import { setupEventListeners, refreshAllComments } from './js/handlers.js';
import './js/components/comments.js';
import './js/components/table.js'; // Add import for issue-table component

document.addEventListener('DOMContentLoaded', async () => {
  // Add refresh button
  const table = document.querySelector('.issue-table');
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh All Comments';
  refreshButton.className = 'refresh-comments';
  refreshButton.addEventListener('click', refreshAllComments);
  table.insertBefore(refreshButton, table.firstChild);

  // Setup event listeners
  setupEventListeners();

  // Create and insert the comments section component
  const issueContainers = document.getElementById('issueContainers');
  const commentsSection = document.createElement('comments-section');
  issueContainers.appendChild(commentsSection);

  // Subscribe to state changes
  state.subscribe((newState) => {
    const section = document.querySelector('comments-section');
    if (section) {
      section.comments = newState.allIssueComments;
    }
    // Update issue table
    const issueTable = document.querySelector('issue-table');
    if (issueTable) {
      issueTable.issues = Array.from(newState.trackedIssues);
    }
  });

  // Load saved state and refresh comments
  await state.loadSavedState();
  if (state.trackedIssues.size > 0) {
    const issueTable = document.querySelector('issue-table');
    if (issueTable) {
      issueTable.issues = Array.from(state.trackedIssues);
    }
    await refreshAllComments();
  }
});
