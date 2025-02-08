// State management
const userCompanyMap = new Map();
let allIssueComments = [];
let activeFilter = null;
let trackedIssues = new Set();

// API functions
async function getUserCompany(username) {
  if (userCompanyMap.has(username)) return userCompanyMap.get(username);

  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const userData = await response.json();
    const company = userData.company || '';
    userCompanyMap.set(username, company);
    return company;
  } catch (error) {
    console.error(`Error fetching company for ${username}:`, error);
    return '';
  }
}

async function getAllComments(repo, issueNumber, updateProgress) {
  let allComments = [];
  let nextUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`;
  let pageCount = 1;

  while (nextUrl) {
    updateProgress(`Loading page ${pageCount}...`);
    const response = await fetch(nextUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const comments = await response.json();
    allComments = allComments.concat(comments);

    nextUrl = getNextPageUrl(response.headers.get('Link'));
    if (nextUrl) pageCount++;
  }

  return allComments;
}

function getNextPageUrl(linkHeader) {
  if (!linkHeader) return null;

  const links = linkHeader.split(',');
  for (const link of links) {
    const [url, rel] = link.split(';');
    if (rel.includes('rel="next"')) {
      return url.trim().slice(1, -1);
    }
  }
  return null;
}

// UI Functions
function createLoadingIndicator(message) {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>${message}</span>
    `;
  return indicator;
}

function renderComment(comment) {
  const issueRef = `${comment.repo}#${comment.issueNumber}`;
  const isActive = activeFilter === issueRef;
  const company = userCompanyMap.get(comment.user.login);

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

function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  const filteredComments = allIssueComments.filter(
    (comment) =>
      !activeFilter || `${comment.repo}#${comment.issueNumber}` === activeFilter
  );

  container.innerHTML = `
        <div class="comments-section">
            ${filteredComments.map(renderComment).join('')}
        </div>
    `;

  addCommentEventListeners();
}

function addCommentEventListeners() {
  const container = document.getElementById('issueContainers');

  container.querySelectorAll('.issue-reference').forEach((button) => {
    button.addEventListener('click', (e) => {
      const issueRef = e.target.dataset.issue;
      activeFilter = activeFilter === issueRef ? null : issueRef;
      updateCommentsContent();
    });
  });
}

function updateIssueTable() {
  const tableBody = document.getElementById('issueTableBody');
  tableBody.innerHTML = Array.from(trackedIssues)
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

  // Add event listeners for remove buttons
  tableBody.querySelectorAll('.remove-issue').forEach((button) => {
    button.addEventListener('click', (e) => {
      const issueRef = e.target.dataset.issue;
      trackedIssues.delete(issueRef);
      allIssueComments = allIssueComments.filter(
        (comment) => `${comment.repo}#${comment.issueNumber}` !== issueRef
      );
      if (activeFilter === issueRef) {
        activeFilter = null;
      }
      updateIssueTable();
      updateCommentsContent();
    });
  });
}

// Event Handlers
document
  .getElementById('addIssueButton')
  .addEventListener('click', async () => {
    const repo = document.getElementById('repo').value;
    const issueNumber = document.getElementById('issueNumber').value;
    const issueRef = `${repo}#${issueNumber}`;

    if (!repo || !issueNumber) {
      alert('Please fill in both repository and issue number');
      return;
    }

    if (trackedIssues.has(issueRef)) {
      alert('This issue is already being tracked');
      return;
    }

    const issueContainers = document.getElementById('issueContainers');
    const loadingIndicator = createLoadingIndicator('Loading comments...');
    issueContainers.appendChild(loadingIndicator);

    const updateProgress = (message) => {
      const progressElement = loadingIndicator.querySelector('span');
      if (progressElement) progressElement.textContent = message;
    };

    try {
      const [issue, comments] = await Promise.all([
        fetch(
          `https://api.github.com/repos/${repo}/issues/${issueNumber}`
        ).then((response) => {
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        }),
        getAllComments(repo, issueNumber, updateProgress),
      ]);

      const commentsWithMeta = [
        {
          user: issue.user,
          created_at: issue.created_at,
          body: issue.body,
          isOriginalPost: true,
          issueNumber,
          issueTitle: issue.title,
          repo,
        },
        ...comments.map((comment) => ({
          ...comment,
          issueNumber,
          issueTitle: issue.title,
          repo,
        })),
      ];

      allIssueComments = [...allIssueComments, ...commentsWithMeta];
      allIssueComments.sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );

      const uniqueUsers = new Set(
        allIssueComments.map((comment) => comment.user.login)
      );
      await Promise.all([...uniqueUsers].map(getUserCompany));

      trackedIssues.add(issueRef);
      updateIssueTable();
      loadingIndicator.remove();
      updateCommentsContent();

      // Clear form inputs
      document.getElementById('repo').value = '';
    } catch (error) {
      loadingIndicator.innerHTML = `<p>Error: ${error.message}</p>`;
    }
  });
