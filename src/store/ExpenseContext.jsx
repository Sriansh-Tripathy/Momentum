import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { supabase } from '../supabaseClient';
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

    // Load from Supabase
    useEffect(() => {
        if (currentUser) {
            const fetchExpenses = async () => {
                const { data, error } = await supabase.from('expenses')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });
                if (data && !error) {
                    dispatch({ type: 'SET_EXPENSES', payload: data });
                } else {
                    dispatch({ type: 'SET_EXPENSES', payload: [] });
                }
            };
            fetchExpenses();
        } else {
            dispatch({ type: 'SET_EXPENSES', payload: [] });
        }
    }, [currentUser]);

    const addExpense = async (expense) => {
        if (!currentUser) return;
        const newExpense = {
            amount: parseFloat(expense.amount),
            category: expense.category,
            date: expense.date,
            label: expense.label,
            user_id: currentUser.id
        };
        const { data, error } = await supabase.from('expenses').insert([newExpense]).select();
        if (data && !error) {
            dispatch({ type: 'ADD_EXPENSE', payload: data[0] });
        }
    };

    const deleteExpense = async (id) => {
        dispatch({ type: 'DELETE_EXPENSE', payload: id });
        await supabase.from('expenses').delete().eq('id', id);
    };

    const updateExpense = async (expense) => {
        dispatch({ type: 'UPDATE_EXPENSE', payload: expense });
        const { id, user_id, created_at, ...updates } = expense;
        await supabase.from('expenses').update(updates).eq('id', id);
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
