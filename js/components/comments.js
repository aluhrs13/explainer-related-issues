import { state } from '../state.js';

function filterComments(selectedCommentId) {
  const comments = document.querySelectorAll('.comment');
  if (!selectedCommentId) {
    comments.forEach((comment) => comment.classList.remove('filtered'));
    return;
  }

  const selectedComment = state.allIssueComments.find(
    (c) => c.id === selectedCommentId
  );
  if (!selectedComment) return;

  comments.forEach((commentEl) => {
    const commentId = commentEl.dataset.commentId;
    const comment = state.allIssueComments.find((c) => c.id === commentId);

    const isReferenced = selectedComment.references.has(commentId);
    const hasReference = comment?.references.has(selectedCommentId);
    const isSelf = commentId === selectedCommentId;

    if (!isReferenced && !hasReference && !isSelf) {
      commentEl.classList.add('filtered');
    } else {
      commentEl.classList.remove('filtered');
    }
  });
}

function setupCommentClickHandlers() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  container.addEventListener('click', (e) => {
    // Handle clicks on reference items specifically
    const referenceItem = e.target.closest('.reference-item');
    if (referenceItem) {
      const refId = referenceItem.textContent.split(' - ')[0].replace('ID: ', '');
      filterComments(refId);
      return;
    }

    // Handle clicks on the comment itself
    const commentEl = e.target.closest('.comment');
    if (!commentEl) return;

    const wasFiltered = document.querySelector('.comment.filtered');
    const commentId = commentEl.dataset.commentId;
    
    // Toggle filtering
    if (wasFiltered) {
      filterComments(null); // Clear filtering
    } else {
      filterComments(commentId); // Apply filtering
    }
  });
}

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
export { setupCommentClickHandlers };
