export function createLoadingIndicator(message) {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>${message}</span>
    `;
  return indicator;
}
