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

export class Comment {
  /** @type {string} */ id;
  /** @type {string} */ body;
  /** @type {string} */ created_at;
  /** @type {Object} */ user;
  /** @type {string} */ repo;
  /** @type {number} */ issueNumber;
  /** @type {string} */ issueTitle;
  /** @type {boolean} */ isOriginalPost;
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
    this.references = new Set();
    this.allIssueComments = null;
  }

  get issueRef() {
    return `${this.repo}#${this.issueNumber}`;
  }

  // Quote-related methods
  /**
   * Check if the comment contains a specific text
   * @param {string} text Text to search for
   * @returns {boolean}
   */
  hasQuote(text) {
    return this.body.includes(text);
  }

  /**
   * Extract all quote blocks from the comment
   * @returns {string[]}
   */
  getQuoteBlocks() {
    return this.body.match(/^>[ ]?.+(?:\n>[ ]?.+)*/gm) || [];
  }

  /**
   * Check if this comment contains a quote from another comment
   * @param {Comment} otherComment Comment to check quotes from
   * @returns {boolean}
   */
  containsQuoteFrom(otherComment) {
    const quotes = this.getQuoteBlocks();
    return quotes.some((quote) =>
      otherComment.body.includes(quote.replace(/^>\s*/gm, '').trim())
    );
  }

  // Rendering methods
  /**
   * Convert comment to HTML
   * @param {string} company Company information
   * @returns {string} HTML representation
   */
  toHTML(company) {
    try {
      const header = this.createHeader(company);
      const body = `<div class="comment-body">${this.parseMarkdown()}</div>`;
      const footer = this.createFooter();
      const classes = ['comment', this.isOriginalPost ? 'original-post' : '']
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

  /**
   * Create the header section of the comment
   * @private
   */
  createHeader(company) {
    const authorInfo = `${this.user.login}${company ? ` (${company})` : ''}`;
    const date = new Date(this.created_at).toLocaleDateString();
    const issueButton = `<button class="issue-reference" data-issue="${this.issueRef}">${this.issueRef}</button>`;
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

  /**
   * Create the footer section of the comment
   * @private
   */
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

  /**
   * Parse markdown content to HTML
   * @private
   */
  parseMarkdown() {
    return window.marked ? window.marked.parse(this.body) : this.body;
  }

  /**
   * Find and store references to other comments based on quotes and mentions
   * @param {Comment[]} allComments All available comments
   */
  findReferences(allComments) {
    this.references.clear();
    this.allIssueComments = allComments;

    this.findQuoteReferences(allComments);
    this.findMentionReferences(allComments);
  }

  /**
   * Find references based on quotes
   * @private
   */
  findQuoteReferences(allComments) {
    const quoteBlocks = this.getQuoteBlocks();

    for (const quoteBlock of quoteBlocks) {
      const cleanQuote = quoteBlock
        .split('\n')
        .map((line) => line.replace(/^>[ ]?/, '').trim())
        .join('\n')
        .trim();

      if (!cleanQuote) continue;

      const referencedComment = [...allComments]
        .filter((c) => c.created_at < this.created_at)
        .find((c) => this.isExactQuoteMatch(c.body, cleanQuote));

      if (referencedComment) {
        this.references.add(referencedComment.id);
      }
    }
  }

  /**
   * Find references based on @ mentions
   * @private
   */
  findMentionReferences(allComments) {
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

  /**
   * Check if text contains an exact quote match
   * @private
   */
  isExactQuoteMatch(text, quote) {
    const textLines = text.split('\n').map((l) => l.trim());
    const quoteLines = quote.split('\n');

    for (let i = 0; i <= textLines.length - quoteLines.length; i++) {
      if (quoteLines.every((line, j) => line === textLines[i + j])) {
        return true;
      }
    }
    return false;
  }
}
