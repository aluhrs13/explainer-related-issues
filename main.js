const userCompanyMap = new Map();
let allIssueComments = [];
let activeFilter = null;

async function getUserCompany(username) {
  if (userCompanyMap.has(username)) {
    return userCompanyMap.get(username);
  }

  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
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
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const comments = await response.json();
    allComments = allComments.concat(comments);

    // Parse Link header to get next page URL
    const linkHeader = response.headers.get('Link');
    nextUrl = null;

    if (linkHeader) {
      const links = linkHeader.split(',');
      for (const link of links) {
        const [url, rel] = link.split(';');
        if (rel.includes('rel="next"')) {
          nextUrl = url.trim().slice(1, -1); // Remove < and >
          pageCount++;
          break;
        }
      }
    }
  }

  return allComments;
}

document.getElementById('issueForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const repo = document.getElementById('repo').value;
  const issueNumber = document.getElementById('issueNumber').value;

  // Show loading state
  const issueContainers = document.getElementById('issueContainers');
  const loadingIndicator = document.createElement('div');
  loadingIndicator.className = 'loading-indicator';
  loadingIndicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>Loading comments...</span>
    `;
  issueContainers.appendChild(loadingIndicator);

  const updateProgress = (message) => {
    const progressElement = loadingIndicator.querySelector('span');
    if (progressElement) {
      progressElement.textContent = message;
    }
  };

  try {
    // Fetch both issue details and all comments in parallel
    const [issue, comments] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/issues/${issueNumber}`).then(
        (response) => {
          if (!response.ok)
            throw new Error(`HTTP error! status: ${response.status}`);
          return response.json();
        }
      ),
      getAllComments(repo, issueNumber, updateProgress),
    ]);

    // Add issue metadata to each comment
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

    // Add new comments to the array
    allIssueComments = [...allIssueComments, ...commentsWithMeta];

    // Sort all comments by date
    allIssueComments.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );

    // Fetch company information for all unique users
    const uniqueUsers = new Set(
      allIssueComments.map((comment) => comment.user.login)
    );
    await Promise.all(
      [...uniqueUsers].map((username) => getUserCompany(username))
    );

    // Remove loading indicator
    loadingIndicator.remove();

    // Display all comments
    updateCommentsContent();
  } catch (error) {
    loadingIndicator.innerHTML = `<p>Error: ${error.message}</p>`;
  }
});

function addCommentEventListeners() {
    const container = document.getElementById('issueContainers');
    
    container.querySelectorAll('.issue-reference').forEach(button => {
        button.addEventListener('click', (e) => {
            const issueRef = e.target.dataset.issue;
            
            if (activeFilter === issueRef) {
                activeFilter = null;
            } else {
                activeFilter = issueRef;
            }

            updateCommentsContent();
        });
    });
}

function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  
  const commentsHTML = allIssueComments
    .filter(comment => !activeFilter || `${comment.repo}#${comment.issueNumber}` === activeFilter)
    .map(comment => {
      const issueRef = `${comment.repo}#${comment.issueNumber}`;
      const isActive = activeFilter === issueRef;
      return `
        <div class="comment${comment.isOriginalPost ? ' original-post' : ''}">
          <div class="comment-header">
            <span class="comment-author">${comment.user.login}${
              userCompanyMap.get(comment.user.login)
                ? ` (${userCompanyMap.get(comment.user.login)})`
                : ''
            }</span>
            <span class="comment-date">${new Date(comment.created_at).toLocaleDateString()}</span>
            <button class="issue-reference${isActive ? ' active' : ''}" data-issue="${issueRef}">
              ${issueRef}
            </button>
            ${comment.isOriginalPost
              ? `<span class="original-post-badge">Original Post: ${comment.issueTitle}</span>`
              : ''}
          </div>
          <div class="comment-body">${marked.parse(comment.body || '')}</div>
        </div>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="comments-section">
      ${commentsHTML}
    </div>
  `;
  
  // Add event listeners after content update
  addCommentEventListeners();
}
