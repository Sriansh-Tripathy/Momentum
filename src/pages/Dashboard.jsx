import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import { useExpenseContext } from '../store/ExpenseContext';
import { useBankContext, DEPOSIT_CATEGORIES } from '../store/BankContext';
import { predictMonthlyExpenses } from '../utils/mlPredictor';
import { format, isSameMonth, parseISO } from 'date-fns';
import { PlusCircle, ArrowDownCircle, ArrowUpCircle, TrendingDown, TrendingUp, Trash2 } from 'lucide-react';
import './Dashboard.css';

export default function Dashboard() {
    const navigate = useNavigate();
    const { expenses, addExpense, deleteExpense } = useExpenseContext();
    const { deposits, totalDeposited, addDeposit, deleteDeposit } = useBankContext();

    const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState('');
    const [depositLabel, setDepositLabel] = useState('');
    const [depositCategory, setDepositCategory] = useState('salary');
    const [depositDate, setDepositDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const currentMonth = new Date();
    const currentMonthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), currentMonth));
    const totalSpentThisMonth = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const totalSpentAllTime = expenses.reduce((s, e) => s + e.amount, 0);

    // Live balance = total deposited - total ever spent
    const liveBalance = totalDeposited - totalSpentAllTime;

    // ML Prediction
    const predictedMonthly = useMemo(
        () => predictMonthlyExpenses(expenses),
        [expenses]
    );

    const budgetUsedPct = predictedMonthly > 0
        ? Math.min((totalSpentThisMonth / predictedMonthly) * 100, 100)
        : 0;
    const isOverBudget = predictedMonthly > 0 && totalSpentThisMonth > predictedMonthly;

    // Combined transaction feed: last 8 items (deposits + expenses)
    const allTransactions = useMemo(() => {
        const deps = deposits.map(d => ({ ...d, type: 'deposit' }));
        const exps = expenses.map(e => ({ ...e, type: 'expense' }));
        return [...deps, ...exps]
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 8);
    }, [deposits, expenses]);

    const handleAddDeposit = (e) => {
        e.preventDefault();
        if (!depositAmount || isNaN(depositAmount)) return;
        addDeposit({
            label: depositLabel || 'Deposit',
            amount: parseFloat(depositAmount),
            category: depositCategory,
            date: depositDate,
        });
        setIsDepositModalOpen(false);
        setDepositAmount('');
        setDepositLabel('');
        setDepositDate(format(new Date(), 'yyyy-MM-dd'));
    };

    return (
        <div className="dashboard-page">
            <Header title="Overview" />

            {/* === LIVE BALANCE CARD === */}
            <div className="balance-card">
                <div className="balance-header">
                    <span className="balance-label brand-font">CURRENT BALANCE</span>
                    <button
                        className="icon-btn"
                        onClick={() => setIsDepositModalOpen(true)}
                        title="Add Deposit"
                    >
                        <PlusCircle size={18} />
                    </button>
                </div>
                <div className={`balance-amount brand-font ${liveBalance < 0 ? 'text-negative' : ''}`}>
                    ₹{liveBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="balance-stats">
                    <div className="balance-stat">
                        <TrendingUp size={14} className="stat-icon stat-green" />
                        <span className="brand-font">+₹{totalDeposited.toLocaleString('en-IN', { maximumFractionDigits: 0 })} in</span>
                    </div>
                    <div className="balance-stat">
                        <TrendingDown size={14} className="stat-icon stat-red" />
                        <span className="brand-font">-₹{totalSpentAllTime.toLocaleString('en-IN', { maximumFractionDigits: 0 })} out</span>
                    </div>
                </div>
            </div>

            {/* === QUICK STATS GRID === */}
            <div className="stats-grid">
                <div className="stat-card" onClick={() => navigate('/analytics')}>
                    <div className="stat-label brand-font">THIS MONTH</div>
                    <div className="stat-value brand-font">₹{totalSpentThisMonth.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                    <div className="stat-sub text-secondary brand-font">{currentMonthExpenses.length} transactions</div>
                </div>
                <div className="stat-card" onClick={() => navigate('/analytics')}>
                    <div className="stat-label brand-font">ML PREDICTION</div>
                    <div className={`stat-value brand-font ${isOverBudget ? 'text-red' : ''}`}>
                        ₹{predictedMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </div>
                    <div className="stat-sub text-secondary brand-font">
                        {isOverBudget ? '⚠️ Over pace' : `${Math.round(budgetUsedPct)}% used`}
                    </div>
                </div>
            </div>

            {/* === BUDGET METER === */}
            <div className="budget-meter-card">
                <div className="budget-meter-header">
                    <span className="brand-font">MONTH PACE</span>
                    <span className={`brand-font ${isOverBudget ? 'text-red' : 'text-secondary'}`}>
                        {isOverBudget
                            ? `OVER by ₹${(totalSpentThisMonth - predictedMonthly).toFixed(0)}`
                            : `₹${(predictedMonthly - totalSpentThisMonth).toFixed(0)} remaining`
                        }
                    </span>
                </div>
                <div className="budget-meter">
                    <div
                        className={`budget-meter-fill ${isOverBudget ? 'budget-over' : ''}`}
                        style={{ width: `${budgetUsedPct}%` }}
                    />
                </div>
                <div className="budget-labels brand-font text-secondary">
                    <span>₹0</span>
                    <span>ML Predicted: ₹{predictedMonthly.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
                </div>
            </div>

            {/* === QUICK ACTIONS === */}
            <div className="quick-actions">
                <Button variant="primary" size="md" onClick={() => setIsDepositModalOpen(true)}>
                    <ArrowDownCircle size={16} /> Add Income
                </Button>
                <Button variant="outline" size="md" onClick={() => navigate('/expenses')}>
                    <ArrowUpCircle size={16} /> Log Expense
                </Button>
            </div>

            {/* === TRANSACTION FEED === */}
            <div className="transaction-feed">
                <div className="feed-header">
                    <span className="brand-font">RECENT ACTIVITY</span>
                </div>
                {allTransactions.length === 0 ? (
                    <div className="feed-empty brand-font text-secondary">
                        No transactions yet. Add a deposit to start!
                    </div>
                ) : (
                    allTransactions.map(txn => (
                        <div
                            key={txn.id}
                            className={`feed-item ${txn.type === 'deposit' ? 'feed-deposit' : 'feed-expense'}`}
                        >
                            <div className="feed-icon brand-font">
                                {txn.type === 'deposit' ? '↓' : '↑'}
                            </div>
                            <div className="feed-details">
                                <div className="feed-label brand-font">
                                    {txn.type === 'deposit' ? (txn.label || 'Deposit') : (txn.note || txn.category)}
                                </div>
                                <div className="feed-date text-secondary brand-font">
                                    {format(parseISO(txn.date), 'MMM dd')}
                                    {txn.type === 'deposit' && txn.category ? ` · ${txn.category}` : ''}
                                </div>
                            </div>
                            <div className="feed-amount brand-font">
                                <span className={txn.type === 'deposit' ? 'amount-green' : 'amount-red'}>
                                    {txn.type === 'deposit' ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                </span>
                            </div>
                            <button
                                className="feed-delete"
                                onClick={() => {
                                    if (txn.type === 'deposit') deleteDeposit(txn.id);
                                    else deleteExpense(txn.id);
                                }}
                                title="Delete"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))
                )}
            </div>

            {/* === ADD DEPOSIT MODAL === */}
            <Modal
                isOpen={isDepositModalOpen}
                onClose={() => setIsDepositModalOpen(false)}
                title="Add Income / Deposit"
            >
                <form onSubmit={handleAddDeposit} className="expense-form">
                    <Input
                        label="Amount (₹)"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        required
                        autoFocus
                    />
                    <Input
                        label="Source / Label"
                        type="text"
                        placeholder="e.g. Monthly Salary"
                        value={depositLabel}
                        onChange={e => setDepositLabel(e.target.value)}
                    />
                    <div className="nothing-input-container">
                        <label className="nothing-label">Category</label>
                        <select
                            className="nothing-select border"
                            value={depositCategory}
                            onChange={e => setDepositCategory(e.target.value)}
                        >
                            {DEPOSIT_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                    </div>
                    <Input
                        label="Date"
                        type="date"
                        value={depositDate}
                        onChange={e => setDepositDate(e.target.value)}
                        required
                    />
                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Add Deposit
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
