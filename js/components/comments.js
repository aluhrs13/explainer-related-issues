import { LitElement, html, css } from 'lit';
import { state } from '../state.js';

export class CommentsSection extends LitElement {
  static properties = {
    comments: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
    }
    .comments-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .no-comments {
      color: #586069;
      font-style: italic;
      padding: 1rem;
      text-align: center;
    }
  `;

  constructor() {
    super();
    this.comments = [];
  }

  render() {
    return html`
      <div class="comments-section">
        ${this.comments.length === 0
          ? html`<div class="no-comments">No comments found</div>`
          : html`<comment-list
              .comments=${this.comments}
              .userCompanies=${Object.fromEntries(state.userCompanyMap)}
              @filter-comments=${this._handleFilterComments}
            ></comment-list>`}
      </div>
    `;
  }

  _handleFilterComments(e) {
    const detail = e.detail;
    this.dispatchEvent(
      new CustomEvent('filter-comments', {
        detail,
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('comments-section', CommentsSection);

// For backward compatibility with existing code
export function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  if (!container) return;

  if (!container.querySelector('comments-section')) {
    const commentsSection = document.createElement('comments-section');
    container.appendChild(commentsSection);
  }

  const section = container.querySelector('comments-section');
  section.comments = state.allIssueComments;
}
