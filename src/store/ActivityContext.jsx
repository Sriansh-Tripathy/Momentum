import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { format, subDays } from 'date-fns';

const ActivityContext = createContext();

/**
 * Activity shape:
 *   boolean type: { id, name, icon, type: 'boolean' }
 *   range type:   { id, name, icon, type: 'range', unit: 'miles', goal: 10, threshold: 7 }
 *
 * Log shape (per date):
 *   { 'yyyy-MM-dd': { 'activityId': true | number } }
 *   - boolean: true/false (presence = done)
 *   - range: number (the logged value)
 */

const defaultActivities = [
    { id: 'act-exercise', name: 'Exercise', icon: '🏃', type: 'boolean' },
    { id: 'act-medicine', name: 'Medicine', icon: '💊', type: 'boolean' },
    { id: 'act-water', name: 'Drink Water', icon: '💧', type: 'range', unit: 'glasses', goal: 8, threshold: 6 },
    { id: 'act-read', name: 'Reading', icon: '📚', type: 'boolean' },
];

const initialState = {
    activities: [],
    logs: {},   // { 'yyyy-MM-dd': { actId: true | number } }
    isLoading: true,
};

function activityReducer(state, action) {
    switch (action.type) {
        case 'INIT_STATE':
            return {
                ...state,
                activities: action.payload.activities.length ? action.payload.activities : defaultActivities,
                logs: action.payload.logs,
                isLoading: false,
            };

        case 'ADD_ACTIVITY':
            return { ...state, activities: [...state.activities, action.payload] };

        case 'DELETE_ACTIVITY':
            return { ...state, activities: state.activities.filter(a => a.id !== action.payload) };

        case 'LOG_ACTIVITY': {
            // For boolean: toggle. For range: set value (null to remove).
            const { date, activityId, value } = action.payload;
            const dayLogs = { ...(state.logs[date] || {}) };

            if (value === null || value === undefined) {
                delete dayLogs[activityId];
            } else {
                dayLogs[activityId] = value;
            }

            return { ...state, logs: { ...state.logs, [date]: dayLogs } };
        }

        default:
            return state;
    }
}

/** Returns true if the log entry counts as "completed" for an activity */
export function isCompleted(activity, logValue) {
    if (logValue === undefined || logValue === false || logValue === null) return false;
    const type = activity?.type || 'boolean';
    if (type === 'boolean') return logValue === true;
    if (type === 'range') return parseFloat(logValue) >= parseFloat(activity.threshold);
    return false;
}

export function ActivityProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(activityReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            Promise.all([
                stor.get('activities', []),
                stor.get('activity_logs_v2', {}),
            ]).then(([activities, logs]) => {
                dispatch({ type: 'INIT_STATE', payload: { activities, logs } });
            });
        } else {
            setUserStorage(null);
            dispatch({ type: 'INIT_STATE', payload: { activities: [], logs: {} } });
        }
    }, [currentUser]);

    useEffect(() => {
        if (!state.isLoading && userStorage) {
            userStorage.set('activities', state.activities);
            userStorage.set('activity_logs_v2', state.logs);
        }
    }, [state.activities, state.logs, state.isLoading, userStorage]);

    /** addActivity: name, icon, type ('boolean'|'range'), and for range: unit, goal, threshold */
    const addActivity = (activityData) => {
        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { id: uuidv4(), ...activityData },
        });
    };

    const deleteActivity = (id) => dispatch({ type: 'DELETE_ACTIVITY', payload: id });

    /**
     * logActivity — unified for both types:
     *   boolean → call with value=true to check, value=null to uncheck
     *   range   → call with value=number (e.g. 7.5) or value=null to clear
     */
    const logActivity = (dateStr, activityId, value) => {
        dispatch({ type: 'LOG_ACTIVITY', payload: { date: dateStr, activityId, value } });
    };

    /** Legacy toggleLog alias — works for boolean-type activities */
    const toggleLog = (dateStr, activityId) => {
        const activity = state.activities.find(a => a.id === activityId);
        if (!activity) return;
        const type = activity.type || 'boolean';
        if (type !== 'boolean') return;
        const current = state.logs[dateStr]?.[activityId];
        logActivity(dateStr, activityId, current ? null : true);
    };

    /** Returns current day streak for an activity */
    const getStreak = (activityId) => {
        const activity = state.activities.find(a => a.id === activityId);
        if (!activity) return 0;

        let streak = 0;
        let date = new Date();

        while (true) {
            const dateStr = format(date, 'yyyy-MM-dd');
            const logVal = state.logs[dateStr]?.[activityId];
            if (isCompleted(activity, logVal)) {
                streak++;
                date = subDays(date, 1);
            } else {
                // Allow today to be incomplete (streak from yesterday still valid)
                if (streak === 0 && dateStr === format(new Date(), 'yyyy-MM-dd')) {
                    date = subDays(date, 1);
                } else {
                    break;
                }
            }
        }
        return streak;
    };

    /** Returns completion counts over last N days for analytics */
    const getCompletionStats = (activityId, days = 30) => {
        const activity = state.activities.find(a => a.id === activityId);
        if (!activity) return { completed: 0, total: days, values: [] };

        let completed = 0;
        const values = [];
        for (let i = 0; i < days; i++) {
            const dateStr = format(subDays(new Date(), i), 'yyyy-MM-dd');
            const logVal = state.logs[dateStr]?.[activityId];
            const done = isCompleted(activity, logVal);
            if (done) completed++;
            values.push({ date: dateStr, value: logVal ?? null, done });
        }
        return { completed, total: days, rate: Math.round((completed / days) * 100), values };
    };

    return (
        <ActivityContext.Provider value={{
            activities: state.activities,
            logs: state.logs,
            isLoading: state.isLoading,
            addActivity,
            deleteActivity,
            logActivity,
            toggleLog,   // keep as alias so Activities.jsx's existing calls still work
            getStreak,
            getCompletionStats,
        }}>
            {children}
        </ActivityContext.Provider>
    );
}

export function useActivityContext() {
    return useContext(ActivityContext);
}
