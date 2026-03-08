import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';

const BodyContext = createContext();

const initialState = {
    logs: {}, // { '2023-10-25': { weight: 70.4, sleep: 7.5 } }
};

function bodyReducer(state, action) {
    switch (action.type) {
        case 'INIT':
            return { ...state, ...action.payload };

        case 'LOG_METRIC': {
            const { date, type, value } = action.payload;
            const currentDay = state.logs[date] || {};

            // If value is null/empty string, remove the key from the day's object
            let updatedDay = { ...currentDay, [type]: parseFloat(value) };
            if (value === null || value === '') {
                delete updatedDay[type];
            }

            return {
                ...state,
                logs: {
                    ...state.logs,
                    [date]: updatedDay
                }
            };
        }

        default:
            return state;
    }
}

export function BodyProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(bodyReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    // Load data
    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            stor.get('bodyStats').then(saved => {
                if (saved) {
                    dispatch({ type: 'INIT', payload: saved });
                }
            });
        } else {
            setUserStorage(null);
            dispatch({ type: 'INIT', payload: initialState });
        }
    }, [currentUser]);

    // Save data
    useEffect(() => {
        if (userStorage) {
            userStorage.set('bodyStats', state);
        }
    }, [state, userStorage]);

    const logMetric = (date, type, value) => {
        // type: 'weight' or 'sleep'
        dispatch({ type: 'LOG_METRIC', payload: { date, type, value } });
    };

    return (
        <BodyContext.Provider value={{
            ...state,
            logMetric
        }}>
            {children}
        </BodyContext.Provider>
    );
}

export const useBodyContext = () => useContext(BodyContext);
