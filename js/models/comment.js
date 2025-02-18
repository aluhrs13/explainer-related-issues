import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
    this.id = String(id);
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
        this.references.add(String(referencedComment.id));
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
        this.references.add(String(referencedComment.id));
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
