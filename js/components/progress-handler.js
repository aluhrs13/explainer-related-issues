import { LitElement, html, css } from 'lit';

export class ProgressHandler extends LitElement {
  static properties = {
    issueRef: { type: String },
    message: { type: String },
    isError: { type: Boolean },
    isEmpty: { type: Boolean },
  };

  static styles = css`
    :host {
      display: block;
    }
    .error {
      color: #cb2431;
    }
    .empty {
      color: #586069;
      font-style: italic;
    }
    p {
      margin: 1rem 0;
    }
  `;

  constructor() {
    super();
    this.issueRef = '';
    this.message = '';
    this.isError = false;
    this.isEmpty = false;
  }

  render() {
    if (this.isEmpty) {
      return html`<p class="empty">
        No issues being tracked. Add an issue to see comments.
      </p>`;
    }

    if (this.isError) {
      return html`<p class="error">Error: ${this.message}</p>`;
    }

    if (this.issueRef && this.message) {
      return html`<p>${this.issueRef}: ${this.message}</p>`;
    }

    return html``;
  }

  update(issueRef, message) {
    this.issueRef = issueRef;
    this.message = message;
    this.isError = false;
    this.isEmpty = false;
  }

  setError(message) {
    this.message = message;
    this.isError = true;
    this.isEmpty = false;
    this.issueRef = '';
  }

  setEmpty() {
    this.isEmpty = true;
    this.isError = false;
    this.message = '';
    this.issueRef = '';
  }
}

customElements.define('progress-handler', ProgressHandler);
