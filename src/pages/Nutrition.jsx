import React, { useState } from 'react';
import { format } from 'date-fns';
import { Plus, Flame, Utensils } from 'lucide-react';
import Header from '../components/Layout/Header';
import Card from '../components/UI/Card';
import Input from '../components/UI/Input';
import Button from '../components/UI/Button';
import { useNutritionContext } from '../store/NutritionContext';
import './Nutrition.css';

export default function Nutrition() {
    const { logs, targetCalories, setTarget, addCalories, logCalories } = useNutritionContext();
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    // Manual input states
    const [manualConsumed, setManualConsumed] = useState('');
    const [manualBurned, setManualBurned] = useState('');

    const currentDay = logs[date] || { consumed: 0, burned: 0 };
    const netCalories = currentDay.consumed - currentDay.burned;
    const remaining = targetCalories - netCalories;

    // Quick add presets
    const PRESETS_CONSUME = [100, 250, 500, 1000];
    const PRESETS_BURN = [100, 250, 500];

    const pct = Math.min(Math.max((netCalories / targetCalories) * 100, 0), 100);
    const isOver = netCalories > targetCalories;

    const handleManualLog = (type) => {
        if (type === 'consumed' && manualConsumed) {
            logCalories(date, 'consumed', currentDay.consumed + parseInt(manualConsumed));
            setManualConsumed('');
        } else if (type === 'burned' && manualBurned) {
            logCalories(date, 'burned', currentDay.burned + parseInt(manualBurned));
            setManualBurned('');
        }
    };

    return (
        <div className="nutrition-page">
            <Header title="Nutrition" />

            {/* Target Settings */}
            <div className="daily-selector">
                <input
                    type="date"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="date-picker brand-font"
                    max={format(new Date(), 'yyyy-MM-dd')}
                />
            </div>

            {/* Main Summary Card */}
            <Card className="nutrition-summary">
                <div className="net-calories-display brand-font">
                    <span className="net-label">NET CALORIES</span>
                    <span className={`net-value ${isOver ? 'text-red' : ''}`}>{netCalories}</span>
                    <span className="net-target">/ {targetCalories} kcal</span>
                </div>

                <div className="calorie-progress-wrap">
                    <div className="calorie-progress-bg">
                        <div
                            className={`calorie-progress-fill ${isOver ? 'fill-red' : 'fill-green'}`}
                            style={{ width: `${pct}%` }}
                        />
                    </div>
                    <div className="calorie-meta brand-font text-secondary">
                        {isOver ? (
                            <span className="text-red">{Math.abs(remaining)} over target</span>
                        ) : (
                            <span>{remaining} remaining</span>
                        )}
                    </div>
                </div>

                <div className="nutrition-breakdown brand-font">
                    <div className="breakdown-stat">
                        <Utensils size={16} />
                        <span>CONSUMED</span>
                        <strong>{currentDay.consumed}</strong>
                    </div>
                    <div className="breakdown-stat text-red">
                        <Flame size={16} />
                        <span>BURNED</span>
                        <strong>{currentDay.burned}</strong>
                    </div>
                </div>
            </Card>

            <div className="logging-grid">
                {/* Consumed Section */}
                <Card className="logging-card">
                    <h3 className="brand-font chart-title"><Utensils size={18} /> LOG FOOD (KCAL)</h3>
                    <div className="preset-grid">
                        {PRESETS_CONSUME.map(amt => (
                            <button
                                key={amt}
                                className="preset-btn brand-font"
                                onClick={() => addCalories(date, 'consumed', amt)}
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>
                    <div className="manual-entry">
                        <Input
                            type="number"
                            placeholder="Custom amount..."
                            value={manualConsumed}
                            onChange={e => setManualConsumed(e.target.value)}
                            min="0"
                        />
                        <Button onClick={() => handleManualLog('consumed')}>ADD</Button>
                    </div>
                </Card>

                {/* Burned Section */}
                <Card className="logging-card">
                    <h3 className="brand-font chart-title text-red"><Flame size={18} /> LOG BURNED (KCAL)</h3>
                    <div className="preset-grid">
                        {PRESETS_BURN.map(amt => (
                            <button
                                key={amt}
                                className="preset-btn preset-btn--burn brand-font"
                                onClick={() => addCalories(date, 'burned', amt)}
                            >
                                +{amt}
                            </button>
                        ))}
                    </div>
                    <div className="manual-entry">
                        <Input
                            type="number"
                            placeholder="Custom amount..."
                            value={manualBurned}
                            onChange={e => setManualBurned(e.target.value)}
                            min="0"
                        />
                        <Button variant="danger" onClick={() => handleManualLog('burned')}>ADD</Button>
                    </div>
                </Card>
            </div>

            {/* Target Config */}
            <Card className="target-config-card">
                <h3 className="brand-font chart-title">DAILY TARGET (KCAL)</h3>
                <div className="manual-entry">
                    <Input
                        type="number"
                        value={targetCalories}
                        onChange={e => setTarget(parseInt(e.target.value) || 2000)}
                        min="500"
                        step="50"
                    />
                </div>
            </Card>
        </div>
    );
}
