import { Comment } from './models/comment.js';

/**
 * @typedef {Object} IStateManager
 * @property {Map<string, string>} userCompanyMap
 * @property {Comment[]} allIssueComments
 * @property {string | null} activeFilter
 * @property {Set<string>} trackedIssues
 * @property {Set<Function>} subscribers
 */

export class StateManager {
  /** @type {Map<string, string>} */ userCompanyMap;
  /** @type {Comment[]} */ allIssueComments;
  /** @type {string | null} */ activeFilter;
  /** @type {Set<string>} */ trackedIssues;
  /** @type {Set<Function>} */ subscribers;

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

  /**
   * @param {CommentData[]} comments
   */
  setComments(comments) {
    this.allIssueComments = comments.map((c) => new Comment(c));
    this.allIssueComments.forEach((comment) =>
      comment.findReferences(this.allIssueComments)
    );
    this.notifySubscribers();
  }

  /**
   * @param {CommentData[]} comments
   */
  addComments(comments) {
    const processedComments = comments.map((c) => new Comment(c));
    this.allIssueComments = [...this.allIssueComments, ...processedComments];
    this.sortCommentsByDate();
    this.allIssueComments.forEach((comment) =>
      comment.findReferences(this.allIssueComments)
    );
    this.notifySubscribers();
  }

  /**
   * @private
   * @returns {void}
   */
  sortCommentsByDate() {
    this.allIssueComments.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }

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
