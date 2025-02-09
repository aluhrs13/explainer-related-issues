import { state } from '../state.js';

// Ensure marked is available from window global
const parseMarkdown = (text) =>
  window.marked ? window.marked.parse(text) : text;

// Add function to modify filtered comments
function modifyFilteredComments(comments) {
  // Find any selected quote
  const selectedQuote = document.querySelector('.quote-selected');
  if (!selectedQuote) {
    return comments; // Return all comments when no quote is selected
  }

  // Get the selected comment
  const selectedComment = selectedQuote.closest('.comment');
  if (!selectedComment) {
    return comments;
  }

  // Get the quote text
  const quoteText = selectedQuote.textContent.trim();
  console.log('Selected quote:', quoteText);

  // Filter comments that contain the quote text or are the selected comment
  return comments.filter(
    (comment) =>
      comment.body.includes(quoteText) ||
      selectedComment.getAttribute('data-comment-id') === `${comment.id}`
  );
}

const createCommentHeader = (comment, issueRef, isActive, company) => {
  const authorInfo = `${comment.user.login}${company ? ` (${company})` : ''}`;
  const date = new Date(comment.created_at).toLocaleDateString();
  const issueButton = `<button class="issue-reference${
    isActive ? ' active' : ''
  }" data-issue="${issueRef}">${issueRef}</button>`;
  const originalPostBadge = comment.isOriginalPost
    ? `<span class="original-post-badge">Original Post: ${comment.issueTitle}</span>`
    : '';

  return `
    <div class="comment-header">
      <span class="comment-author">${authorInfo}</span>
      <span class="comment-date">${date}</span>
      ${issueButton}
      ${originalPostBadge}
    </div>`;
};

export function renderComment(comment) {
  const issueRef = `${comment.repo}#${comment.issueNumber}`;
  const isActive = state.activeFilter === issueRef;
  const company = state.getUserCompany(comment.user.login);

  try {
    const header = createCommentHeader(comment, issueRef, isActive, company);
    const body = `<div class="comment-body">${parseMarkdown(
      comment.body || ''
    )}</div>`;

    return `
      <div class="comment${
        comment.isOriginalPost ? ' original-post' : ''
      }" data-comment-id="${comment.id}">
        ${header}
        ${body}
      </div>`;
  } catch (error) {
    return `<div class="comment error">Error rendering comment: ${error.message}</div>`;
  }
}

function setupQuoteHandlers(container) {
  container
    .querySelectorAll('.comment-body blockquote')
    .forEach((blockquote) => {
      blockquote.style.cursor = 'pointer';
      blockquote.addEventListener('click', () => {
        // Remove any existing selections first
        document.querySelectorAll('.quote-selected').forEach((quote) => {
          if (quote !== blockquote) {
            quote.classList.remove('quote-selected');
            const comment = quote.closest('.comment');
            if (comment) {
              comment.classList.remove('comment-selected');
            }
          }
        });

        // Toggle selection on clicked quote
        blockquote.classList.toggle('quote-selected');
        const parentComment = blockquote.closest('.comment');
        if (parentComment) {
          parentComment.classList.toggle('comment-selected');
        }

        // Update the comments display without re-adding handlers
        updateCommentsDisplay();
      });
    });
}

function updateCommentsDisplay() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    const filteredComments = modifyFilteredComments(
      state.getFilteredComments()
    );
    const commentsHtml = filteredComments
      .map((comment) => renderComment(comment))
      .join('');

    container.innerHTML = `
      <div class="comments-section">
        ${commentsHtml}
      </div>`;

    // Set up handlers after updating content
    setupQuoteHandlers(container);
  } catch (error) {
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}

// Update the exported function to use the new structure
export const updateCommentsContent = updateCommentsDisplay;
