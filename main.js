import { state } from './js/state.js';
import { setupEventListeners, refreshAllComments } from './js/handlers.js';
import { renderIssueTable } from './js/ui.js';

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
  // Add refresh button
  const table = document.querySelector('.issue-table table');
  const refreshButton = document.createElement('button');
  refreshButton.textContent = 'Refresh All Comments';
  refreshButton.className = 'refresh-comments';
  refreshButton.addEventListener('click', refreshAllComments);
  table.parentElement.insertBefore(refreshButton, table);

  // Setup event listeners
  setupEventListeners();

  // Load saved state and refresh comments
  await state.loadSavedState();
  if (state.trackedIssues.size > 0) {
    renderIssueTable();
    await refreshAllComments();
  }
});
