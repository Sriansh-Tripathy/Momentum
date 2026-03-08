import React, { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import { usePaymentContext } from '../store/PaymentContext';
import { useExpenseContext } from '../store/ExpenseContext';
import { expenseCategories } from '../utils/categories';
import { CheckCircle2, Plus, Trash2, Calendar, AlertCircle, Clock } from 'lucide-react';
import { format, parseISO, isPast, isToday, differenceInDays } from 'date-fns';
import './Payments.css';

// Days until (or since) due date label
function DueBadge({ dateStr }) {
    const due = parseISO(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = differenceInDays(due, today);

    if (diff < 0) return <span className="due-badge due-overdue brand-font">OVERDUE {Math.abs(diff)}d</span>;
    if (diff === 0) return <span className="due-badge due-today brand-font">DUE TODAY</span>;
    if (diff <= 7) return <span className="due-badge due-soon brand-font">IN {diff}d</span>;
    return <span className="due-badge brand-font">IN {diff}d</span>;
}

export default function Payments() {
    const { payments, addPayment, deletePayment, markPaid } = usePaymentContext();
    const { addExpense } = useExpenseContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [justPaid, setJustPaid] = useState(null); // id of payment just marked paid

    // Form state
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('monthly');
    const [nextDueDate, setNextDueDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [category, setCategory] = useState('bills');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || !name) return;
        addPayment({ name, amount: parseFloat(amount), frequency, nextDueDate, category });
        setIsModalOpen(false);
        setName('');
        setAmount('');
        setNextDueDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleMarkPaid = (payment) => {
        // Pass addExpense so PaymentContext can log it automatically
        markPaid(payment, addExpense);
        setJustPaid(payment.id);
        setTimeout(() => setJustPaid(null), 1500);
    };

    // Sort by due date ascending
    const sortedPayments = useMemo(
        () => [...payments].sort((a, b) => new Date(a.nextDueDate) - new Date(b.nextDueDate)),
        [payments]
    );

    // Monthly total (all recurring, pro-rated weekly → monthly)
    const monthlyEstimate = useMemo(() => payments.reduce((sum, p) => {
        if (p.frequency === 'monthly') return sum + p.amount;
        if (p.frequency === 'weekly') return sum + p.amount * 4.33;
        if (p.frequency === 'yearly') return sum + p.amount / 12;
        return sum;
    }, 0), [payments]);

    const overdueCount = sortedPayments.filter(p => {
        const diff = differenceInDays(parseISO(p.nextDueDate), new Date());
        return diff < 0;
    }).length;

    return (
        <div className="payments-page">
            <Header title="Payments" />

            {/* Summary strip */}
            <div className="payments-summary">
                <div className="ps-item">
                    <div className="ps-label brand-font">MONTHLY RECURRING</div>
                    <div className="ps-value brand-font">₹{monthlyEstimate.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </div>
                <div className={`ps-item ${overdueCount > 0 ? 'ps-alert' : ''}`}>
                    <div className="ps-label brand-font">OVERDUE</div>
                    <div className="ps-value brand-font">{overdueCount}</div>
                </div>
                <div className="ps-item">
                    <div className="ps-label brand-font">TOTAL</div>
                    <div className="ps-value brand-font">{payments.length}</div>
                </div>
            </div>

            {/* Payments list */}
            <div className="payments-list">
                {sortedPayments.length === 0 ? (
                    <div className="empty-state text-secondary brand-font">
                        NO RECURRING PAYMENTS. ADD ONE BELOW.
                    </div>
                ) : (
                    sortedPayments.map(payment => {
                        const isPaidAnim = justPaid === payment.id;
                        const dueDate = parseISO(payment.nextDueDate);
                        const diff = differenceInDays(dueDate, new Date());
                        const isOverdue = diff < 0;
                        const isDueToday = diff === 0;
                        const cat = expenseCategories.find(c => c.id === payment.category);

                        return (
                            <div
                                key={payment.id}
                                className={[
                                    'payment-item',
                                    isOverdue ? 'payment-item--overdue' : '',
                                    isDueToday ? 'payment-item--today' : '',
                                    isPaidAnim ? 'payment-item--paid' : '',
                                ].join(' ')}
                            >
                                {/* Left accent line inlined via class */}
                                <div className="payment-icon">
                                    <Calendar size={20} />
                                </div>

                                <div className="payment-details">
                                    <div className="payment-name brand-font">{payment.name.toUpperCase()}</div>
                                    <div className="payment-meta brand-font text-secondary">
                                        {payment.frequency.toUpperCase()}
                                        {cat && <span> · {cat.label.toUpperCase()}</span>}
                                    </div>
                                    <div className="payment-due brand-font">
                                        <Calendar size={11} />
                                        {format(dueDate, 'dd MMM yyyy').toUpperCase()} &nbsp;
                                        <DueBadge dateStr={payment.nextDueDate} />
                                    </div>
                                    {payment.lastPaidDate && (
                                        <div className="payment-lastpaid brand-font text-secondary">
                                            <Clock size={10} /> Last paid: {format(parseISO(payment.lastPaidDate), 'dd MMM')}
                                        </div>
                                    )}
                                </div>

                                <div className="payment-right">
                                    <div className="payment-amount brand-font">
                                        ₹{parseFloat(payment.amount).toFixed(0)}
                                    </div>
                                    <div className="payment-actions">
                                        <button
                                            className={`pay-btn ${isPaidAnim ? 'pay-btn--done' : ''}`}
                                            onClick={() => handleMarkPaid(payment)}
                                            title="Mark as Paid — logs to Expenses"
                                        >
                                            <CheckCircle2 size={22} />
                                        </button>
                                        <button
                                            className="delete-btn"
                                            onClick={() => deletePayment(payment.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FAB */}
            <button className="fab brand-font" onClick={() => setIsModalOpen(true)}>
                <Plus size={18} /> Recurring
            </button>

            {/* Add Payment Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Recurring Payment">
                <form onSubmit={handleSubmit} className="expense-form">
                    <Input label="Name" type="text" placeholder="e.g. Netflix, Rent"
                        value={name} onChange={e => setName(e.target.value)} required autoFocus />
                    <Input label="Amount (₹)" type="number" step="0.01" placeholder="0.00"
                        value={amount} onChange={e => setAmount(e.target.value)} required />

                    <div className="nothing-input-container">
                        <label className="nothing-label">Expense Category</label>
                        <select className="nothing-select border" value={category}
                            onChange={e => setCategory(e.target.value)}>
                            {expenseCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="nothing-input-container">
                        <label className="nothing-label">Frequency</label>
                        <select className="nothing-select border" value={frequency}
                            onChange={e => setFrequency(e.target.value)}>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    <Input label="First Due Date" type="date" value={nextDueDate}
                        onChange={e => setNextDueDate(e.target.value)} required />

                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Save Payment
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
