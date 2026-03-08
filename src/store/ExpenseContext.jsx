import React, { createContext, useContext, useReducer, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';

const ExpenseContext = createContext();

const initialState = {
    expenses: [],
    isLoading: true
};

function expenseReducer(state, action) {
    switch (action.type) {
        case 'SET_EXPENSES':
            return { ...state, expenses: action.payload, isLoading: false };
        case 'ADD_EXPENSE':
            return { ...state, expenses: [action.payload, ...state.expenses] };
        case 'DELETE_EXPENSE':
            return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };
        case 'UPDATE_EXPENSE':
            return {
                ...state,
                expenses: state.expenses.map(e => (e.id === action.payload.id ? action.payload : e))
            };
        default:
            return state;
    }
}

export function ExpenseProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(expenseReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    // Setup user storage when current user changes
    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);

            // Load user data
            stor.get('expenses', []).then(data => {
                dispatch({ type: 'SET_EXPENSES', payload: data });
            });
        } else {
            // Reset when logged out
            setUserStorage(null);
            dispatch({ type: 'SET_EXPENSES', payload: [] });
        }
    }, [currentUser]);

    // Save to localforage when expenses change (and we have a storage instance)
    useEffect(() => {
        if (!state.isLoading && userStorage) {
            userStorage.set('expenses', state.expenses);
        }
    }, [state.expenses, state.isLoading, userStorage]);

    const addExpense = (expense) => {
        const newExpense = {
            ...expense,
            id: uuidv4(),
            createdAt: new Date().toISOString()
        };
        dispatch({ type: 'ADD_EXPENSE', payload: newExpense });
    };

    const deleteExpense = (id) => {
        dispatch({ type: 'DELETE_EXPENSE', payload: id });
    };

    const updateExpense = (expense) => {
        dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
    };

    return (
        <ExpenseContext.Provider value={{
            expenses: state.expenses,
            isLoading: state.isLoading,
            addExpense,
            deleteExpense,
            updateExpense
        }}>
            {children}
        </ExpenseContext.Provider>
    );
}

export function useExpenseContext() {
    return useContext(ExpenseContext);
}
