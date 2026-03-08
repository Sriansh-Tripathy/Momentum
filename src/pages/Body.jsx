import React, { useState } from 'react';
import {
    Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { format, subDays, eachDayOfInterval } from 'date-fns';
import { Scale, Moon } from 'lucide-react';
import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';
import { useBodyContext } from '../store/BodyContext';
import './Nutrition.css'; // reusing some layout styles

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const CHART_FONT = { family: 'Space Mono', size: 10 };
const AXIS_COLOR = '#000000';
const axisStyle = {
    ticks: { color: AXIS_COLOR, font: CHART_FONT },
    grid: { color: 'rgba(0,0,0,0.06)' },
    border: { color: AXIS_COLOR, width: 2 },
};

export default function Body() {
    const { logs, logMetric } = useBodyContext();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const currentDay = logs[date] || {};

    // 30 day history
    const days = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
    const labels = days.map(d => format(d, 'MMM dd'));

    // Weight Chart
    const weightData = days.map(d => logs[format(d, 'yyyy-MM-dd')]?.weight ?? null);
    const hasWeightData = weightData.some(w => w !== null);

    const weightChartData = {
        labels,
        datasets: [{
            label: 'Weight (kg)',
            data: weightData,
            borderColor: '#111111',
            backgroundColor: 'transparent',
            tension: 0.3,
            pointRadius: 4,
            spanGaps: true,
            borderWidth: 2
        }]
    };

    // Sleep Chart
    const sleepData = days.map(d => logs[format(d, 'yyyy-MM-dd')]?.sleep ?? null);
    const hasSleepData = sleepData.some(s => s !== null);

    const sleepChartData = {
        labels,
        datasets: [{
            label: 'Sleep (hours)',
            data: sleepData,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            spanGaps: true,
            borderWidth: 2
        }]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: '#000', titleColor: '#fff', bodyColor: '#eee', titleFont: CHART_FONT, bodyFont: CHART_FONT }
        },
        scales: {
            x: { ...axisStyle, grid: { display: false } },
            y: { ...axisStyle }
        }
    };

    return (
        <div className="nutrition-page body-page">
            <Header title="Body Metrics" />

            {/* Daily Selector */}
            <div className="daily-selector">
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="date-picker brand-font"
                    max={format(new Date(), 'yyyy-MM-dd')}
                />
            </div>

            <div className="logging-grid">
                {/* Weight Input */}
                <Card className="logging-card">
                    <h3 className="brand-font chart-title"><Scale size={18} /> LOG WEIGHT (KG)</h3>
                    <div style={{ marginTop: 12 }}>
                        <Input
                            type="number"
                            placeholder="e.g. 70.5"
                            value={currentDay.weight || ''}
                            onChange={e => logMetric(date, 'weight', e.target.value)}
                            min="0"
                            step="0.1"
                        />
                    </div>
                </Card>

                {/* Sleep Input */}
                <Card className="logging-card">
                    <h3 className="brand-font chart-title text-blue" style={{ color: '#3b82f6' }}><Moon size={18} /> LOG SLEEP (HOURS)</h3>
                    <div style={{ marginTop: 12 }}>
                        <Input
                            type="number"
                            placeholder="e.g. 7.5"
                            value={currentDay.sleep || ''}
                            onChange={e => logMetric(date, 'sleep', e.target.value)}
                            min="0"
                            max="24"
                            step="0.5"
                        />
                    </div>
                </Card>
            </div>

            {/* Trends */}
            <Card className="chart-card">
                <h3 className="brand-font chart-title"><Scale size={16} /> WEIGHT TREND (30 DAYS)</h3>
                {!hasWeightData ? (
                    <p className="brand-font text-secondary" style={{ fontSize: '0.65rem' }}>No weight data logged yet.</p>
                ) : (
                    <div className="chart-container" style={{ height: 220 }}>
                        <Line data={weightChartData} options={chartOptions} />
                    </div>
                )}
            </Card>

            <Card className="chart-card">
                <h3 className="brand-font chart-title" style={{ color: '#3b82f6' }}><Moon size={16} /> SLEEP TREND (30 DAYS)</h3>
                {!hasSleepData ? (
                    <p className="brand-font text-secondary" style={{ fontSize: '0.65rem' }}>No sleep data logged yet.</p>
                ) : (
                    <div className="chart-container" style={{ height: 220 }}>
                        <Line data={sleepChartData} options={chartOptions} />
                    </div>
                )}
            </Card>
        </div>
    );
}
