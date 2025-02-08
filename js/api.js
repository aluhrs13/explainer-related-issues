export async function getUserCompany(username) {
  try {
    const response = await fetch(`https://api.github.com/users/${username}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const userData = await response.json();
    return userData.company || '';
  } catch (error) {
    console.error(`Error fetching company for ${username}:`, error);
    return '';
  }
}

export async function getAllComments(repo, issueNumber, updateProgress) {
  let allComments = [];
  let nextUrl = `https://api.github.com/repos/${repo}/issues/${issueNumber}/comments?per_page=100`;
  let pageCount = 1;

  while (nextUrl) {
    updateProgress?.(`Loading page ${pageCount}...`);
    const response = await fetch(nextUrl);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const comments = await response.json();
    allComments = allComments.concat(comments);

    nextUrl = getNextPageUrl(response.headers.get('Link'));
    if (nextUrl) pageCount++;
  }

  return allComments;
}

export async function getIssue(repo, issueNumber) {
  const response = await fetch(
    `https://api.github.com/repos/${repo}/issues/${issueNumber}`
  );
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return response.json();
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
