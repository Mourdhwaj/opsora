import type { ReactNode } from 'react';
import { Wrench, Droplets, Zap, Broom, Shield, UtensilsCrossed, Volume2, Car, Globe, HelpCircle } from 'lucide-react-native';
import { theme } from './theme';

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
    occupied: 'theme.colors.primary',
    open: '#f97316',
    'in_progress': 'theme.colors.primary',
    resolved: '#22c55e',
    closed: '#6b7280',
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: 'theme.colors.primary',
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

export function getPriorityColor(priority?: string): string {
  if (!priority) return '#6b7280';
  const colors: Record<string, string> = {
    urgent: '#ef4444',
    high: '#f97316',
    medium: '#eab308',
    low: 'theme.colors.primary',
  };
  return colors[priority.toLowerCase()] || '#6b7280';
}

export function getCategoryIcon(category?: string): ReactNode {
  if (!category) return <HelpCircle size={14} color={theme.colors.textMuted} />;
  
  const icons: Record<string, ReactNode> = {
    maintenance: <Wrench size={14} color={theme.colors.primary} />,
    plumbing: <Droplets size={14} color={theme.colors.info} />,
    electrical: <Zap size={14} color={theme.colors.warning} />,
    cleaning: <Broom size={14} color={theme.colors.success} />,
    security: <Shield size={14} color={theme.colors.danger} />,
    food: <UtensilsCrossed size={14} color={theme.colors.primary} />,
    noise: <Volume2 size={14} color={theme.colors.warning} />,
    parking: <Car size={14} color={theme.colors.textSecondary} />,
    internet: <Globe size={14} color={theme.colors.info} />,
    other: <HelpCircle size={14} color={theme.colors.textMuted} />,
  };
  
  return icons[category.toLowerCase()] || <HelpCircle size={14} color={theme.colors.textMuted} />;
}
