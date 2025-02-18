import { LitElement, html, css } from 'lit';
import { state } from '../state.js';
import './comment-item.js';

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
          : this.comments.map(
              (comment) => html`
                <comment-item
                  .comment=${comment}
                  .userCompany=${Object.fromEntries(state.userCompanyMap)[
                    comment.user.login
                  ] || ''}
                  @comment-selected=${this._handleFilterComments}
                ></comment-item>
              `
            )}
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
