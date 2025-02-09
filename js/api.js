// GitHub API constants
const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_TIMEOUT = 10000;
const PER_PAGE = 100;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Custom error class for API related errors
 */
class GitHubAPIError extends Error {
  constructor(message, status, retryable = false) {
    super(message);
    this.name = 'GitHubAPIError';
    this.status = status;
    this.retryable = retryable;
  }
}

/**
 * Sleep utility function
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check and handle rate limit
 * @param {Response} response - Fetch response
 * @throws {GitHubAPIError} When rate limit is exceeded
 */
function checkRateLimit(response) {
  const remaining = response.headers.get('X-RateLimit-Remaining');
  const resetTime = response.headers.get('X-RateLimit-Reset');

  if (remaining && parseInt(remaining) === 0) {
    const resetDate = new Date(parseInt(resetTime) * 1000);
    const waitTime = Math.ceil((resetDate - new Date()) / 1000);
    throw new GitHubAPIError(
      `GitHub API rate limit exceeded. Resets in ${waitTime} seconds`,
      429,
      true
    );
  }
}

/**
 * Wrapper for fetch with timeout, retries and error handling
 * @param {string} url - The URL to fetch
 * @param {Object} options - Fetch options
 * @param {number} [retryCount=0] - Current retry attempt
 * @returns {Promise<Response>}
 */
async function fetchWithTimeout(url, options = {}, retryCount = 0) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    checkRateLimit(response);

    if (!response.ok) {
      const retryable = [408, 429, 500, 502, 503, 504].includes(
        response.status
      );
      throw new GitHubAPIError(
        `HTTP error! status: ${response.status}`,
        response.status,
        retryable
      );
    }

    return response;
  } catch (error) {
    if (error.retryable && retryCount < MAX_RETRIES) {
      await sleep(RETRY_DELAY * Math.pow(2, retryCount));
      return fetchWithTimeout(url, options, retryCount + 1);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Get user's company information from GitHub
 * @param {string} username - GitHub username
 * @returns {Promise<string>} Company name or empty string
 */
export async function getUserCompany(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Invalid username provided');
  }

  try {
    const response = await fetchWithTimeout(
      `${GITHUB_API_BASE}/users/${username}`
    );
    const userData = await response.json();
    return userData.company || '';
  } catch (error) {
    console.error(`Error fetching company for ${username}:`, error);
    return '';
  }
}

/**
 * Get all comments for an issue with progress tracking
 * @param {string} repo - Repository name (format: owner/repo)
 * @param {number} issueNumber - Issue number
 * @param {Function} [updateProgress] - Optional callback for progress updates
 * @returns {Promise<Array>} Array of comments
 */
export async function getAllComments(repo, issueNumber, updateProgress) {
  if (!repo || !repo.includes('/')) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }
  if (!issueNumber || isNaN(issueNumber)) {
    throw new Error('Invalid issue number');
  }
  if (updateProgress && typeof updateProgress !== 'function') {
    throw new Error('updateProgress must be a function');
  }

  let allComments = [];
  let nextUrl = `${GITHUB_API_BASE}/repos/${repo}/issues/${issueNumber}/comments?per_page=${PER_PAGE}`;
  let pageCount = 1;

  try {
    while (nextUrl) {
      updateProgress?.(`Loading page ${pageCount}...`);
      const response = await fetchWithTimeout(nextUrl);
      const comments = await response.json();
      allComments = allComments.concat(comments);

      nextUrl = getNextPageUrl(response.headers.get('Link'));
      if (nextUrl) pageCount++;
    }

    return allComments;
  } catch (error) {
    console.error(`Error fetching comments for ${repo}#${issueNumber}:`, error);
    throw error;
  }
}

/**
 * Get issue details
 * @param {string} repo - Repository name (format: owner/repo)
 * @param {number} issueNumber - Issue number
 * @returns {Promise<Object>} Issue details
 */
export async function getIssue(repo, issueNumber) {
  if (!repo || !repo.includes('/')) {
    throw new Error('Invalid repository format. Expected: owner/repo');
  }
  if (!issueNumber || isNaN(issueNumber)) {
    throw new Error('Invalid issue number');
  }

  const response = await fetchWithTimeout(
    `${GITHUB_API_BASE}/repos/${repo}/issues/${issueNumber}`
  );
  return response.json();
}

/**
 * Extract next page URL from Link header
 * @param {string|null} linkHeader - Link header from GitHub API
 * @returns {string|null} URL of the next page or null
 */
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
