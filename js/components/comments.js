import { state } from '../state.js';

// Helper function to get all comments in the reference chain
function getAllReferencedComments(commentId, visited = new Set()) {
  if (visited.has(String(commentId))) {
    return visited;
  }

  visited.add(String(commentId));

  const comment = state.allIssueComments.find(
    (c) => String(c.id) === String(commentId)
  );
  if (!comment) return visited;

  // Add direct references
  comment.references.forEach((refId) => {
    getAllReferencedComments(refId, visited);
  });

  // Also follow reverse references
  state.allIssueComments.forEach((c) => {
    if (c.references.has(String(commentId))) {
      getAllReferencedComments(c.id, visited);
    }
  });

  return visited;
}

function filterComments(selectedCommentId, scrollToElement = null) {
  console.log('Filtering comments with selected ID:', selectedCommentId);
  const comments = document.querySelectorAll('.comment');

  if (!selectedCommentId) {
    console.log('Clearing all filters');
    comments.forEach((comment) => {
      comment.classList.remove('filtered');
      comment.classList.remove('selected');
    });

    // Scroll to the clicked element when clearing filters
    if (scrollToElement) {
      scrollToElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return;
  }

  // Convert ID to string for consistent comparison
  const selectedCommentId_str = String(selectedCommentId);
  const selectedComment = state.allIssueComments.find(
    (c) => String(c.id) === selectedCommentId_str
  );

  if (!selectedComment) {
    console.warn('Selected comment not found:', selectedCommentId);
    return;
  }

  console.log('Found selected comment:', selectedComment);

  // Get all comments in the reference chain
  const referencedComments = getAllReferencedComments(selectedCommentId_str);
  console.log('All referenced comments:', [...referencedComments]);

  comments.forEach((commentEl) => {
    const commentId = commentEl.dataset.commentId;
    commentEl.classList.remove('selected');

    if (!commentId) return;

    const isSelf = String(commentId) === selectedCommentId_str;
    const isInReferenceChain = referencedComments.has(String(commentId));

    if (!isInReferenceChain && !isSelf) {
      commentEl.classList.add('filtered');
    } else {
      commentEl.classList.remove('filtered');
      if (isSelf) {
        commentEl.classList.add('selected');
      }
    }
  });
}

function setupCommentClickHandlers() {
  const container = document.getElementById('issueContainers');
  if (!container) {
    console.warn('Comments container not found');
    return;
  }

  container.addEventListener('click', (e) => {
    const commentEl = e.target.closest('.comment');
    const referenceItem = e.target.closest('.reference-item');

    // Handle clicks on reference items
    if (referenceItem) {
      const refId = referenceItem.textContent
        .split(' - ')[0]
        .replace('ID: ', '')
        .trim();
      console.log('Reference item clicked:', refId);
      filterComments(refId);
      return;
    }

    // Handle clicks on the comment itself
    if (commentEl) {
      const commentId = commentEl.dataset.commentId;
      console.log('Comment clicked:', commentId);

      const wasFiltered = document.querySelector('.comment.filtered');
      if (wasFiltered) {
        console.log('Comments were filtered, clearing filters');
        filterComments(null, commentEl);
      } else {
        console.log('Applying filter for comment:', commentId);
        filterComments(commentId);
      }
    }
  });
}

function updateCommentsDisplay() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    console.log(
      'Updating comments display. Total comments:',
      state.allIssueComments.length
    );

    const commentsHtml = state.allIssueComments
      .map((comment) => {
        const html = comment.toHTML(state.getUserCompany(comment.user.login));
        console.log('Generated HTML for comment:', comment.id);
        return html;
      })
      .join('');

    container.innerHTML = `
      <div class="comments-section">
        ${commentsHtml || '<div class="no-comments">No comments found</div>'}
      </div>`;
  } catch (error) {
    console.error('Error updating comments:', error);
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}

export const updateCommentsContent = updateCommentsDisplay;
export { setupCommentClickHandlers };
