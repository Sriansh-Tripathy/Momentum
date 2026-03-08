import React, { createContext, useContext, useReducer, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createUserStorage } from '../utils/storage';
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
    const [userStorage, setUserStorage] = useState(null);

    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            stor.get('bank_deposits', []).then(data => {
                dispatch({ type: 'SET_DEPOSITS', payload: data });
            });
        } else {
            setUserStorage(null);
            dispatch({ type: 'SET_DEPOSITS', payload: [] });
        }
    }, [currentUser]);

    useEffect(() => {
        if (!state.isLoading && userStorage) {
            userStorage.set('bank_deposits', state.deposits);
        }
    }, [state.deposits, state.isLoading, userStorage]);

    const addDeposit = (deposit) => {
        const newDeposit = {
            ...deposit,
            id: uuidv4(),
            amount: parseFloat(deposit.amount),
            createdAt: new Date().toISOString(),
        };
        dispatch({ type: 'ADD_DEPOSIT', payload: newDeposit });
    };

    const deleteDeposit = (id) => {
        dispatch({ type: 'DELETE_DEPOSIT', payload: id });
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
