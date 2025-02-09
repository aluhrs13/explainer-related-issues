/**
 * @typedef {Object} Comment
 * @property {string} body
 * @property {string} created_at
 * @property {string} repo
 * @property {number} issueNumber
 */

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
    this.allIssueComments = comments.map(this.normalizeComment);
    console.log('State after setComments:', this.allIssueComments);
    this.notifySubscribers();
  }

  /**
   * @param {Comment[]} comments
   */
  addComments(comments) {
    console.log('Adding comments:', comments);
    const processedComments = comments.map(this.normalizeComment);
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
    return this.allIssueComments.filter(
      (comment) =>
        !this.activeFilter ||
        `${comment.repo}#${comment.issueNumber}` === this.activeFilter
    );
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
