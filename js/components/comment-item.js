import { LitElement, html, css } from 'lit';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

export class CommentItem extends LitElement {
  static properties = {
    comment: { type: Object },
    userCompany: { type: String },
    selected: { type: Boolean, reflect: true },
  };

  static styles = css`
    :host {
      display: block;
    }
    .comment {
      border: 1px solid #e1e4e8;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .comment:hover {
      border-color: #0366d6;
      box-shadow: 0 0 0 1px #0366d6;
    }
    .comment.selected {
      border-color: #0366d6;
      box-shadow: 0 0 0 2px #0366d6, 0 4px 8px rgba(3, 102, 214, 0.2);
      background-color: #f6f8fa;
    }
    .comment.original-post {
      background-color: #f1f8ff;
      border-left: 4px solid #0366d6;
    }
    .comment-header {
      display: flex;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .comment-author {
      font-weight: bold;
      margin-right: 0.5rem;
    }
    .comment-date {
      color: #586069;
    }
    .issue-reference {
      background-color: #f6f8fa;
      padding: 0.25rem 0.5rem;
      border-radius: 2rem;
      font-size: 0.875rem;
      color: #586069;
      margin-left: 0.5rem;
      border: 1px solid transparent;
      cursor: pointer;
    }
    .original-post-badge {
      background-color: #0366d6;
      color: white;
      padding: 0.25rem 0.5rem;
      border-radius: 2rem;
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    .comment-footer {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e1e4e8;
      font-size: 12px;
      color: #586069;
    }
    .references {
      display: inline-block;
      padding: 2px 5px;
      background: #f1f8ff;
      border-radius: 3px;
    }
    .reference-item {
      margin: 4px 0;
      padding: 4px 8px;
      background: #f6f8fa;
      border-left: 3px solid #0366d6;
      border-radius: 2px;
      font-family: monospace;
    }
  `;

  constructor() {
    super();
    this.comment = null;
    this.userCompany = '';
    this.selected = false;
  }

  render() {
    if (!this.comment) return html``;

    const commentClasses = {
      comment: true,
      selected: this.selected,
      'original-post': this.comment.isOriginalPost,
    };

    return html`
      <div
        class="${Object.entries(commentClasses)
          .filter(([, v]) => v)
          .map(([k]) => k)
          .join(' ')}"
        @click=${this._handleClick}
      >
        ${this._renderHeader()} ${this._renderBody()} ${this._renderFooter()}
      </div>
    `;
  }

  _renderHeader() {
    const date = new Date(this.comment.created_at).toLocaleDateString();
    const authorInfo = this.userCompany
      ? `${this.comment.user.login} (${this.userCompany})`
      : this.comment.user.login;

    return html`
      <div class="comment-header">
        <span class="comment-author">${authorInfo}</span>
        <span class="comment-date">${date}</span>
        <button class="issue-reference">${this.comment.issueRef}</button>
        ${this.comment.isOriginalPost
          ? html`<span class="original-post-badge"
              >Original Post: ${this.comment.issueTitle}</span
            >`
          : ''}
      </div>
    `;
  }

  _renderBody() {
    return html`
      <div class="comment-body">${this._renderMarkdown(this.comment.body)}</div>
    `;
  }

  _renderFooter() {
    if (!this.comment.references?.size) return '';

    return html`
      <div class="comment-footer">
        <div class="references">
          <div>References:</div>
          ${[...this.comment.references].map((refId) => {
            const referencedComment = this.comment.allIssueComments?.find(
              (c) => c.id === refId
            );
            const snippet = referencedComment
              ? referencedComment.body.slice(0, 50) +
                (referencedComment.body.length > 50 ? '...' : '')
              : 'unknown comment';
            return html`
              <div
                class="reference-item"
                @click=${(e) => this._handleReferenceClick(e, refId)}
              >
                ID: ${refId} - ${snippet}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  _renderMarkdown(text) {
    const parsed = marked(text);
    return html`${unsafeHTML(DOMPurify.sanitize(parsed))}`;
  }

  _handleClick(e) {
    const referenceClick = e.target.closest('.reference-item');
    if (!referenceClick) {
      this.dispatchEvent(
        new CustomEvent('comment-selected', {
          detail: {
            commentId: this.comment.id,
            clear: this.selected,
          },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  _handleReferenceClick(e, refId) {
    e.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('comment-selected', {
        detail: {
          commentId: refId,
          clear: false,
        },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('comment-item', CommentItem);
