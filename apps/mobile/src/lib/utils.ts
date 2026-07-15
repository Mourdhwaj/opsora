export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: '#22c55e',
    pending: '#eab308',
    paid: '#22c55e',
    overdue: '#ef4444',
    vacant: '#6b7280',
    occupied: '#3b82f6',
    open: '#f97316',
    resolved: '#22c55e',
    closed: '#6b7280',
  };
  return colors[status.toLowerCase()] || '#6b7280';
}
