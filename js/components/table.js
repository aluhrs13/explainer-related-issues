import { LitElement, html, css } from 'lit';
import { state } from '../state.js';

export class IssueTable extends LitElement {
  static properties = {
    issues: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
      margin-bottom: 1rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 1rem;
    }
    tr {
      border-bottom: 1px solid #e1e4e8;
    }
    th {
      background-color: #f6f8fa;
      border-top: 1px solid #e1e4e8;
      text-align: left;
      padding: 0.75rem;
    }
    td {
      padding: 0.75rem;
      text-align: left;
    }
    button.remove-issue {
      background-color: #cb2431;
      color: white;
      padding: 0.25rem 0.5rem;
      font-size: 0.875rem;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button.remove-issue:hover {
      background-color: #a41e2b;
    }
  `;

  constructor() {
    super();
    this.issues = Array.from(state.trackedIssues);
  }

  render() {
    return html`
      <table>
        <thead>
          <tr>
            <th>Repository</th>
            <th>Issue #</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.issues.map((issue) => {
            const [repo, number] = issue.split('#');
            return html`
              <tr>
                <td>${repo}</td>
                <td>${number}</td>
                <td>
                  <button
                    class="remove-issue"
                    @click=${() => this._handleRemove(issue)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            `;
          })}
        </tbody>
      </table>
    `;
  }

  _handleRemove(issue) {
    this.dispatchEvent(
      new CustomEvent('issue-removed', {
        detail: { issue },
        bubbles: true,
        composed: true,
      })
    );
  }
}

customElements.define('issue-table', IssueTable);
