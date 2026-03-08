import React, { createContext, useContext, useEffect, useReducer, useState } from 'react';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';

const NutritionContext = createContext();

const initialState = {
    logs: {}, // { '2023-10-25': { consumed: 2000, burned: 500 } }
    targetCalories: 2000,
};

function nutritionReducer(state, action) {
    switch (action.type) {
        case 'INIT':
            return { ...state, ...action.payload };

        case 'SET_TARGET':
            return { ...state, targetCalories: action.payload };

        case 'LOG_CALORIES': {
            const { date, type, amount } = action.payload;
            const currentDay = state.logs[date] || { consumed: 0, burned: 0 };

            return {
                ...state,
                logs: {
                    ...state.logs,
                    [date]: {
                        ...currentDay,
                        [type]: amount === null ? 0 : amount // null clears it
                    }
                }
            };
        }

        case 'ADD_CALORIES': {
            const { date, type, amount } = action.payload;
            const currentDay = state.logs[date] || { consumed: 0, burned: 0 };

            return {
                ...state,
                logs: {
                    ...state.logs,
                    [date]: {
                        ...currentDay,
                        [type]: currentDay[type] + amount
                    }
                }
            };
        }

        default:
            return state;
    }
}

export function NutritionProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(nutritionReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    // Load data
    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            stor.get('nutrition').then(saved => {
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
            userStorage.set('nutrition', state);
        }
    }, [state, userStorage]);

    const setTarget = (calories) => {
        dispatch({ type: 'SET_TARGET', payload: calories });
    };

    const logCalories = (date, type, amount) => {
        // type must be 'consumed' or 'burned'
        dispatch({ type: 'LOG_CALORIES', payload: { date, type, amount } });
    };

    const addCalories = (date, type, amount) => {
        dispatch({ type: 'ADD_CALORIES', payload: { date, type, amount } });
    };

    return (
        <NutritionContext.Provider value={{
            ...state,
            setTarget,
            logCalories,
            addCalories
        }}>
            {children}
        </NutritionContext.Provider>
    );
}

export const useNutritionContext = () => useContext(NutritionContext);
