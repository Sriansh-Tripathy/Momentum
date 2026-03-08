import React, { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import { useExpenseContext } from '../store/ExpenseContext';
import { useBankContext, DEPOSIT_CATEGORIES } from '../store/BankContext';
import { expenseCategories, getCategory } from '../utils/categories';
import { Plus, Search, Trash2, ArrowUpCircle, ArrowDownCircle, Download } from 'lucide-react';
import { format, parseISO, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import './Expenses.css';

export default function Expenses() {
    const { expenses, addExpense, deleteExpense } = useExpenseContext();
    const { deposits, addDeposit, deleteDeposit } = useBankContext();

    // UI state
    const [tab, setTab] = useState('all');         // 'all' | 'expenses' | 'deposits'
    const [modalMode, setModalMode] = useState('expense'); // 'expense' | 'deposit'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportFrom, setExportFrom] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [exportTo, setExportTo] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Expense form
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('food');
    const [note, setNote] = useState('');
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Deposit form
    const [depAmount, setDepAmount] = useState('');
    const [depLabel, setDepLabel] = useState('');
    const [depCategory, setDepCategory] = useState('salary');
    const [depDate, setDepDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const openModal = (mode) => {
        setModalMode(mode);
        setIsModalOpen(true);
    };

    const handleSubmitExpense = (e) => {
        e.preventDefault();
        if (!amount || isNaN(amount)) return;
        addExpense({ amount: parseFloat(amount), category, note, date });
        setIsModalOpen(false);
        setAmount('');
        setNote('');
        setDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleSubmitDeposit = (e) => {
        e.preventDefault();
        if (!depAmount || isNaN(depAmount)) return;
        addDeposit({
            label: depLabel || 'Deposit',
            amount: parseFloat(depAmount),
            category: depCategory,
            date: depDate,
        });
        setIsModalOpen(false);
        setDepAmount('');
        setDepLabel('');
        setDepDate(format(new Date(), 'yyyy-MM-dd'));
    };

    const handleExportExcel = (e) => {
        e.preventDefault();
        const fromDate = new Date(exportFrom);
        const toDate = new Date(exportTo);
        toDate.setHours(23, 59, 59, 999);

        const filteredData = combinedList.filter(item => {
            const d = new Date(item.date);
            return d >= fromDate && d <= toDate;
        }).map(item => ({
            Type: item._type === 'deposit' ? 'Income' : 'Expense',
            Date: item.date,
            Category: item._type === 'deposit' ?
                (DEPOSIT_CATEGORIES.find(c => c.id === item.category)?.label || item.category) :
                (getCategory(item.category)?.label || item.category),
            Details: item.label || item.note || '',
            Amount: item._type === 'deposit' ? parseFloat(item.amount) : -parseFloat(item.amount)
        }));

        if (filteredData.length === 0) {
            alert('No data found in this date range.');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(filteredData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `Momentum_Report_${exportFrom}_to_${exportTo}.xlsx`);
        setIsExportModalOpen(false);
    };

    // Combined + filtered list
    const combinedList = useMemo(() => {
        const exps = expenses.map(e => ({ ...e, _type: 'expense' }));
        const deps = deposits.map(d => ({ ...d, _type: 'deposit' }));

        let all = [...exps, ...deps].sort((a, b) => {
            // Sort by date desc, then by createdAt desc for same day
            const dateDiff = new Date(b.date) - new Date(a.date);
            if (dateDiff !== 0) return dateDiff;
            return new Date(b.createdAt) - new Date(a.createdAt);
        });

        if (tab === 'expenses') all = all.filter(i => i._type === 'expense');
        if (tab === 'deposits') all = all.filter(i => i._type === 'deposit');

        if (search) {
            all = all.filter(i => {
                const text = (i.note || i.label || i.category || '').toLowerCase();
                return text.includes(search.toLowerCase());
            });
        }

        if (selectedCategory !== 'all' && tab !== 'deposits') {
            all = all.filter(i => i._type === 'deposit' || i.category === selectedCategory);
        }

        return all;
    }, [expenses, deposits, tab, search, selectedCategory]);

    return (
        <div className="expenses-page">
            <Header title="Ledger" />

            {/* Tab switcher */}
            <div className="ledger-tabs brand-font">
                {['all', 'expenses', 'deposits'].map(t => (
                    <button
                        key={t}
                        className={`ledger-tab ${tab === t ? 'ledger-tab--active' : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Search + filter + export controls */}
            <div className="expenses-controls-wrapper" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div className="expenses-controls" style={{ margin: 0, flex: 1 }}>
                    <Input
                        type="text"
                        placeholder="Search..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        containerClassName="search-input"
                        icon={<Search size={18} />}
                    />
                    {tab !== 'deposits' && (
                        <select
                            className="nothing-select border"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="all">All Categories</option>
                            {expenseCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    )}
                </div>
                <Button variant="secondary" onClick={() => setIsExportModalOpen(true)} className="brand-font" style={{ height: '44px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Download size={18} /> EXPORT
                </Button>
            </div>

            {/* Unified list */}
            <div className="expenses-list">
                {combinedList.length === 0 ? (
                    <div className="empty-state text-secondary brand-font">
                        NOTHING HERE YET.
                    </div>
                ) : (
                    combinedList.map(item => {
                        const isDeposit = item._type === 'deposit';

                        if (isDeposit) {
                            const depCat = DEPOSIT_CATEGORIES.find(c => c.id === item.category);
                            return (
                                <div key={item.id} className="expense-item deposit-item">
                                    <div className="expense-icon-bg deposit-icon-bg">
                                        <ArrowDownCircle size={22} color="#16a34a" />
                                    </div>
                                    <div className="expense-details">
                                        <h3 className="brand-font">{item.label || 'Deposit'}</h3>
                                        <div className="expense-meta text-secondary">
                                            {format(parseISO(item.date), 'MMM dd, yyyy')}
                                            {depCat ? ` • ${depCat.label}` : ''}
                                        </div>
                                    </div>
                                    <div className="expense-actions">
                                        <div className="expense-amount brand-font amount-green">
                                            +₹{parseFloat(item.amount).toFixed(2)}
                                        </div>
                                        <button
                                            className="delete-btn"
                                            onClick={() => deleteDeposit(item.id)}
                                            aria-label="Delete Deposit"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            );
                        }

                        // Expense row
                        const cat = getCategory(item.category);
                        const Icon = cat.icon;
                        return (
                            <div key={item.id} className="expense-item">
                                <div className="expense-icon-bg" style={{ backgroundColor: `${cat.color}18` }}>
                                    <Icon size={22} color={cat.color} />
                                </div>
                                <div className="expense-details">
                                    <h3 className="brand-font">{cat.label}</h3>
                                    <div className="expense-meta text-secondary">
                                        {format(parseISO(item.date), 'MMM dd, yyyy')}
                                        {item.note && ` • ${item.note}`}
                                    </div>
                                </div>
                                <div className="expense-actions">
                                    <div className="expense-amount brand-font text-red">
                                        -₹{parseFloat(item.amount).toFixed(2)}
                                    </div>
                                    <button
                                        className="delete-btn"
                                        onClick={() => deleteExpense(item.id)}
                                        aria-label="Delete Expense"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* FABs */}
            <div className="fab-group">
                <button className="fab fab-deposit brand-font" onClick={() => openModal('deposit')}>
                    <ArrowDownCircle size={18} /> Income
                </button>
                <button className="fab fab-expense brand-font" onClick={() => openModal('expense')}>
                    <Plus size={18} /> Expense
                </button>
            </div>

            {/* === ADD EXPENSE MODAL === */}
            <Modal
                isOpen={isModalOpen && modalMode === 'expense'}
                onClose={() => setIsModalOpen(false)}
                title="Add Expense"
            >
                <form onSubmit={handleSubmitExpense} className="expense-form">
                    <Input label="Amount (₹)" type="number" step="0.01" placeholder="0.00"
                        value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
                    <div className="nothing-input-container">
                        <label className="nothing-label">Category</label>
                        <select className="nothing-select border" value={category}
                            onChange={e => setCategory(e.target.value)}>
                            {expenseCategories.map(c => (
                                <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Date" type="date" value={date}
                        onChange={e => setDate(e.target.value)} required />
                    <Input label="Note" type="text" placeholder="Optional details"
                        value={note} onChange={e => setNote(e.target.value)} />
                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Save Expense
                    </Button>
                </form>
            </Modal>

            {/* === ADD DEPOSIT MODAL === */}
            <Modal
                isOpen={isModalOpen && modalMode === 'deposit'}
                onClose={() => setIsModalOpen(false)}
                title="Add Income / Deposit"
            >
                <form onSubmit={handleSubmitDeposit} className="expense-form">
                    <Input label="Amount (₹)" type="number" step="0.01" placeholder="0.00"
                        value={depAmount} onChange={e => setDepAmount(e.target.value)} required autoFocus />
                    <Input label="Source / Label" type="text" placeholder="e.g. Monthly Salary"
                        value={depLabel} onChange={e => setDepLabel(e.target.value)} />
                    <div className="nothing-input-container">
                        <label className="nothing-label">Category</label>
                        <select className="nothing-select border" value={depCategory}
                            onChange={e => setDepCategory(e.target.value)}>
                            {DEPOSIT_CATEGORIES.map(c => (
                                <option key={c.id} value={c.id}>{c.icon} {c.label}</option>
                            ))}
                        </select>
                    </div>
                    <Input label="Date" type="date" value={depDate}
                        onChange={e => setDepDate(e.target.value)} required />
                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Add Income
                    </Button>
                </form>
            </Modal>
            {/* === EXPORT MODAL === */}
            <Modal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                title="Export Excel Report"
            >
                <form onSubmit={handleExportExcel} className="expense-form">
                    <p className="text-secondary mb-4">Select a date range to generate a downloadable spreadsheet of your transactions.</p>
                    <Input label="From Date" type="date" value={exportFrom}
                        onChange={e => setExportFrom(e.target.value)} required />
                    <Input label="To Date" type="date" value={exportTo}
                        onChange={e => setExportTo(e.target.value)} required />
                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Download .xlsx
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
