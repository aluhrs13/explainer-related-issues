import { state } from '../state.js';

// Ensure marked is available from window global
const parseMarkdown = (text) =>
  window.marked ? window.marked.parse(text) : text;

const createCommentHeader = (comment, issueRef, isActive, company) => {
  const authorInfo = `${comment.user.login}${company ? ` (${company})` : ''}`;
  const date = new Date(comment.created_at).toLocaleDateString();
  const issueButton = `<button class="issue-reference${isActive ? ' active' : ''}" data-issue="${issueRef}">${issueRef}</button>`;
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
    const body = `<div class="comment-body">${parseMarkdown(comment.body || '')}</div>`;
    
    return `
      <div class="comment${comment.isOriginalPost ? ' original-post' : ''}">
        ${header}
        ${body}
      </div>`;
  } catch (error) {
    return `<div class="comment error">Error rendering comment: ${error.message}</div>`;
  }
}

export function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  try {
    const filteredComments = state.getFilteredComments();
    const commentsHtml = filteredComments
      .map((comment) => renderComment(comment))
      .join('');

    container.innerHTML = `
      <div class="comments-section">
        ${commentsHtml}
      </div>`;
  } catch (error) {
    container.innerHTML = `<div class="error">Error updating comments: ${error.message}</div>`;
  }
}
