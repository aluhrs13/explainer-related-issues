/**
 * @typedef {Object} Comment
 * @property {string} body
 * @property {string} created_at
 * @property {string} repo
 * @property {number} issueNumber
 */

export class Comment {
  constructor({
    id,
    body,
    created_at,
    user,
    repo,
    issueNumber,
    issueTitle,
    isOriginalPost = false,
  }) {
    this.id = id;
    this.body = body || '';
    this.created_at = created_at;
    this.user = user;
    this.repo = repo;
    this.issueNumber = issueNumber;
    this.issueTitle = issueTitle;
    this.isOriginalPost = isOriginalPost;
    this.isFiltered = false;
    this.isQuoteRelated = false;
  }

  get issueRef() {
    return `${this.repo}#${this.issueNumber}`;
  }

  toHTML(isActive, company) {
    try {
      const header = this.createHeader(isActive, company);
      const body = `<div class="comment-body">${this.parseMarkdown()}</div>`;
      const classes = [
        'comment',
        this.isOriginalPost ? 'original-post' : '',
        this.isFiltered ? 'filtered' : '',
        this.isQuoteRelated ? 'quote-related' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return `
        <div class="${classes}" data-comment-id="${this.id}">
          ${header}
          ${body}
        </div>`;
    } catch (error) {
      return `<div class="comment error">Error rendering comment: ${error.message}</div>`;
    }
  }

  createHeader(isActive, company) {
    const authorInfo = `${this.user.login}${company ? ` (${company})` : ''}`;
    const date = new Date(this.created_at).toLocaleDateString();
    const issueButton = `<button class="issue-reference${
      isActive ? ' active' : ''
    }" data-issue="${this.issueRef}">${this.issueRef}</button>`;
    const originalPostBadge = this.isOriginalPost
      ? `<span class="original-post-badge">Original Post: ${this.issueTitle}</span>`
      : '';

    return `
      <div class="comment-header">
        <span class="comment-author">${authorInfo}</span>
        <span class="comment-date">${date}</span>
        ${issueButton}
        ${originalPostBadge}
      </div>`;
  }

  parseMarkdown() {
    return window.marked ? window.marked.parse(this.body) : this.body;
  }

  setFiltered(filtered) {
    this.isFiltered = filtered;
    return this;
  }

  setQuoteRelated(related) {
    this.isQuoteRelated = related;
    return this;
  }

  hasQuote(text) {
    return this.body.includes(text);
  }

  containsQuoteFrom(otherComment) {
    // Split by blockquotes and check if any quote matches
    const quotes = this.body.match(/>(.*?)(\n\n|$)/gs) || [];
    return quotes.some((quote) =>
      otherComment.body.includes(quote.replace(/^>\s*/gm, '').trim())
    );
  }
}

export class StateManager {
  constructor() {
    this.userCompanyMap = new Map();
    this.allIssueComments = [];
    this.activeFilter = null;
    this.trackedIssues = new Set();
    this.subscribers = new Set();
    this.loadSavedState().catch((err) =>
      console.error('Failed to load initial state:', err)
    );
  }

  // Storage related methods
  /**
   * @private
   * @returns {boolean}
   */
  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      console.warn('LocalStorage is not available:', e);
      return false;
    }
  }

  /**
   * @returns {Promise<void>}
   */
  async loadSavedState() {
    if (!this.isStorageAvailable()) return;

    try {
      const savedIssues = localStorage.getItem('trackedIssues');
      if (savedIssues) {
        this.trackedIssues = new Set(JSON.parse(savedIssues));
        this.notifySubscribers();
      }
    } catch (error) {
      console.warn('Failed to load saved state:', error);
      throw error;
    }
  }

  /**
   * @private
   */
  saveState() {
    if (!this.isStorageAvailable()) return;

    try {
      localStorage.setItem(
        'trackedIssues',
        JSON.stringify([...this.trackedIssues])
      );
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    }
  }

  // User company related methods
  /**
   * @param {string} username
   * @param {string} company
   */
  setUserCompany(username, company) {
    this.userCompanyMap.set(username, company);
    this.notifySubscribers();
  }

  /**
   * @param {string} username
   * @returns {string}
   */
  getUserCompany(username) {
    return this.userCompanyMap.get(username) || '';
  }

  // Comments related methods
  /**
   * @param {Comment[]} comments
   */
  setComments(comments) {
    console.log('Setting comments:', comments);
    this.allIssueComments = comments.map((c) => new Comment(c));
    console.log('State after setComments:', this.allIssueComments);
    this.notifySubscribers();
  }

  /**
   * @param {Comment[]} comments
   */
  addComments(comments) {
    console.log('Adding comments:', comments);
    const processedComments = comments.map((c) => new Comment(c));
    this.allIssueComments = [...this.allIssueComments, ...processedComments];
    this.sortCommentsByDate();
    console.log('State after addComments:', this.allIssueComments);
    this.notifySubscribers();
  }

  /**
   * @private
   * @param {Comment} comment
   * @returns {Comment}
   */
  normalizeComment(comment) {
    return {
      ...comment,
      body: comment.body || '',
    };
  }

  /**
   * @private
   */
  sortCommentsByDate() {
    this.allIssueComments.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
  }

  // Filter related methods
  /**
   * @param {string|null} filter
   */
  setActiveFilter(filter) {
    this.activeFilter = filter;
    this.notifySubscribers();
  }

  /**
   * @returns {Comment[]}
   */
  getFilteredComments() {
    return this.allIssueComments.filter((comment) => !comment.isFiltered);
  }

  // Issue tracking methods
  /**
   * @param {string} issueRef
   * @returns {boolean}
   */
  addTrackedIssue(issueRef) {
    if (this.trackedIssues.has(issueRef)) return false;
    this.trackedIssues.add(issueRef);
    this.saveState();
    this.notifySubscribers();
    return true;
  }

  /**
   * @param {string} issueRef
   * @returns {boolean}
   */
  removeTrackedIssue(issueRef) {
    if (!this.trackedIssues.has(issueRef)) return false;
    this.trackedIssues.delete(issueRef);
    if (this.activeFilter === issueRef) {
      this.activeFilter = null;
    }
    this.saveState();
    this.notifySubscribers();
    return true;
  }

  // Subscriber related methods
  /**
   * @param {function(StateManager): void} callback
   * @returns {function(): void}
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * @private
   */
  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this));
  }
}

export const state = new StateManager();
