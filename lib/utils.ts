import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatCurrency(amount: number, currency = 'CAD') {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('fr-CA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date) {
  return new Intl.DateTimeFormat('fr-CA', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
}

export function getDaysUntil(date: string | Date) {
  const now = new Date();
  const target = new Date(date);
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PLANNING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    CONFIRMED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    IN_PROGRESS: 'bg-green-500/20 text-green-300 border-green-500/30',
    COMPLETED: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    CANCELLED: 'bg-red-500/20 text-red-300 border-red-500/30',
    TODO: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    DONE: 'bg-green-500/20 text-green-300 border-green-500/30',
    DRAFT: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    REVIEW: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    SIGNED: 'bg-green-500/20 text-green-300 border-green-500/30',
    EXPIRED: 'bg-red-500/20 text-red-300 border-red-500/30',
    PENDING: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    PAID: 'bg-green-500/20 text-green-300 border-green-500/30',
    OVERDUE: 'bg-red-500/20 text-red-300 border-red-500/30',
    INVITED: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    ATTENDED: 'bg-green-500/20 text-green-300 border-green-500/30',
    DECLINED: 'bg-red-500/20 text-red-300 border-red-500/30',
    NO_SHOW: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    LOW: 'bg-slate-500/20 text-slate-400',
    MEDIUM: 'bg-yellow-500/20 text-yellow-300',
    HIGH: 'bg-orange-500/20 text-orange-300',
    URGENT: 'bg-red-500/20 text-red-300',
  };
  return colors[status] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PLANNING: 'Planification',
    CONFIRMED: 'Confirmé',
    IN_PROGRESS: 'En cours',
    COMPLETED: 'Terminé',
    CANCELLED: 'Annulé',
    TODO: 'À faire',
    DONE: 'Terminé',
    DRAFT: 'Brouillon',
    REVIEW: 'En révision',
    SIGNED: 'Signé',
    EXPIRED: 'Expiré',
    PENDING: 'En attente',
    PAID: 'Payé',
    OVERDUE: 'En retard',
    INVITED: 'Invité',
    ATTENDED: 'Présent',
    DECLINED: 'Décliné',
    NO_SHOW: 'Absent',
    LOW: 'Faible',
    MEDIUM: 'Moyen',
    HIGH: 'Élevé',
    URGENT: 'Urgent',
    PAYABLE: 'À payer',
    RECEIVABLE: 'À recevoir',
  };
  return labels[status] || status;
}

export function generateInvoiceNumber() {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 9000) + 1000;
  return `FAC-${year}-${num}`;
}

export function calculateBudgetUsage(budget: number, spent: number) {
  if (budget === 0) return 0;
  return Math.round((spent / budget) * 100);
}
