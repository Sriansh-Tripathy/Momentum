import localforage from 'localforage';

localforage.config({
    name: 'Momentum',
    storeName: 'data'
});

// A wrapper that scopes storage keys to a specific user
export const createUserStorage = (userId) => {
    const getKey = (key) => `${userId}_${key}`;

    return {
        async get(key, defaultValue) {
            try {
                const value = await localforage.getItem(getKey(key));
                return value !== null ? value : defaultValue;
            } catch (err) {
                console.error(`Error reading ${getKey(key)}:`, err);
                return defaultValue;
            }
        },

        async set(key, value) {
            try {
                await localforage.setItem(getKey(key), value);
            } catch (err) {
                console.error(`Error writing ${getKey(key)}:`, err);
            }
        },

        async clear() {
            // Can't use localforage.clear() as it wipes ALL users. 
            // In a real app we'd iterate keys starting with userId_.
        }
    };
};

// Global generic storage (used for Settings/Theme, and Users list)
export const globalStorage = {
    async get(key, defaultValue) {
        try {
            const value = await localforage.getItem(key);
            return value !== null ? value : defaultValue;
        } catch (err) {
            return defaultValue;
        }
    },
    async set(key, value) {
        await localforage.setItem(key, value);
    }
};
