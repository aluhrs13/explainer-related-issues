export class StateManager {
  constructor() {
    this.userCompanyMap = new Map();
    this.allIssueComments = [];
    this.activeFilter = null;
    this.trackedIssues = new Set();
    this.subscribers = new Set();
  }

  isStorageAvailable() {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch (e) {
      return false;
    }
  }

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
    }
  }

  saveState() {
    if (!this.isStorageAvailable()) return;

    try {
      localStorage.setItem(
        'trackedIssues',
        JSON.stringify([...this.trackedIssues])
      );
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }

  setUserCompany(username, company) {
    this.userCompanyMap.set(username, company);
    this.notifySubscribers();
  }

  getUserCompany(username) {
    return this.userCompanyMap.get(username) || '';
  }

  setComments(comments) {
    this.allIssueComments = comments;
    this.notifySubscribers();
  }

  addComments(comments) {
    this.allIssueComments = [...this.allIssueComments, ...comments];
    this.allIssueComments.sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at)
    );
    this.notifySubscribers();
  }

  setActiveFilter(filter) {
    this.activeFilter = filter;
    this.notifySubscribers();
  }

  addTrackedIssue(issueRef) {
    if (this.trackedIssues.has(issueRef)) return false;
    this.trackedIssues.add(issueRef);
    this.saveState();
    this.notifySubscribers();
    return true;
  }

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

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this));
  }

  getFilteredComments() {
    return this.allIssueComments.filter(
      (comment) =>
        !this.activeFilter ||
        `${comment.repo}#${comment.issueNumber}` === this.activeFilter
    );
  }
}

export const state = new StateManager();
