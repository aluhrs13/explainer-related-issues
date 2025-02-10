/**
 * Handles progress updates and loading states in the UI
 */
export class ProgressHandler {
  /**
   * @param {HTMLElement} loadingIndicator - The DOM element to show loading state
   */
  constructor(loadingIndicator) {
    this.loadingIndicator = loadingIndicator;
  }

  /**
   * Updates the progress message for a specific issue
   * @param {string} issueRef - The issue reference (repo#number)
   * @param {string} message - The progress message to display
   */
  update(issueRef, message) {
    const progressElement = this.loadingIndicator.querySelector('span');
    if (progressElement) {
      progressElement.textContent = `${issueRef}: ${message}`;
    }
  }

  /**
   * Shows an error message
   * @param {string} message - The error message to display
   */
  setError(message) {
    this.loadingIndicator.innerHTML = `<p>Error: ${message}</p>`;
  }

  /**
   * Shows an empty state message
   */
  setEmpty() {
    this.loadingIndicator.innerHTML =
      '<p>No issues being tracked. Add an issue to see comments.</p>';
  }

  /**
   * Removes the loading indicator from the DOM
   */
  remove() {
    this.loadingIndicator.remove();
  }
}
