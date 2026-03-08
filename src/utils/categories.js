import { ShoppingBag, Coffee, Car, Film, Zap, HeartPulse, BookOpen, MoreHorizontal } from 'lucide-react';

export const expenseCategories = [
    { id: 'food', label: 'Food & Dining', icon: Coffee, color: '#f59e0b' },
    { id: 'transport', label: 'Transport', icon: Car, color: '#3b82f6' },
    { id: 'entertainment', label: 'Entertainment', icon: Film, color: '#8b5cf6' },
    { id: 'shopping', label: 'Shopping', icon: ShoppingBag, color: '#ec4899' },
    { id: 'bills', label: 'Bills & Utilities', icon: Zap, color: '#D71921' }, // brand red
    { id: 'health', label: 'Health', icon: HeartPulse, color: '#10b981' },
    { id: 'education', label: 'Education', icon: BookOpen, color: '#6366f1' },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: '#a3a3a3' },
];

export function getCategory(id) {
    return expenseCategories.find(c => c.id === id) || expenseCategories[7];
}
