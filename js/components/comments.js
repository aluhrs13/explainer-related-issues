import { state } from '../state.js';

function updateCommentsDisplay(selectedQuote = null) {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    const commentsHtml = state.allIssueComments
      .map((comment) =>
        comment.toHTML(state.getUserCompany(comment.user.login))
      )
      .join('');

    container.innerHTML = `
      <div class="comments-section">
        ${commentsHtml || '<div class="no-comments">No comments found</div>'}
      </div>`;
  } catch (error) {
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}

export const updateCommentsContent = updateCommentsDisplay;
