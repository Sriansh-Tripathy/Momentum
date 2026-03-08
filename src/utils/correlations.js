/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 * Returns a value between -1 and 1.
 * 1 = perfect positive correlation
 * 0 = no correlation
 * -1 = perfect negative correlation
 */
export function pearsonCorrelation(x, y) {
    if (x.length !== y.length || x.length === 0) return null;

    const n = x.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    for (let i = 0; i < n; i++) {
        sumX += x[i];
        sumY += y[i];
        sumXY += x[i] * y[i];
        sumX2 += x[i] * x[i];
        sumY2 += y[i] * y[i];
    }

    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

    if (denominator === 0) return 0; // Prevent divide by zero if a dataset is flat

    return numerator / denominator;
}

/**
 * Given a list of dataset objects { id, name, category, dailyValues: { 'YYYY-MM-DD': number } },
 * computes correlations between all possible pairs over the specified date range.
 * 
 * Returns array of { source, target, correlation, strength, interpretation } sorted by absolute strength.
 */
export function findTopCorrelations(datasets, dates) {
    const results = [];

    // Need at least 2 datasets to compare
    if (datasets.length < 2 || dates.length === 0) return [];

    // Filter out datasets that don't have enough variance or data points over this period
    const validDatasets = datasets.map(ds => {
        const values = dates.map(d => ds.dailyValues[d] ?? 0);
        const nonZeroCount = values.filter(v => v !== 0).length;

        // Require at least 3 non-zero data points to even bother correlating
        if (nonZeroCount < 3) return null;

        return { ...ds, arrayValues: values };
    }).filter(Boolean);

    for (let i = 0; i < validDatasets.length; i++) {
        for (let j = i + 1; j < validDatasets.length; j++) {
            const ds1 = validDatasets[i];
            const ds2 = validDatasets[j];

            // Don't correlate a dataset with itself (or same metric type across different scopes if they share an ID root)
            if (ds1.id === ds2.id) continue;

            const r = pearsonCorrelation(ds1.arrayValues, ds2.arrayValues);

            if (r !== null && !isNaN(r)) {
                const absR = Math.abs(r);

                // Only keep meaningful correlations (|r| >= 0.3)
                if (absR >= 0.3) {
                    let interpretation = '';
                    if (r > 0.6) interpretation = `Strong relation: when ${ds1.name} goes up, ${ds2.name} often goes up.`;
                    else if (r > 0.3) interpretation = `Moderate relation: when ${ds1.name} goes up, ${ds2.name} slightly goes up.`;
                    else if (r < -0.6) interpretation = `Strong opposite: when ${ds1.name} goes up, ${ds2.name} usually drops.`;
                    else interpretation = `Moderate opposite: when ${ds1.name} goes up, ${ds2.name} tends to drop.`;

                    results.push({
                        ds1,
                        ds2,
                        correlation: r,
                        absStrength: absR,
                        interpretation
                    });
                }
            }
        }
    }

    // Sort by absolute strength, strongest first
    return results.sort((a, b) => b.absStrength - a.absStrength);
}
