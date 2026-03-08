import React, { createContext, useContext, useReducer, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { createUserStorage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { format } from 'date-fns';

const PaymentContext = createContext();

const initialState = {
    payments: [],
    isLoading: true
};

function advanceDueDate(dateStr, frequency) {
    const next = new Date(dateStr);
    if (frequency === 'weekly') next.setDate(next.getDate() + 7);
    if (frequency === 'monthly') next.setMonth(next.getMonth() + 1);
    if (frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);
    return format(next, 'yyyy-MM-dd');
}

function paymentReducer(state, action) {
    switch (action.type) {
        case 'SET_PAYMENTS':
            return { ...state, payments: action.payload, isLoading: false };
        case 'ADD_PAYMENT':
            return { ...state, payments: [...state.payments, action.payload] };
        case 'DELETE_PAYMENT':
            return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };
        case 'ADVANCE_DATE':
            // Advances nextDueDate to next period — called after marking paid
            return {
                ...state,
                payments: state.payments.map(p =>
                    p.id === action.payload
                        ? { ...p, nextDueDate: advanceDueDate(p.nextDueDate, p.frequency), lastPaidDate: format(new Date(), 'yyyy-MM-dd') }
                        : p
                )
            };
        default:
            return state;
    }
}

export function PaymentProvider({ children }) {
    const { currentUser } = useAuth();
    const [state, dispatch] = useReducer(paymentReducer, initialState);
    const [userStorage, setUserStorage] = useState(null);

    useEffect(() => {
        if (currentUser) {
            const stor = createUserStorage(currentUser.id);
            setUserStorage(stor);
            stor.get('recurring_payments', []).then(data => {
                dispatch({ type: 'SET_PAYMENTS', payload: data });
            });
        } else {
            setUserStorage(null);
            dispatch({ type: 'SET_PAYMENTS', payload: [] });
        }
    }, [currentUser]);

    useEffect(() => {
        if (!state.isLoading && userStorage) {
            userStorage.set('recurring_payments', state.payments);
        }
    }, [state.payments, state.isLoading, userStorage]);

    const addPayment = (payment) => {
        dispatch({
            type: 'ADD_PAYMENT',
            payload: {
                ...payment,
                id: uuidv4(),
                category: payment.category || 'bills',
                createdAt: new Date().toISOString(),
            }
        });
    };

    const deletePayment = (id) => {
        dispatch({ type: 'DELETE_PAYMENT', payload: id });
    };

    /**
     * markPaid:
     *  1. Advances the nextDueDate to next period
     *  2. Calls addExpense (injected from ExpenseContext) to log this as an expense
     */
    const markPaid = useCallback((payment, addExpenseFn) => {
        // Log it as an expense
        if (addExpenseFn) {
            addExpenseFn({
                amount: parseFloat(payment.amount),
                category: payment.category || 'bills',
                note: payment.name,
                date: format(new Date(), 'yyyy-MM-dd'),
            });
        }
        // Advance due date
        dispatch({ type: 'ADVANCE_DATE', payload: payment.id });
    }, []);

    return (
        <PaymentContext.Provider value={{
            payments: state.payments,
            isLoading: state.isLoading,
            addPayment,
            deletePayment,
            markPaid,
        }}>
            {children}
        </PaymentContext.Provider>
    );
}

export function usePaymentContext() {
    return useContext(PaymentContext);
}
