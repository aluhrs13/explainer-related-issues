/**
 * @typedef {Object} CommentData
 * @property {string} id
 * @property {string} body
 * @property {string} created_at
 * @property {Object} user
 * @property {string} user.login
 * @property {string} repo
 * @property {number} issueNumber
 * @property {string} issueTitle
 * @property {boolean} [isOriginalPost]
 */

/**
 * @typedef {Object} IComment
 * @property {string} id
 * @property {string} body
 * @property {string} created_at
 * @property {Object} user
 * @property {string} issueRef
 * @property {boolean} isFiltered
 * @property {boolean} isQuoteRelated
 * @property {Set<string>} references
 */

export class Comment {
  /** @type {string} */ id;
  /** @type {string} */ body;
  /** @type {string} */ created_at;
  /** @type {Object} */ user;
  /** @type {string} */ repo;
  /** @type {number} */ issueNumber;
  /** @type {string} */ issueTitle;
  /** @type {boolean} */ isOriginalPost;
  /** @type {boolean} */ isFiltered;
  /** @type {boolean} */ isQuoteRelated;
  /** @type {Set<string>} */ references;
  /** @type {Comment[] | null} */ allIssueComments;

  /**
   * @param {CommentData} data
   */
  constructor({
    id,
    body,
    created_at,
    user,
    repo,
    issueNumber,
    issueTitle,
    isOriginalPost = false,
  }) {
    this.id = id;
    this.body = body || '';
    this.created_at = created_at;
    this.user = user;
    this.repo = repo;
    this.issueNumber = issueNumber;
    this.issueTitle = issueTitle;
    this.isOriginalPost = isOriginalPost;
    this.isFiltered = false;
    this.isQuoteRelated = false;
    this.references = new Set();
    this.allIssueComments = null;
  }

  get issueRef() {
    return `${this.repo}#${this.issueNumber}`;
  }

  toHTML(isActive, company) {
    try {
      const header = this.createHeader(isActive, company);
      const body = `<div class="comment-body">${this.parseMarkdown()}</div>`;
      const footer = this.createFooter();
      const classes = [
        'comment',
        this.isOriginalPost ? 'original-post' : '',
        this.isFiltered ? 'filtered' : '',
        this.isQuoteRelated ? 'quote-related' : '',
      ]
        .filter(Boolean)
        .join(' ');

      return `
        <div class="${classes}" data-comment-id="${this.id}">
          ${header}
          ${body}
          ${footer}
        </div>`;
    } catch (error) {
      return `<div class="comment error">Error rendering comment: ${error.message}</div>`;
    }
  }

  createFooter() {
    if (this.references.size === 0) return '';

    const referencesHTML = [...this.references]
      .map((refId) => {
        const referencedComment = this.allIssueComments?.find(
          (c) => c.id === refId
        );
        const snippet = referencedComment
          ? `"${referencedComment.body.slice(0, 50)}${
              referencedComment.body.length > 50 ? '...' : ''
            }"`
          : 'unknown comment';
        return `<div class="reference-item">ID: ${refId} - ${snippet}</div>`;
      })
      .join('');

    return `
      <div class="comment-footer">
        <div class="references">
          <div>References:</div>
          ${referencesHTML}
        </div>
      </div>`;
  }

  createHeader(isActive, company) {
    const authorInfo = `${this.user.login}${company ? ` (${company})` : ''}`;
    const date = new Date(this.created_at).toLocaleDateString();
    const issueButton = `<button class="issue-reference${
      isActive ? ' active' : ''
    }" data-issue="${this.issueRef}">${this.issueRef}</button>`;
    const originalPostBadge = this.isOriginalPost
      ? `<span class="original-post-badge">Original Post: ${this.issueTitle}</span>`
      : '';

    return `
      <div class="comment-header">
        <span class="comment-author">${authorInfo}</span>
        <span class="comment-date">${date}</span>
        ${issueButton}
        ${originalPostBadge}
      </div>`;
  }

  parseMarkdown() {
    return window.marked ? window.marked.parse(this.body) : this.body;
  }

  setFiltered(filtered) {
    this.isFiltered = filtered;
    return this;
  }

  setQuoteRelated(related) {
    this.isQuoteRelated = related;
    return this;
  }

  hasQuote(text) {
    return this.body.includes(text);
  }

  containsQuoteFrom(otherComment) {
    const quotes = this.body.match(/>(.*?)(\n\n|$)/gs) || [];
    return quotes.some((quote) =>
      otherComment.body.includes(quote.replace(/^>\s*/gm, '').trim())
    );
  }

  /**
   * Find and store references to other comments based on quotes and mentions
   * @param {Comment[]} allComments All available comments
   */
  findReferences(allComments) {
    this.references.clear();
    this.allIssueComments = allComments;

    const quoteBlocks = this.body.match(/^>[ ]?.+(?:\n>[ ]?.+)*/gm) || [];

    for (const quoteBlock of quoteBlocks) {
      const cleanQuote = quoteBlock
        .split('\n')
        .map((line) => line.replace(/^>[ ]?/, '').trim())
        .join('\n')
        .trim();

      if (!cleanQuote) continue;

      const referencedComment = [...allComments]
        .filter((c) => c.created_at < this.created_at)
        .find((c) => {
          const commentLines = c.body.split('\n').map((l) => l.trim());
          const quoteLines = cleanQuote.split('\n');

          for (let i = 0; i <= commentLines.length - quoteLines.length; i++) {
            if (quoteLines.every((line, j) => line === commentLines[i + j])) {
              return true;
            }
          }
          return false;
        });

      if (referencedComment) {
        this.references.add(referencedComment.id);
      }
    }

    const mentions = [...new Set(this.body.match(/@([a-zA-Z0-9-]+)/g) || [])];
    for (const mention of mentions) {
      const username = mention.substring(1);
      const referencedComment = [...allComments]
        .filter(
          (c) => c.created_at < this.created_at && c.user.login === username
        )
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];

      if (referencedComment) {
        this.references.add(referencedComment.id);
      }
    }
  }
}
