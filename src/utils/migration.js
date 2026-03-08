import { globalStorage, createUserStorage } from './storage';

/**
 * migrateLegacyDataToUser(userId)
 * 
 * In versions prior to v0.4.5, data was stored in global buckets (e.g., 'expenses', 'activities').
 * When multi-user support was added, data storage was namespaced (e.g., 'user_123_expenses').
 * 
 * This function takes the old, generic data from localforage and moves it into the
 * specific user's namespace, then optionally deletes the old generic keys to prevent duplication.
 */
export async function migrateLegacyDataToUser(userId) {
    if (!userId) return;

    const userStor = createUserStorage(userId);
    const legacyKeys = [
        'expenses',
        'bank_deposits',
        'recurring_payments',
        'activities',
        'activity_logs_v2',
        'alarms',
        'nutrition',
        'bodyStats'
    ];

    console.log(`Starting data migration to user: ${userId}`);

    for (const key of legacyKeys) {
        try {
            // Check if legacy data exists
            const legacyData = await globalStorage.get(key);

            // Only migrate if there is actually data there.
            // Empty arrays or empty objects are technically data, but we'll migrate them anyway
            // to ensure a clean slate, except for null/undefined.
            if (legacyData !== undefined && legacyData !== null) {
                console.log(`Migrating legacy key: ${key}`);

                // Write it to the new user namespace
                await userStor.set(key, legacyData);

                // Clear the legacy key so it doesn't get migrated again to another user
                await globalStorage.set(key, null);
            }
        } catch (err) {
            console.error(`Failed to migrate key: ${key}`, err);
        }
    }

    console.log('Migration complete.');
}
