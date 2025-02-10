import { state } from '../state.js';

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
    const selectedComment = selectedQuote.closest('.comment');
    const selectedCommentBody =
      selectedComment.querySelector('.comment-body').textContent;

    // Get all non-filtered comments
    const comments = Array.from(
      container.querySelectorAll('.comment:not(.filtered)')
    );

    comments.forEach((comment) => {
      if (comment === selectedComment) {
        comment.classList.add('quote-related');
        return;
      }

      const body = comment.querySelector('.comment-body').textContent;
      // Check if the comment contains the selected quote or quotes any part of the selected comment
      if (
        body.includes(quoteText) ||
        (comment.querySelectorAll('blockquote').length > 0 &&
          Array.from(comment.querySelectorAll('blockquote')).some((quote) =>
            selectedCommentBody.includes(quote.textContent.trim())
          ))
      ) {
        comment.classList.add('quote-related');
      }
    });
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
      .map((comment) =>
        comment.toHTML(
          state.activeFilter === comment.issueRef,
          state.getUserCompany(comment.user.login)
        )
      )
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
