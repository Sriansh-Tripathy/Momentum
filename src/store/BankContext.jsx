import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

const BankContext = createContext();

const initialState = {
    deposits: [],  // { id, label, amount, date, category }
    isLoading: true,
};

function bankReducer(state, action) {
    switch (action.type) {
        case 'SET_DEPOSITS':
            return { ...state, deposits: action.payload, isLoading: false };
        case 'ADD_DEPOSIT':
            return { ...state, deposits: [action.payload, ...state.deposits] };
        case 'DELETE_DEPOSIT':
            return { ...state, deposits: state.deposits.filter(d => d.id !== action.payload) };
        default:
            return state;
    }
}

export const DEPOSIT_CATEGORIES = [
    { id: 'salary', label: 'Salary', icon: '💼' },
    { id: 'freelance', label: 'Freelance', icon: '💻' },
    { id: 'gift', label: 'Gift', icon: '🎁' },
    { id: 'investment', label: 'Investment', icon: '📈' },
    { id: 'refund', label: 'Refund', icon: '↩️' },
    { id: 'other', label: 'Other Income', icon: '💰' },
];

export function BankProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(bankReducer, initialState);

    useEffect(() => {
        if (currentUser) {
            const fetchDeposits = async () => {
                const { data, error } = await supabase.from('deposits')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('created_at', { ascending: false });
                if (data && !error) {
                    dispatch({ type: 'SET_DEPOSITS', payload: data });
                } else {
                    dispatch({ type: 'SET_DEPOSITS', payload: [] });
                }
            };
            fetchDeposits();
        } else {
            dispatch({ type: 'SET_DEPOSITS', payload: [] });
        }
    }, [currentUser]);

    const addDeposit = async (deposit) => {
        if (!currentUser) return;
        const newDeposit = {
            amount: parseFloat(deposit.amount),
            category: deposit.category,
            date: deposit.date,
            label: deposit.label,
            note: deposit.note,
            user_id: currentUser.id
        };
        const { data, error } = await supabase.from('deposits').insert([newDeposit]).select();
        if (data && !error) {
            dispatch({ type: 'ADD_DEPOSIT', payload: data[0] });
        }
    };

    const deleteDeposit = async (id) => {
        dispatch({ type: 'DELETE_DEPOSIT', payload: id });
        await supabase.from('deposits').delete().eq('id', id);
    };

    // Balance is COMPUTED from deposits — not editable; auto-syncs with ExpenseContext
    // The actual balance subtraction from expenses happens in the Dashboard component
    // that has access to both contexts. Here we just expose totalDeposits.
    const totalDeposited = useMemo(
        () => state.deposits.reduce((s, d) => s + d.amount, 0),
        [state.deposits]
    );

    return (
        <BankContext.Provider value={{
            deposits: state.deposits,
            totalDeposited,
            isLoading: state.isLoading,
            addDeposit,
            deleteDeposit,
        }}>
            {children}
        </BankContext.Provider>
    );
}

export function useBankContext() {
    return useContext(BankContext);
}
