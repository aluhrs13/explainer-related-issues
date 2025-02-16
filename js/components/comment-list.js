import { LitElement, html, css } from 'lit';
import './comment-item.js';

export class CommentList extends LitElement {
  static properties = {
    comments: { type: Array },
    userCompanies: { type: Object },
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
  `;

  constructor() {
    super();
    this.comments = [];
    this.userCompanies = {};
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
                  .userCompany=${this.userCompanies[comment.user.login] || ''}
                  @comment-selected=${this._handleCommentSelected}
                ></comment-item>
              `
            )}
      </div>
    `;
  }

  _handleCommentSelected(e) {
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

customElements.define('comment-list', CommentList);
