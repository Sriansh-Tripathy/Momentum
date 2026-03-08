import React, { useState, useMemo } from 'react';
import Header from '../components/Layout/Header';
import Button from '../components/UI/Button';
import Input from '../components/UI/Input';
import Modal from '../components/UI/Modal';
import { useActivityContext, isCompleted } from '../store/ActivityContext';
import {
    format, startOfMonth, endOfMonth, eachDayOfInterval,
    isSameDay, isSameMonth, parseISO, addMonths, subMonths,
    getDay, isToday, isAfter, subDays
} from 'date-fns';
import { Plus, Trash2, Flame, ChevronLeft, ChevronRight, Sliders } from 'lucide-react';
import './Activities.css';

// ──────────────────────────────────────────────
// Calendar Grid
// ──────────────────────────────────────────────
function ActivityCalendar({ activities, logs, onSelectDay, selectedDate, viewMonth }) {
    const monthStart = startOfMonth(viewMonth);
    const monthEnd = endOfMonth(viewMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const leadingBlanks = (getDay(monthStart) + 6) % 7; // Monday-first

    const getDayStatus = (day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayLogs = logs[dateStr] || {};
        const doneCount = activities.filter(a => isCompleted(a, dayLogs[a.id])).length;
        if (activities.length === 0 || doneCount === 0) return 'none';
        if (doneCount >= activities.length) return 'full';
        return 'partial';
    };

    return (
        <div className="cal-wrapper">
            <div className="cal-grid cal-header-row">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                    <div key={i} className="cal-header-cell brand-font">{d}</div>
                ))}
            </div>
            <div className="cal-grid">
                {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} className="cal-day cal-day--blank" />
                ))}
                {days.map(day => {
                    const status = getDayStatus(day);
                    const isFuture = isAfter(day, new Date()) && !isToday(day);
                    const isSelected = isSameDay(day, selectedDate);
                    const isTodayDay = isToday(day);
                    return (
                        <button key={day.toISOString()} className={[
                            'cal-day',
                            isSelected ? 'cal-day--selected' : '',
                            isTodayDay ? 'cal-day--today' : '',
                            isFuture ? 'cal-day--future' : '',
                            status === 'full' ? 'cal-day--full' : '',
                            status === 'partial' ? 'cal-day--partial' : '',
                        ].join(' ')} onClick={() => !isFuture && onSelectDay(day)} disabled={isFuture}>
                            <span className="cal-day-num brand-font">{format(day, 'd')}</span>
                            {status !== 'none' && !isFuture && (
                                <div className={`cal-dot ${status === 'full' ? 'cal-dot--full' : 'cal-dot--partial'}`} />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ──────────────────────────────────────────────
// Range Activity Row — shows numeric input + progress bar
// ──────────────────────────────────────────────
function RangeActivityRow({ activity, logValue, dateStr, onLog }) {
    const currentVal = logValue != null ? parseFloat(logValue) : '';
    const done = isCompleted(activity, logValue);
    const pct = currentVal !== '' ? Math.min((currentVal / activity.goal) * 100, 100) : 0;
    const thresholdPct = (activity.threshold / activity.goal) * 100;

    const handleChange = (e) => {
        const v = e.target.value;
        onLog(dateStr, activity.id, v === '' ? null : parseFloat(v));
    };

    return (
        <div className={`range-item ${done ? 'done' : ''}`}>
            <span className="activity-emoji">{activity.icon}</span>
            <div className="range-details">
                <div className={`brand-font range-name ${done ? 'range-name--done' : ''}`}>
                    {activity.name.toUpperCase()}
                </div>
                <div className="range-bar-wrap">
                    <div className="threshold-marker" style={{ left: `${thresholdPct}%` }} />
                    <div className={`range-bar-fill ${done ? 'range-bar--done' : ''}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="range-meta brand-font text-secondary">
                    {currentVal !== '' ? currentVal : 0} / {activity.goal} {activity.unit}
                    {' · '}
                    <span className="threshold-label">≥{activity.threshold} to complete</span>
                    {done && <span className="done-label"> ✓</span>}
                </div>
            </div>
            <input
                type="number"
                className="range-input brand-font"
                min="0"
                max={activity.goal * 2}
                step="0.1"
                value={currentVal}
                placeholder="0"
                onChange={handleChange}
                onClick={e => e.stopPropagation()}
            />
        </div>
    );
}

// ──────────────────────────────────────────────
// Main Activities Page
// ──────────────────────────────────────────────
export default function Activities() {
    const { activities, logs, addActivity, deleteActivity, logActivity, toggleLog, getStreak } = useActivityContext();

    const [selectedDate, setSelectedDate] = useState(new Date());
    const [viewMonth, setViewMonth] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isManageMode, setIsManageMode] = useState(false);

    // Form state
    const [actType, setActType] = useState('boolean');
    const [name, setName] = useState('');
    const [icon, setIcon] = useState('📌');
    const [unit, setUnit] = useState('');
    const [goal, setGoal] = useState('');
    const [threshold, setThreshold] = useState('');

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dayLogs = logs[dateStr] || {};
    const doneCount = activities.filter(a => isCompleted(a, dayLogs[a.id])).length;

    const handleAdd = (e) => {
        e.preventDefault();
        if (!name) return;
        const base = { name, icon, type: actType };
        if (actType === 'range') {
            base.unit = unit || 'units';
            base.goal = parseFloat(goal) || 10;
            base.threshold = parseFloat(threshold) || parseFloat(goal) * 0.7;
        }
        addActivity(base);
        setIsModalOpen(false);
        setName(''); setIcon('📌'); setUnit(''); setGoal(''); setThreshold('');
    };

    const handleToggle = (activityId) => {
        if (isManageMode) return;
        toggleLog(dateStr, activityId);
    };

    return (
        <div className="activities-page">
            <Header title="Activities" />

            {/* Month nav */}
            <div className="cal-month-nav">
                <button className="cal-nav-btn" onClick={() => setViewMonth(m => subMonths(m, 1))}>
                    <ChevronLeft size={20} />
                </button>
                <span className="brand-font cal-month-label">
                    {format(viewMonth, 'MMMM yyyy').toUpperCase()}
                </span>
                <button className="cal-nav-btn"
                    onClick={() => setViewMonth(m => addMonths(m, 1))}
                    disabled={isSameMonth(viewMonth, new Date())}>
                    <ChevronRight size={20} />
                </button>
            </div>

            <ActivityCalendar
                activities={activities}
                logs={logs}
                selectedDate={selectedDate}
                viewMonth={viewMonth}
                onSelectDay={setSelectedDate}
            />

            {/* Selected day header */}
            <div className="selected-day-header">
                <div>
                    <span className="brand-font selected-day-label">
                        {isToday(selectedDate) ? '⬛ TODAY' : format(selectedDate, 'MMM dd, yyyy').toUpperCase()}
                    </span>
                    <span className="brand-font text-secondary day-progress">
                        {doneCount}/{activities.length} DONE
                    </span>
                </div>
                <Button variant={isManageMode ? 'primary' : 'outline'} size="sm"
                    onClick={() => setIsManageMode(!isManageMode)}>
                    {isManageMode ? 'Done' : 'Manage'}
                </Button>
            </div>

            {/* Activity list */}
            <div className="activities-list">
                {activities.length === 0 && (
                    <div className="empty-state brand-font text-secondary">NO ACTIVITIES YET.</div>
                )}

                {activities.map(activity => {
                    const logVal = dayLogs[activity.id];
                    const done = isCompleted(activity, logVal);
                    const streak = getStreak(activity.id);

                    if (activity.type === 'range') {
                        return (
                            <div key={activity.id} className="activity-item-wrap">
                                <RangeActivityRow
                                    activity={activity}
                                    logValue={logVal}
                                    dateStr={dateStr}
                                    onLog={logActivity}
                                />
                                {isManageMode && (
                                    <button className="delete-btn manage-delete"
                                        onClick={() => deleteActivity(activity.id)}>
                                        <Trash2 size={16} />
                                    </button>
                                )}
                                {streak > 1 && !isManageMode && (
                                    <div className="streak-badge brand-font inline-streak">
                                        <Flame size={11} /> {streak}d
                                    </div>
                                )}
                            </div>
                        );
                    }

                    // Boolean type
                    return (
                        <div key={activity.id} className={`activity-item ${done ? 'done' : ''}`}
                            onClick={() => handleToggle(activity.id)}>
                            <div className={`activity-check ${done ? 'activity-check--done' : ''}`}>
                                {done && <div className="check-square" />}
                            </div>
                            <span className="activity-emoji">{activity.icon}</span>
                            <div className="activity-details">
                                <span className={`brand-font activity-name ${done ? 'activity-name--done' : ''}`}>
                                    {activity.name.toUpperCase()}
                                </span>
                                {streak > 1 && !isManageMode && (
                                    <div className="streak-badge brand-font">
                                        <Flame size={11} /> {streak}d
                                    </div>
                                )}
                            </div>
                            {isManageMode && (
                                <button className="delete-btn"
                                    onClick={e => { e.stopPropagation(); deleteActivity(activity.id); }}>
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* FAB */}
            <button className="fab brand-font" onClick={() => setIsModalOpen(true)}>
                <Plus size={20} /> Activity
            </button>

            {/* Add Activity Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Activity">
                <form onSubmit={handleAdd} className="expense-form">
                    {/* Type selector */}
                    <div className="type-toggle brand-font">
                        <button type="button"
                            className={`type-btn ${actType === 'boolean' ? 'type-btn--active' : ''}`}
                            onClick={() => setActType('boolean')}>
                            ✓ TICK
                        </button>
                        <button type="button"
                            className={`type-btn ${actType === 'range' ? 'type-btn--active' : ''}`}
                            onClick={() => setActType('range')}>
                            <Sliders size={13} /> RANGE
                        </button>
                    </div>

                    <Input label="Activity Name" type="text" placeholder="e.g. Run, Read, Meditate"
                        value={name} onChange={e => setName(e.target.value)} required autoFocus />
                    <Input label="Emoji Icon" type="text" placeholder="🏃"
                        value={icon} onChange={e => setIcon(e.target.value)} maxLength={2} />

                    {actType === 'range' && (
                        <>
                            <Input label="Unit" type="text" placeholder="miles / glasses / pages"
                                value={unit} onChange={e => setUnit(e.target.value)} />
                            <Input label="Max / Full Goal" type="number" step="0.1" placeholder="e.g. 10"
                                value={goal} onChange={e => setGoal(e.target.value)} />
                            <Input label="Completion Threshold (≥ this = done)" type="number" step="0.1"
                                placeholder={`e.g. ${goal ? Math.round(parseFloat(goal) * 0.7) : 7}`}
                                value={threshold} onChange={e => setThreshold(e.target.value)} />
                        </>
                    )}

                    <Button type="submit" variant="primary" size="lg" className="w-full mt-4">
                        Create Activity
                    </Button>
                </form>
            </Modal>
        </div>
    );
}
