import { state } from './state.js';

export function createLoadingIndicator(message) {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>${message}</span>
    `;
  return indicator;
}

export function renderComment(comment) {
  const issueRef = `${comment.repo}#${comment.issueNumber}`;
  const isActive = state.activeFilter === issueRef;
  const company = state.getUserCompany(comment.user.login);

  return `
        <div class="comment${comment.isOriginalPost ? ' original-post' : ''}">
            <div class="comment-header">
                <span class="comment-author">${comment.user.login}${
    company ? ` (${company})` : ''
  }</span>
                <span class="comment-date">${new Date(
                  comment.created_at
                ).toLocaleDateString()}</span>
                <button class="issue-reference${
                  isActive ? ' active' : ''
                }" data-issue="${issueRef}">
                    ${issueRef}
                </button>
                ${
                  comment.isOriginalPost
                    ? `<span class="original-post-badge">Original Post: ${comment.issueTitle}</span>`
                    : ''
                }
            </div>
            <div class="comment-body">${marked.parse(comment.body || '')}</div>
        </div>
    `;
}

export function renderIssueTable() {
  const tableBody = document.getElementById('issueTableBody');
  tableBody.innerHTML = Array.from(state.trackedIssues)
    .map((issue) => {
      const [repo, number] = issue.split('#');
      return `
                <tr>
                    <td>${repo}</td>
                    <td>${number}</td>
                    <td>
                        <button class="remove-issue" data-issue="${issue}">Remove</button>
                    </td>
                </tr>
            `;
    })
    .join('');
}

export function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  const filteredComments = state.getFilteredComments();

  container.innerHTML = `
        <div class="comments-section">
            ${filteredComments
              .map((comment) => renderComment(comment))
              .join('')}
        </div>
    `;
}
