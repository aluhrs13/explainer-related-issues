import { state } from '../state.js';

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
