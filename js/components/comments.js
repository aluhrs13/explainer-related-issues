import { state } from '../state.js';

const parseMarkdown = (text) =>
  window.marked ? window.marked.parse(text) : text;

function updateCommentVisibility() {
  const container = document.getElementById('issueContainers');
  const selectedQuote = document.querySelector('.quote-selected');

  // Reset all comments first
  container.classList.remove('quote-filtering');
  container.querySelectorAll('.comment').forEach((comment) => {
    comment.classList.remove('filtered', 'quote-related');
  });

  // Apply issue filter
  if (state.activeFilter) {
    container.querySelectorAll('.comment').forEach((comment) => {
      const issueRef = comment.querySelector('.issue-reference').dataset.issue;
      if (issueRef !== state.activeFilter) {
        comment.classList.add('filtered');
      }
    });
  }

  // Apply quote filter if a quote is selected
  if (selectedQuote) {
    container.classList.add('quote-filtering');
    const quoteText = selectedQuote.textContent.trim();

    // Mark comments containing the quote as related
    container.querySelectorAll('.comment:not(.filtered)').forEach((comment) => {
      const body = comment.querySelector('.comment-body').textContent;
      if (body.includes(quoteText)) {
        comment.classList.add('quote-related');
      }
    });
  }
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

        // Update visibility
        updateCommentVisibility();
      });
    });
}

function updateCommentsDisplay() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    const commentsHtml = state.allIssueComments
      .map((comment) => renderComment(comment))
      .join('');

    container.innerHTML = `
      <div class="comments-section">
        ${commentsHtml}
      </div>`;

    // Set up handlers after updating content
    setupQuoteHandlers(container);
    updateCommentVisibility();
  } catch (error) {
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}

export const updateCommentsContent = updateCommentsDisplay;
