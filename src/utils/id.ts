export function makeReferenceNo() {
  const year = new Date().getFullYear();
  const token = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `SSU-VRF-${year}-${token}`;
}

export function formatDateTime(value?: number) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
