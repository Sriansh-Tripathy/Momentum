import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import Toggle from '../components/UI/Toggle';
import { useAlarmContext } from '../store/AlarmContext';
import { useExpenseContext } from '../store/ExpenseContext';
import { Plus, Trash2, Bell, AlertTriangle } from 'lucide-react';
import { requestNotificationPermission } from '../utils/notifications';
import { isSameMonth, parseISO } from 'date-fns';
import './Alarms.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Alarms() {
    const { alarms, addAlarm, deleteAlarm, toggleAlarm, budgetLimit, setBudgetLimit } = useAlarmContext();
    const { expenses } = useExpenseContext();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [permissionStatus, setPermissionStatus] = useState('default');

    // Alarm Form
    const [title, setTitle] = useState('');
    const [time, setTime] = useState('08:00');
    const [selectedDays, setSelectedDays] = useState([]); // array 0-6

    // Budget Form
    const [limitInput, setLimitInput] = useState(budgetLimit?.toString() || '');

    useEffect(() => {
        if ('Notification' in window) {
            setPermissionStatus(Notification.permission);
        }
    }, []);

    const handleRequestPermission = async () => {
        const granted = await requestNotificationPermission();
        setPermissionStatus(granted ? 'granted' : 'denied');
    };

    const handleAddAlarm = (e) => {
        e.preventDefault();
        if (!title || !time) return;

        addAlarm({
            title,
            time,
            days: selectedDays,
            isActive: true
        });

        setIsModalOpen(false);
        setTitle('');
        setTime('08:00');
        setSelectedDays([]);
    };

    const toggleDaySelection = (dayIndex) => {
        if (selectedDays.includes(dayIndex)) {
            setSelectedDays(selectedDays.filter(d => d !== dayIndex));
        } else {
            setSelectedDays([...selectedDays, dayIndex]);
        }
    };

    const handleSaveBudget = () => {
        const val = parseFloat(limitInput);
        if (!isNaN(val) && val > 0) {
            setBudgetLimit(val);
        } else {
            setBudgetLimit(null);
        }
    };

    // Budget calculations
    const currentMonthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), new Date()));
    const totalSpent = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    const isOverBudget = budgetLimit && totalSpent > budgetLimit;

    return (
        <div className="alarms-page">
            <Header title="Alerts & Limits" />

            {permissionStatus !== 'granted' && (
                <Card className="permission-card padding-normal border-warning">
                    <div className="flex-center mb-4 text-warning">
                        <AlertTriangle size={24} className="mr-2" />
                        <h3 className="brand-font m-0">NOTIFICATIONS OFF</h3>
                    </div>
                    <p className="text-secondary text-center mb-4">
                        Alarms and budget alerts require browser notifications to function correctly outside of this tab.
                    </p>
                    <Button variant="outline" className="w-full" onClick={handleRequestPermission}>
                        Enable Notifications
                    </Button>
                </Card>
            )}

            {/* Budget Limit Section */}
            <Card className="budget-limit-card padding-normal">
                <h3 className="brand-font mb-4 flex-center">
                    <Bell size={18} className="mr-2" /> MONTHLY BUDGET ALERT
                </h3>

                <div className="budget-input-group">
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="Set a hard limit (e.g. 2000)"
                        value={limitInput}
                        onChange={(e) => setLimitInput(e.target.value)}
                    />
                    <Button variant="secondary" onClick={handleSaveBudget}>Save</Button>
                </div>

                {budgetLimit && (
                    <div className={`budget-status ${isOverBudget ? 'text-red' : 'text-success'} mt-4 brand-font text-center`}>
                        {isOverBudget
                            ? `OVER BUDGET BY $${(totalSpent - budgetLimit).toFixed(2)}`
                            : `$${(budgetLimit - totalSpent).toFixed(2)} REMAINING`}
                    </div>
                )}
            </Card>

            <h3 className="brand-font text-secondary mt-6 mb-2">CUSTOM ALARMS</h3>

            <div className="alarms-list">
                {alarms.length === 0 ? (
                    <div className="empty-state text-secondary brand-font">NO ALARMS SET.</div>
                ) : (
                    alarms.map(alarm => (
                        <Card key={alarm.id} className={`alarm-item ${!alarm.isActive ? 'inactive' : ''}`}>
                            <div className="alarm-main">
                                <div className="alarm-time brand-font text-primary">{alarm.time}</div>
                                <div className="alarm-title text-secondary">{alarm.title}</div>
                                <div className="alarm-days text-tertiary">
                                    {alarm.days.length === 0 || alarm.days.length === 7
                                        ? 'Everyday'
                                        : alarm.days.map(d => DAYS[d]).join(', ')}
                                </div>
                            </div>
                            <div className="alarm-actions">
                                <Toggle
                                    checked={alarm.isActive}
                                    onChange={() => toggleAlarm(alarm.id)}
                                />
                                <button className="icon-btn text-red mt-2" onClick={() => deleteAlarm(alarm.id)}>
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            <button className="fab brand-font" onClick={() => setIsModalOpen(true)}>
                <Plus size={24} /> Add
            </button>

            {/* Add Alarm Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Alarm">
                <form onSubmit={handleAddAlarm} className="expense-form">
                    <Input
                        type="time"
                        label="Time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                        className="time-input"
                    />

                    <Input
                        type="text"
                        label="Alarm Title"
                        placeholder="e.g. Take meds, Workout"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        autoFocus
                    />

                    <div className="nothing-input-container">
                        <label className="nothing-label">Repeat Days (Empty = Everyday)</label>
                        <div className="days-selector">
                            {DAYS.map((day, index) => (
                                <button
                                    key={day}
                                    type="button"
                                    className={`day-btn brand-font ${selectedDays.includes(index) ? 'active' : ''}`}
                                    onClick={() => toggleDaySelection(index)}
                                >
                                    {day[0]}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Save Alarm
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
