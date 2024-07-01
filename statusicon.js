// StatusIcon.js
export default function StatusIcon({ status }) {
    let color = 'yellow'; // Default for loading
    if (status === 'OK') {
      color = 'green';
    } else if (status === 'BAD') {
      color = 'red';
    }
    return `<div class="status-icon ${status}" style="background-color: ${color};"></div>`;
  }
