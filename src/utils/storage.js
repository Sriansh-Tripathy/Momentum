import localforage from 'localforage';
import { supabase } from '../supabaseClient';

localforage.config({
    name: 'Momentum',
    storeName: 'data'
});

// A wrapper that scopes storage keys to a specific user and syncs with Supabase JSON Key/Value
export const createUserStorage = (userId) => {
    return {
        async get(key, defaultValue) {
            try {
                const { data, error } = await supabase
                    .from('user_data')
                    .select('value')
                    .eq('user_id', userId)
                    .eq('key', key)
                    .single();

                if (error || !data) {
                    // Supabase will throw error code PGRST116 if no rows returned based on .single()
                    return defaultValue;
                }
                return data.value !== null ? data.value : defaultValue;
            } catch (err) {
                console.error(`Error reading ${key} from Supabase:`, err);
                return defaultValue;
            }
        },

        async set(key, value) {
            try {
                await supabase
                    .from('user_data')
                    .upsert({ user_id: userId, key, value });
            } catch (err) {
                console.error(`Error writing ${key} to Supabase:`, err);
            }
        },

        async clear() {
            try {
                await supabase.from('user_data').delete().eq('user_id', userId);
            } catch (err) {
                console.error('Error clearing data from Supabase:', err);
            }
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
