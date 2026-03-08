import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { requestNotificationPermission, sendNotification } from '../utils/notifications';

const AlarmContext = createContext();

const initialState = {
    alarms: [], // { id, title, time (HH:mm), days: [], isActive }
    budgetLimit: null, // number or null
    isLoading: true
};

function alarmReducer(state, action) {
    switch (action.type) {
        case 'INIT_STATE':
            return { ...state, alarms: action.payload.alarms, budgetLimit: action.payload.budgetLimit, isLoading: false };
        case 'ADD_ALARM':
            return { ...state, alarms: [...state.alarms, action.payload] };
        case 'DELETE_ALARM':
            return { ...state, alarms: state.alarms.filter(a => a.id !== action.payload) };
        case 'TOGGLE_ALARM':
            return {
                ...state,
                alarms: state.alarms.map(a => a.id === action.payload ? { ...a, isActive: !a.isActive } : a)
            };
        case 'SET_BUDGET_LIMIT':
            return { ...state, budgetLimit: action.payload };
        default:
            return state;
    }
}

export function AlarmProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(alarmReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    // Initial load
    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            Promise.all([
                stor.get('alarms', []),
                stor.get('budget_limit', null)
            ]).then(([alarms, budgetLimit]) => {
                dispatch({ type: 'INIT_STATE', payload: { alarms, budgetLimit } });
                requestNotificationPermission(); // ask when initializing alarms
            });
        } else {
            setUserStorage(null);
            dispatch({ type: 'INIT_STATE', payload: { alarms: [], budgetLimit: null } });
        }
    }, [currentUser]);

    // Save to storage
    useEffect(() => {
        if (!state.isLoading && userStorage) {
            userStorage.set('alarms', state.alarms);
            userStorage.set('budget_limit', state.budgetLimit);
        }
    }, [state.alarms, state.budgetLimit, state.isLoading, userStorage]);

    // Very basic Alarm Checker loop (checks every minute)
    // In a real PWA this would rely heavily on Push API / Service workers, 
    // but for a pure client app we have to poll while app is open.
    useEffect(() => {
        if (state.isLoading) return;

        const intervalId = setInterval(() => {
            const now = new Date();
            const currentDayIndex = now.getDay(); // 0-6 (Sun-Sat)
            const currentHours = String(now.getHours()).padStart(2, '0');
            const currentMinutes = String(now.getMinutes()).padStart(2, '0');
            const timeString = `${currentHours}:${currentMinutes}`;

            const seconds = now.getSeconds();

            // Only fire right at the 0th second of the minute to prevent multiple notifications
            if (seconds === 0) {
                state.alarms.forEach(alarm => {
                    if (alarm.isActive && alarm.time === timeString) {
                        // Check if today is a scheduled day, or if no days are specified (assume everyday)
                        if (alarm.days.length === 0 || alarm.days.includes(currentDayIndex)) {
                            sendNotification(alarm.title || 'NothingTrack Alarm', {
                                body: `It's ${timeString}. Time for your scheduled activity.`,
                            });
                        }
                    }
                });
            }
        }, 1000); // Check every second to catch the 0th second

        return () => clearInterval(intervalId);
    }, [state.alarms, state.isLoading]);

    const addAlarm = (alarm) => {
        dispatch({ type: 'ADD_ALARM', payload: { ...alarm, id: uuidv4() } });
    };
    const deleteAlarm = (id) => dispatch({ type: 'DELETE_ALARM', payload: id });
    const toggleAlarm = (id) => dispatch({ type: 'TOGGLE_ALARM', payload: id });
    const setBudgetLimit = (limit) => dispatch({ type: 'SET_BUDGET_LIMIT', payload: limit });

    return (
        <AlarmContext.Provider value={{
            alarms: state.alarms,
            budgetLimit: state.budgetLimit,
            isLoading: state.isLoading,
            addAlarm,
            deleteAlarm,
            toggleAlarm,
            setBudgetLimit
        }}>
            {children}
        </AlarmContext.Provider>
    );
}

export function useAlarmContext() {
    return useContext(AlarmContext);
}
