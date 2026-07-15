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
    inactive: '#ef4444',
    pending: '#eab308',
    paid: '#22c55e',
    partial: '#f97316',
    overdue: '#ef4444',
    vacant: '#6b7280',
    occupied: '#3b82f6',
    open: '#f97316',
    'in_progress': '#3b82f6',
    resolved: '#22c55e',
    closed: '#6b7280',
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  };
  return colors[status.toLowerCase()] || '#6b7280';
}

export function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return formatDate(dateString);
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: '#3b82f6',
  };
  return colors[priority.toLowerCase()] || '#6b7280';
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    maintenance: '🔧',
    plumbing: '🚿',
    electrical: '⚡',
    cleaning: '🧹',
    security: '🔒',
    food: '🍽️',
    noise: '🔊',
    parking: '🅿️',
    internet: '🌐',
    other: '📋',
  };
  return icons[category.toLowerCase()] || '📋';
}
