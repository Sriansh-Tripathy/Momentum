import React, { useMemo, useState } from 'react';
import {
    Chart as ChartJS, ArcElement, Tooltip, Legend,
    CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';
import { useExpenseContext } from '../store/ExpenseContext';
import { useActivityContext } from '../store/ActivityContext';
import { useNutritionContext } from '../store/NutritionContext';
import { useBodyContext } from '../store/BodyContext';
import { expenseCategories } from '../utils/categories';
import { predictMonthlyExpenses, getCategoryPredictions } from '../utils/mlPredictor';
import { findTopCorrelations } from '../utils/correlations';
import { format, parseISO, isSameMonth, subDays, eachDayOfInterval } from 'date-fns';
import { Flame, Sparkles } from 'lucide-react';
import './Analytics.css';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

// Shared chart axis/font styles
const CHART_FONT = { family: 'Space Mono', size: 10 };
const AXIS_COLOR = '#000000';
const axisStyle = {
    ticks: { color: AXIS_COLOR, font: CHART_FONT },
    grid: { color: 'rgba(0,0,0,0.06)' },
    border: { color: AXIS_COLOR, width: 2 },
};

// ──────────────────────────────────────────────
// TAB 1 — Overview (ML prediction + bar charts + activity stats)
// ──────────────────────────────────────────────
function OverviewTab({ expenses, activities, getCompletionStats, getStreak }) {
    const currentMonthExpenses = expenses.filter(e => isSameMonth(parseISO(e.date), new Date()));
    const totalSpent = currentMonthExpenses.reduce((acc, curr) => acc + curr.amount, 0);

    const predictedTotal = useMemo(() => predictMonthlyExpenses(expenses), [expenses]);
    const categoryPredictions = useMemo(() => getCategoryPredictions(expenses), [expenses]);

    const dailyTotals = {};
    currentMonthExpenses.forEach(e => {
        const day = format(parseISO(e.date), 'dd');
        dailyTotals[day] = (dailyTotals[day] || 0) + e.amount;
    });
    const sortedDays = Object.keys(dailyTotals).sort((a, b) => parseInt(a) - parseInt(b));

    const barData = {
        labels: sortedDays.map(d => `${d}`),
        datasets: [{
            label: 'Daily (₹)',
            data: sortedDays.map(d => dailyTotals[d]),
            backgroundColor: '#111111',
            borderWidth: 0,
            borderRadius: 0,
        }]
    };

    const barOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => `₹${ctx.parsed.y.toFixed(0)}` } } },
        scales: { x: { ...axisStyle, grid: { display: false } }, y: axisStyle }
    };

    const topCategories = categoryPredictions.slice(0, 6);
    const catBarData = {
        labels: topCategories.map(c => {
            const cat = expenseCategories.find(x => x.id === c.category);
            return (cat?.label || c.category).toUpperCase();
        }),
        datasets: [
            { label: 'Actual', data: topCategories.map(c => c.actual), backgroundColor: '#111111', borderWidth: 0 },
            { label: 'ML Predicted', data: topCategories.map(c => c.predicted), backgroundColor: 'rgba(215,25,33,0.7)', borderColor: '#D71921', borderWidth: 2 }
        ]
    };
    const catBarOptions = {
        ...barOptions,
        plugins: { ...barOptions.plugins, legend: { display: true, labels: { color: '#000', font: CHART_FONT } } }
    };

    const isOverBudget = predictedTotal > 0 && totalSpent > predictedTotal;
    const pctUsed = predictedTotal > 0 ? Math.min((totalSpent / predictedTotal) * 100, 100) : 0;

    return (
        <>
            {/* ML Banner */}
            <div className={`prediction-banner brand-font ${isOverBudget ? 'prediction-banner--danger' : ''}`}>
                <div className="prediction-label">ML PREDICTED END-OF-MONTH</div>
                <div className="prediction-value">₹{predictedTotal.toLocaleString('en-IN')}</div>
                <div className="prediction-bar"><div className="prediction-bar-fill" style={{ width: `${pctUsed}%` }} /></div>
                <div className="prediction-sub">
                    ₹{totalSpent.toLocaleString('en-IN')} spent so far
                    {isOverBudget && ' · ⚠ ON PACE TO OVERSPEND'}
                </div>
            </div>

            {/* Stats row */}
            <div className="analytics-stats-row">
                <Card className="padding-normal">
                    <div className="stat-label brand-font">THIS MONTH</div>
                    <div className="total-amount brand-font">₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</div>
                </Card>
                <Card className="padding-normal">
                    <div className="stat-label brand-font">AVG/DAY</div>
                    <div className="total-amount brand-font">
                        ₹{currentMonthExpenses.length > 0 ? Math.round(totalSpent / new Date().getDate()).toLocaleString('en-IN') : '0'}
                    </div>
                </Card>
            </div>

            {expenses.length > 0 && (
                <>
                    <Card className="chart-card">
                        <h3 className="brand-font chart-title">DAILY SPENDING</h3>
                        <div className="chart-container bar-container">
                            <Bar data={barData} options={barOptions} />
                        </div>
                    </Card>

                    {topCategories.length > 0 && (
                        <Card className="chart-card">
                            <h3 className="brand-font chart-title">ACTUAL VS ML PREDICTED — BY CATEGORY</h3>
                            <div className="chart-container" style={{ height: 200 }}>
                                <Bar data={catBarData} options={catBarOptions} />
                            </div>
                        </Card>
                    )}

                    {topCategories.length > 0 && (
                        <Card>
                            <h3 className="brand-font chart-title">CATEGORY BREAKDOWN</h3>
                            <div className="category-table">
                                {topCategories.map((c, i) => {
                                    const cat = expenseCategories.find(x => x.id === c.category);
                                    const overPred = c.actual > c.predicted && c.predicted > 0;
                                    return (
                                        <div key={i} className="cat-row">
                                            <div className="cat-info">
                                                <span className="brand-font cat-name">{cat?.label?.toUpperCase() || c.category.toUpperCase()}</span>
                                            </div>
                                            <div className="cat-bar-wrap">
                                                <div className="cat-actual-bar" style={{ width: `${Math.min((c.actual / (c.predicted || c.actual || 1)) * 100, 120)}%` }} />
                                            </div>
                                            <div className={`brand-font cat-amounts ${overPred ? 'text-red' : ''}`}>
                                                ₹{c.actual.toLocaleString('en-IN', { maximumFractionDigits: 0 })} / ₹{c.predicted.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    )}
                </>
            )}

            {/* Activity Stats */}
            {activities.length > 0 && (
                <Card>
                    <h3 className="brand-font chart-title">ACTIVITY STATS — LAST 30 DAYS</h3>
                    <div className="category-table">
                        {activities.map(activity => {
                            const stats = getCompletionStats(activity.id, 30);
                            const streak = getStreak(activity.id);
                            const isRange = activity.type === 'range';
                            const loggedValues = stats.values.filter(v => v.value != null).map(v => parseFloat(v.value));
                            const avgValue = loggedValues.length
                                ? (loggedValues.reduce((s, v) => s + v, 0) / loggedValues.length).toFixed(1)
                                : null;

                            return (
                                <div key={activity.id} className="act-stat-row">
                                    <div className="act-stat-info">
                                        <span className="act-stat-icon">{activity.icon}</span>
                                        <div>
                                            <div className="brand-font cat-name">{activity.name.toUpperCase()}</div>
                                            <div className="brand-font text-secondary" style={{ fontSize: '0.6rem', letterSpacing: '0.08em' }}>
                                                {isRange
                                                    ? (avgValue != null ? `AVG ${avgValue} ${activity.unit} · GOAL ≥${activity.threshold}` : 'NO DATA')
                                                    : `${stats.completed}/${stats.total} DAYS`}
                                                {streak > 1 && <span className="act-streak"><Flame size={10} /> {streak}d</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="cat-bar-wrap">
                                        <div
                                            className={`cat-actual-bar ${stats.rate >= 70 ? 'bar-good' : stats.rate >= 40 ? 'bar-mid' : 'bar-low'}`}
                                            style={{ width: `${stats.rate}%` }}
                                        />
                                    </div>
                                    <div className="brand-font cat-amounts">{stats.rate}%</div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}
        </>
    );
}

// ──────────────────────────────────────────────
// TAB 2 — Trends (line graphs: daily expenses + range activities)
// ──────────────────────────────────────────────
function TrendsTab({ expenses, activities, logs }) {
    // Last 30 days
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    const labels = days.map(d => format(d, 'MMM dd'));

    // Daily expense totals
    const dailyExpenses = days.map(day => {
        const ds = format(day, 'yyyy-MM-dd');
        return expenses
            .filter(e => e.date === ds)
            .reduce((sum, e) => sum + e.amount, 0);
    });

    // Range activities — one line each
    const rangeActivities = activities.filter(a => a.type === 'range');

    // Colour palette for range lines
    const PALETTE = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899', '#6366f1'];

    const lineDatasets = [
        {
            label: 'Daily Spend (₹)',
            data: dailyExpenses,
            borderColor: '#111111',
            backgroundColor: 'rgba(17,17,17,0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            yAxisID: 'yMoney',
        },
        ...rangeActivities.map((a, i) => ({
            label: `${a.name} (${a.unit})`,
            data: days.map(d => {
                const ds = format(d, 'yyyy-MM-dd');
                const v = logs?.[ds]?.[a.id];
                return v != null ? parseFloat(v) : null;
            }),
            borderColor: PALETTE[i % PALETTE.length],
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.35,
            pointRadius: 3,
            pointHoverRadius: 5,
            spanGaps: true,
            yAxisID: 'yActivity',
            borderDash: [4, 3],
        }))
    ];

    const lineData = { labels, datasets: lineDatasets };

    const lineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: {
                display: true,
                labels: { color: '#000', font: CHART_FONT, boxWidth: 12, padding: 12 }
            },
            tooltip: { backgroundColor: '#000', titleColor: '#fff', bodyColor: '#eee' }
        },
        scales: {
            x: {
                ticks: {
                    color: AXIS_COLOR,
                    font: CHART_FONT,
                    maxTicksLimit: 10,
                    maxRotation: 45,
                },
                grid: { display: false },
                border: { color: AXIS_COLOR, width: 2 }
            },
            yMoney: {
                type: 'linear',
                position: 'left',
                ticks: { color: AXIS_COLOR, font: CHART_FONT, callback: v => `₹${v}` },
                grid: { color: 'rgba(0,0,0,0.06)' },
                border: { color: AXIS_COLOR, width: 2 },
                title: { display: true, text: 'SPEND (₹)', color: AXIS_COLOR, font: CHART_FONT }
            },
            ...(rangeActivities.length > 0 ? {
                yActivity: {
                    type: 'linear',
                    position: 'right',
                    ticks: { color: AXIS_COLOR, font: CHART_FONT },
                    grid: { drawOnChartArea: false },
                    border: { color: AXIS_COLOR, width: 2 },
                    title: { display: true, text: 'ACTIVITY VALUE', color: AXIS_COLOR, font: CHART_FONT }
                }
            } : {})
        }
    };

    // Boolean completion heatmap — last 30 days
    const boolActivities = activities.filter(a => !a.type || a.type === 'boolean');

    return (
        <>
            <Card className="chart-card" style={{ height: 'auto' }}>
                <h3 className="brand-font chart-title">30-DAY TRENDS — SPEND + RANGE ACTIVITIES</h3>
                {rangeActivities.length === 0 && (
                    <p className="brand-font text-secondary" style={{ fontSize: '0.65rem', marginBottom: 8 }}>
                        Add RANGE activities to see them plotted here alongside spending.
                    </p>
                )}
                <div className="chart-container" style={{ height: 260 }}>
                    <Line data={lineData} options={lineOptions} />
                </div>
            </Card>

            {boolActivities.length > 0 && (
                <Card>
                    <h3 className="brand-font chart-title">30-DAY COMPLETION — BOOLEAN ACTIVITIES</h3>
                    <div className="heatmap-grid">
                        {boolActivities.map(activity => (
                            <div key={activity.id} className="heatmap-row">
                                <span className="heatmap-label brand-font">{activity.icon} {activity.name.toUpperCase()}</span>
                                <div className="heatmap-cells">
                                    {days.map(day => {
                                        const ds = format(day, 'yyyy-MM-dd');
                                        const v = logs?.[ds]?.[activity.id];
                                        const done = v === true;
                                        return (
                                            <div
                                                key={ds}
                                                className={`heatmap-cell ${done ? 'heatmap-cell--done' : ''}`}
                                                title={`${format(day, 'MMM dd')}: ${done ? '✓' : '—'}`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}
        </>
    );
}

// ──────────────────────────────────────────────
// TAB 3 — Insights (Cross-Domain Correlations)
// ──────────────────────────────────────────────
function InsightsTab({ expenses, activities, activityLogs, nutritionLogs, bodyLogs }) {
    // 30 day window
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    const dateStrings = days.map(d => format(d, 'yyyy-MM-dd'));

    const datasets = useMemo(() => {
        const ds = [];

        // 1. Daily Expenses
        const dailySpend = {};
        dateStrings.forEach(ds => dailySpend[ds] = 0);
        expenses.forEach(e => { if (dailySpend[e.date] !== undefined) dailySpend[e.date] += e.amount; });
        ds.push({ id: 'metric_spend', name: 'Daily Spend', category: 'Finance', dailyValues: dailySpend });

        // 2. Range Activities
        activities.filter(a => a.type === 'range').forEach(a => {
            const vals = {};
            dateStrings.forEach(ds => {
                const v = activityLogs?.[ds]?.[a.id];
                vals[ds] = v != null ? parseFloat(v) : 0;
            });
            ds.push({ id: `act_${a.id}`, name: a.name, category: 'Habits', dailyValues: vals });
        });

        // 3. Nutrition (Consumed & Burned)
        const valsConsumed = {};
        const valsBurned = {};
        dateStrings.forEach(ds => {
            valsConsumed[ds] = nutritionLogs?.[ds]?.consumed || 0;
            valsBurned[ds] = nutritionLogs?.[ds]?.burned || 0;
        });
        ds.push({ id: 'metric_calories_in', name: 'Calories Consumed', category: 'Health', dailyValues: valsConsumed });
        ds.push({ id: 'metric_calories_out', name: 'Calories Burned', category: 'Health', dailyValues: valsBurned });

        // 4. Body (Weight & Sleep)
        const valsWeight = {};
        const valsSleep = {};
        dateStrings.forEach(ds => {
            valsWeight[ds] = bodyLogs?.[ds]?.weight || 0;
            valsSleep[ds] = bodyLogs?.[ds]?.sleep || 0;
        });
        ds.push({ id: 'metric_weight', name: 'Weight', category: 'Body', dailyValues: valsWeight });
        ds.push({ id: 'metric_sleep', name: 'Sleep', category: 'Body', dailyValues: valsSleep });

        return ds;
    }, [expenses, activities, activityLogs, nutritionLogs, bodyLogs, dateStrings]);

    const correlations = useMemo(() => findTopCorrelations(datasets, dateStrings).slice(0, 5), [datasets, dateStrings]);

    return (
        <Card>
            <h3 className="brand-font chart-title"><Sparkles size={16} /> AI DISCOVERIES (LAST 30 DAYS)</h3>

            {correlations.length === 0 ? (
                <div className="empty-state brand-font text-secondary">
                    Not enough varied data yet to find correlations across different metrics. Keep logging!
                </div>
            ) : (
                <div className="insights-list">
                    {correlations.map((c, i) => (
                        <div key={i} className="insight-card">
                            <div className="insight-header brand-font">
                                <span>{c.ds1.name.toUpperCase()}</span>
                                <span className="insight-vs">↔</span>
                                <span>{c.ds2.name.toUpperCase()}</span>
                            </div>
                            <div className="insight-body">
                                <div className="insight-meaning">{c.interpretation}</div>
                                <div className="insight-score brand-font">
                                    Strength: {Math.round(c.absStrength * 100)}%
                                    <span className={c.correlation > 0 ? 'text-green' : 'text-red'}>
                                        ({c.correlation > 0 ? 'Positive' : 'Inverse'})
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Card>
    );
}

// ──────────────────────────────────────────────
// Main Analytics Page
// ──────────────────────────────────────────────
export default function Analytics() {
    const { expenses } = useExpenseContext();
    const { activities, logs: activityLogs, getCompletionStats, getStreak } = useActivityContext();
    const { logs: nutritionLogs } = useNutritionContext();
    const { logs: bodyLogs } = useBodyContext();

    const [tab, setTab] = useState('overview');

    return (
        <div className="analytics-page">
            <Header title="Analytics" />

            {/* Tab switcher */}
            <div className="analytics-tabs brand-font">
                <button className={`analytics-tab ${tab === 'overview' ? 'analytics-tab--active' : ''}`}
                    onClick={() => setTab('overview')}>OVERVIEW</button>
                <button className={`analytics-tab ${tab === 'trends' ? 'analytics-tab--active' : ''}`}
                    onClick={() => setTab('trends')}>TRENDS</button>
                <button className={`analytics-tab ${tab === 'insights' ? 'analytics-tab--active' : ''}`}
                    onClick={() => setTab('insights')}>INSIGHTS</button>
            </div>

            {tab === 'overview' && (
                <OverviewTab
                    expenses={expenses} activities={activities}
                    getCompletionStats={getCompletionStats} getStreak={getStreak}
                />
            )}

            {tab === 'trends' && (
                <TrendsTab
                    expenses={expenses} activities={activities} logs={activityLogs}
                />
            )}

            {tab === 'insights' && (
                <InsightsTab
                    expenses={expenses}
                    activities={activities}
                    activityLogs={activityLogs}
                    nutritionLogs={nutritionLogs}
                    bodyLogs={bodyLogs}
                />
            )}
        </div>
    );
}
