/**
 * ML Expense Predictor — Client-Side Weighted Least Squares Regression
 *
 * Algorithm:
 *   1. Group historical expenses by (month, category)
 *   2. For each category: fit a weighted linear regression over the last 6 months
 *      - Recent months get exponentially higher weights
 *      - This captures both trend direction and recency
 *   3. Project each category to end-of-month
 *   4. Scale projection by day-of-month fraction
 *   5. Detect spikes and clamp outliers
 *   6. Sum all category predictions → total monthly prediction
 */

import { format, parseISO, startOfMonth, differenceInMonths, getDaysInMonth, getDate } from 'date-fns';

/**
 * Weighted Least Squares linear regression
 * y = a + b*x weighted by w[]
 * @param {Array<{x: number, y: number, w: number}>} pts
 * @returns {{ slope: number, intercept: number }}
 */
function wls(pts) {
    if (pts.length < 2) {
        return { slope: 0, intercept: pts.length === 1 ? pts[0].y : 0 };
    }

    let wSum = 0, wxSum = 0, wySum = 0, wxxSum = 0, wxySum = 0;
    for (const { x, y, w } of pts) {
        wSum += w;
        wxSum += w * x;
        wySum += w * y;
        wxxSum += w * x * x;
        wxySum += w * x * y;
    }
    const det = wSum * wxxSum - wxSum * wxSum;
    if (Math.abs(det) < 1e-10) {
        return { slope: 0, intercept: wySum / wSum };
    }
    const slope = (wSum * wxySum - wxSum * wySum) / det;
    const intercept = (wySum - slope * wxSum) / wSum;
    return { slope, intercept };
}

/**
 * Groups expenses by month-string ('yyyy-MM') then by category
 * @param {Array} expenses
 * @returns {Object} { 'yyyy-MM': { category: totalAmount } }
 */
function groupByMonthCategory(expenses) {
    const grouped = {};
    for (const e of expenses) {
        try {
            const month = format(parseISO(e.date), 'yyyy-MM');
            if (!grouped[month]) grouped[month] = {};
            grouped[month][e.category] = (grouped[month][e.category] || 0) + e.amount;
        } catch (_) { /* skip malformed dates */ }
    }
    return grouped;
}

/**
 * Extrapolate current month's spending to end-of-month
 * based on current day progress.
 * @param {number} spentSoFar
 * @returns {number} projected end-of-month total
 */
function projectCurrentMonth(spentSoFar) {
    const today = new Date();
    const dayOfMonth = getDate(today);
    const daysInMonth = getDaysInMonth(today);
    // Only project if we are at least 3 days in (avoid divide-by-zero and huge early spikes)
    if (dayOfMonth < 3) return spentSoFar;
    return (spentSoFar / dayOfMonth) * daysInMonth;
}

/**
 * Main exported function
 * @param {Array} expenses - all historical expenses
 * @param {Array} recurringPayments - optional recurring (currently unused by ML layer)
 * @returns {number} predicted end-of-month spend (₹)
 */
export function predictMonthlyExpenses(expenses, recurringPayments = []) {
    if (!expenses || expenses.length === 0) return 0;

    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');

    const grouped = groupByMonthCategory(expenses);

    // Get all unique categories across all months
    const allCategories = new Set();
    for (const month of Object.values(grouped)) {
        for (const cat of Object.keys(month)) allCategories.add(cat);
    }

    // Sort month keys chronologically, take last 7 (6 hist + current)
    const allMonths = Object.keys(grouped).sort();
    const recentMonths = allMonths.slice(-7);

    // For each category, run WLS over historical months (excluding current)
    let totalPrediction = 0;

    for (const cat of allCategories) {
        // Build historical data points (exclude current month)
        const histPoints = recentMonths
            .filter(m => m !== currentMonthKey)
            .map((m, idx) => {
                const y = grouped[m]?.[cat] || 0;
                // Exponential weight — last month gets weight 4, further back decays
                const w = Math.pow(1.8, idx);
                return { x: idx, y, w };
            });

        let prediction;

        if (histPoints.length >= 2) {
            const { slope, intercept } = wls(histPoints);
            const nextX = histPoints.length; // next month position
            prediction = Math.max(0, intercept + slope * nextX);
        } else if (histPoints.length === 1) {
            prediction = histPoints[0].y;
        } else {
            prediction = 0;
        }

        // If we have current month data, blend ML prediction with day-projected actual
        if (grouped[currentMonthKey]?.[cat]) {
            const currentActual = grouped[currentMonthKey][cat];
            const dayProjected = projectCurrentMonth(currentActual);
            // Blend: 60% ML forecast + 40% day-projected actual
            // This makes prediction more responsive to real spending
            prediction = prediction * 0.6 + dayProjected * 0.4;
        }

        // Spike detector: if prediction > 3x any single historical month, cap it
        const histValues = histPoints.map(p => p.y).filter(v => v > 0);
        if (histValues.length > 0) {
            const maxHist = Math.max(...histValues);
            prediction = Math.min(prediction, maxHist * 2.5);
        }

        totalPrediction += prediction;
    }

    // Floor: if we have current month data and prediction is lower than projected actual,
    // use projected actual as floor
    const currentMonthTotal = Object.values(grouped[currentMonthKey] || {}).reduce((s, v) => s + v, 0);
    const dayProjectedTotal = projectCurrentMonth(currentMonthTotal);
    if (dayProjectedTotal > totalPrediction && currentMonthTotal > 0) {
        totalPrediction = dayProjectedTotal;
    }

    return Math.round(totalPrediction);
}

/**
 * Returns per-category ML predictions for Analytics page
 * @param {Array} expenses
 * @returns {Array<{category, predicted, actual}>}
 */
export function getCategoryPredictions(expenses) {
    if (!expenses || expenses.length === 0) return [];

    const now = new Date();
    const currentMonthKey = format(now, 'yyyy-MM');
    const grouped = groupByMonthCategory(expenses);
    const allCategories = new Set();
    for (const month of Object.values(grouped)) {
        for (const cat of Object.keys(month)) allCategories.add(cat);
    }

    const allMonths = Object.keys(grouped).sort();
    const recentMonths = allMonths.slice(-7);

    const results = [];

    for (const cat of allCategories) {
        const histPoints = recentMonths
            .filter(m => m !== currentMonthKey)
            .map((m, idx) => ({
                x: idx,
                y: grouped[m]?.[cat] || 0,
                w: Math.pow(1.8, idx)
            }));

        let prediction = 0;
        if (histPoints.length >= 2) {
            const { slope, intercept } = wls(histPoints);
            prediction = Math.max(0, intercept + slope * histPoints.length);
        } else if (histPoints.length === 1) {
            prediction = histPoints[0].y;
        }

        const currentActual = grouped[currentMonthKey]?.[cat] || 0;
        if (currentActual > 0) {
            const dayProjected = projectCurrentMonth(currentActual);
            prediction = prediction * 0.6 + dayProjected * 0.4;
        }

        results.push({
            category: cat,
            predicted: Math.round(prediction),
            actual: currentActual,
        });
    }

    return results.sort((a, b) => b.predicted - a.predicted);
}
