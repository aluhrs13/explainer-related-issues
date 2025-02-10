import { state } from '../state.js';

function updateCommentVisibility() {
  const container = document.getElementById('issueContainers');
  const selectedQuote = document.querySelector('.quote-selected');

  // Reset quote-related states
  state.allIssueComments.forEach((comment) => comment.setQuoteRelated(false));

  // Apply quote filter if a quote is selected
  if (selectedQuote) {
    const quoteText = selectedQuote.textContent.trim();
    const selectedComment = state.allIssueComments.find(
      (comment) =>
        comment.id === selectedQuote.closest('.comment').dataset.commentId
    );

    if (selectedComment) {
      selectedComment.setQuoteRelated(true);

      state.allIssueComments.forEach((comment) => {
        if (!comment.isFiltered && comment !== selectedComment) {
          if (
            comment.hasQuote(quoteText) ||
            comment.containsQuoteFrom(selectedComment)
          ) {
            comment.setQuoteRelated(true);
          }
        }
      });
    }
  }

  // Trigger re-render
  updateCommentsDisplay(selectedQuote);
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

function updateCommentsDisplay(selectedQuote = null) {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    const commentsHtml = state
      .getFilteredComments()
      .map((comment) =>
        comment.toHTML(
          state.activeFilter === comment.issueRef,
          state.getUserCompany(comment.user.login)
        )
      )
      .join('');

    // Preserve the quote-filtering class if a quote is selected
    const quoteFilteringClass = selectedQuote ? ' quote-filtering' : '';

    container.innerHTML = `
      <div class="comments-section${quoteFilteringClass}">
        ${commentsHtml}
      </div>`;

    // Set up handlers after updating content
    setupQuoteHandlers(container);

    // Reapply quote-selected class if needed
    if (selectedQuote) {
      const selectedText = selectedQuote.textContent.trim();
      const allQuotes = container.querySelectorAll('blockquote');
      const newQuote = Array.from(allQuotes).find(
        (quote) => quote.textContent.trim() === selectedText
      );

      if (newQuote) {
        newQuote.classList.add('quote-selected');
        const parentComment = newQuote.closest('.comment');
        if (parentComment) {
          parentComment.classList.add('comment-selected');
        }
      }
    }
  } catch (error) {
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}

export const updateCommentsContent = updateCommentsDisplay;
