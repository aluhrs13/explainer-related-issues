import { LitElement, html, css } from 'lit';

export class LoadingIndicator extends LitElement {
  static properties = {
    message: { type: String },
  };

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #586069;
      padding: 2rem;
    }
    .loading-spinner {
      width: 20px;
      height: 20px;
      border: 2px solid #e1e4e8;
      border-top-color: #0366d6;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  constructor() {
    super();
    this.message = '';
  }

  render() {
    return html`
      <div class="loading-spinner"></div>
      <span>${this.message}</span>
    `;
  }
}

customElements.define('loading-indicator', LoadingIndicator);

// For backward compatibility with existing code
export function createLoadingIndicator(message) {
  const indicator = document.createElement('loading-indicator');
  indicator.message = message;
  return indicator;
}
