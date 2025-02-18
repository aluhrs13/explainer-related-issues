import { LitElement, html, css } from 'lit';
import { state } from '../state.js';
import './comment-item.js';

export class CommentsSection extends LitElement {
  static properties = {
    comments: { type: Array },
    selectedCommentId: { type: String, state: true },
    previousCommentId: { type: String, state: true },
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
    this.selectedCommentId = null;
    this.previousCommentId = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('comment-selected', this._handleCommentSelection);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('comment-selected', this._handleCommentSelection);
  }

  _handleCommentSelection(e) {
    const { commentId, clear } = e.detail;
    if (clear) {
      this.previousCommentId = this.selectedCommentId;
      this.selectedCommentId = null;
      console.log(
        'Selected comment cleared, previous comment is',
        this.previousCommentId
      );
    } else {
      this.previousCommentId = null;
      this.selectedCommentId = commentId;
      console.log(
        'Selected comment is',
        this.selectedCommentId,
        'previous comment is',
        this.previousComment
      );
    }
  }

  _getRelatedComments(selectedComment) {
    if (!selectedComment && !this.previousCommentId) return this.comments;

    const relatedIds = new Set();

    // Add selected comment and its references
    if (selectedComment) {
      relatedIds.add(selectedComment.id);
      selectedComment.references?.forEach((id) => relatedIds.add(id));
    }

    // Add previous comment and its references
    if (this.previousCommentId) {
      const previousComment = this.comments.find(
        (c) => c.id === this.previousCommentId
      );
      if (previousComment) {
        relatedIds.add(previousComment.id);
        previousComment.references?.forEach((id) => relatedIds.add(id));
      }
    }

    // Include comments that reference either the selected or previous comment
    this.comments.forEach((comment) => {
      if (
        (selectedComment && comment.references?.has(selectedComment.id)) ||
        (this.previousCommentId &&
          comment.references?.has(this.previousCommentId))
      ) {
        relatedIds.add(comment.id);
      }
    });

    return this.comments.filter((comment) => relatedIds.has(comment.id));
  }

  updated(changedProperties) {
    super.updated(changedProperties);
    if (
      changedProperties.has('selectedCommentId') ||
      changedProperties.has('previousCommentId')
    ) {
      if (this.previousCommentId) {
        requestAnimationFrame(() => {
          const commentElement = this.shadowRoot.getElementById(
            this.previousCommentId
          );
          if (commentElement) {
            commentElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
            });
          }
        });
      }
    }
  }

  render() {
    const visibleComments = this.selectedCommentId
      ? this._getRelatedComments(
          this.comments.find((c) => c.id === this.selectedCommentId)
        )
      : this.comments;

    return html`
      <div class="comments-section">
        ${visibleComments.length === 0
          ? html`<div class="no-comments">No comments found</div>`
          : visibleComments.map(
              (comment) => html`
                <comment-item
                  id=${comment.id}
                  .comment=${comment}
                  .userCompany=${Object.fromEntries(state.userCompanyMap)[
                    comment.user.login
                  ] || ''}
                  .selected=${comment.id === this.selectedCommentId}
                ></comment-item>
              `
            )}
      </div>
    `;
  }
}

customElements.define('comments-section', CommentsSection);
