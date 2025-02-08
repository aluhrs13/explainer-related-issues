import { state } from './state.js';

export function createLoadingIndicator(message) {
  const indicator = document.createElement('div');
  indicator.className = 'loading-indicator';
  indicator.innerHTML = `
        <div class="loading-spinner"></div>
        <span>${message}</span>
    `;
  return indicator;
}

export function renderComment(comment, isQuote = false) {
  const issueRef = `${comment.repo}#${comment.issueNumber}`;
  const isActive = state.activeFilter === issueRef;
  const company = state.getUserCompany(comment.user.login);
  const { cleanBody, quotes } = isQuote
    ? { cleanBody: comment.body, quotes: [] }
    : extractQuotes(comment.body);

  const quotesHtml = !isQuote
    ? quotes.map((q) => renderQuotedComment(q, comment)).join('')
    : '';

  return `
        <div class="comment${comment.isOriginalPost ? ' original-post' : ''}">
            ${quotesHtml}
            <div class="comment-header">
                <span class="comment-author">${comment.user.login}${
    company ? ` (${company})` : ''
  }</span>
                <span class="comment-date">${new Date(
                  comment.created_at
                ).toLocaleDateString()}</span>
                <button class="issue-reference${
                  isActive ? ' active' : ''
                }" data-issue="${issueRef}">
                    ${issueRef}
                </button>
                ${
                  comment.isOriginalPost
                    ? `<span class="original-post-badge">Original Post: ${comment.issueTitle}</span>`
                    : ''
                }
            </div>
            <div class="comment-body">${marked.parse(cleanBody)}</div>
        </div>
    `;
}

function extractQuotes(body) {
  if (!body) return { cleanBody: '', quotes: [] };

  const lines = body.split('\n');
  let currentQuote = [];
  const quotes = [];
  const nonQuoteLines = [];
  let inCodeBlock = false;
  let quoteDepth = 0;

  for (const line of lines) {
    if (line.startsWith('```')) {
      if (quoteDepth > 0) {
        currentQuote.push(line);
      } else {
        inCodeBlock = !inCodeBlock;
        nonQuoteLines.push(line);
      }
      continue;
    }

    if (inCodeBlock && quoteDepth === 0) {
      nonQuoteLines.push(line);
      continue;
    }

    let depth = 0;
    let content = line;
    if (!inCodeBlock) {
      while (content.startsWith('>')) {
        depth++;
        content = content.substring(1).trimStart();
      }
    }

    if (depth > 0) {
      if (depth !== quoteDepth && currentQuote.length > 0) {
        const quoteText = currentQuote.join('\n').trim();
        if (quoteText) quotes.push({ text: quoteText, depth: quoteDepth });
        currentQuote = [];
      }
      quoteDepth = depth;
      currentQuote.push(content);
    } else {
      if (currentQuote.length > 0) {
        const quoteText = currentQuote.join('\n').trim();
        if (quoteText) quotes.push({ text: quoteText, depth: quoteDepth });
        currentQuote = [];
        quoteDepth = 0;
      }
      if (line.trim()) nonQuoteLines.push(line);
    }
  }

  if (currentQuote.length > 0) {
    const quoteText = currentQuote.join('\n').trim();
    if (quoteText) quotes.push({ text: quoteText, depth: quoteDepth });
  }

  return {
    cleanBody: nonQuoteLines.join('\n'),
    quotes: quotes.filter((q) => q.text.length > 0),
  };
}

function findOriginalComment(quoteText, currentComment) {
  const cleanQuote = quoteText
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (cleanQuote.length < 10) return null;

  const previousComments = state.allIssueComments.filter(
    (comment) =>
      comment.repo === currentComment.repo &&
      comment.issueNumber === currentComment.issueNumber &&
      new Date(comment.created_at) < new Date(currentComment.created_at)
  );

  const matches = previousComments
    .map((comment) => {
      if (!comment.body) return { comment, score: 0 };

      const commentText = comment.body
        .replace(/[*_`]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();

      let score = 0;
      if (commentText.includes(cleanQuote)) {
        score = cleanQuote.length / commentText.length;
        if (Math.abs(commentText.length - cleanQuote.length) < 10) {
          score *= 1.5;
        }
        const timeDiff =
          new Date(currentComment.created_at) - new Date(comment.created_at);
        if (timeDiff < 1000 * 60 * 60 * 24) {
          score *= 1.2;
        }
        if (cleanQuote.includes(comment.user.login.toLowerCase())) {
          score *= 1.3;
        }
        const lineStart = new RegExp(`^${cleanQuote}`, 'm');
        if (commentText.match(lineStart)) {
          score *= 1.1;
        }
      }

      return { comment, score };
    })
    .filter((m) => m.score > 0.1)
    .sort((a, b) => b.score - a.score);

  return matches.length > 0
    ? { ...matches[0].comment, quoteDepth: currentComment.quoteDepth || 1 }
    : null;
}

function renderQuotedComment(quote, currentComment) {
  const originalComment = findOriginalComment(quote.text, currentComment);
  if (!originalComment) return '';

  return `
        <div class="comment-quote depth-${originalComment.quoteDepth}">
            ${renderComment(originalComment, true)}
        </div>
    `;
}

export function renderIssueTable() {
  const tableBody = document.getElementById('issueTableBody');
  tableBody.innerHTML = Array.from(state.trackedIssues)
    .map((issue) => {
      const [repo, number] = issue.split('#');
      return `
                <tr>
                    <td>${repo}</td>
                    <td>${number}</td>
                    <td>
                        <button class="remove-issue" data-issue="${issue}">Remove</button>
                    </td>
                </tr>
            `;
    })
    .join('');
}

export function updateCommentsContent() {
  const container = document.getElementById('issueContainers');
  const filteredComments = state.getFilteredComments();

  container.innerHTML = `
        <div class="comments-section">
            ${filteredComments
              .map((comment) => renderComment(comment))
              .join('')}
        </div>
    `;
}
