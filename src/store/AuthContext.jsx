import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]); // Kept for compatibility with any older UI components, though unused
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Initial session check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setCurrentUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setCurrentUser(session?.user ?? null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Helper to allow users to just type "john" instead of "john@momentum.app"
    const normalizeEmail = (username) => {
        if (!username) return '';
        let email = username.trim().toLowerCase();
        if (!email.includes('@')) {
            email = email.replace(/\s+/g, '') + '@momentum.app';
        }
        return email;
    };

    const login = async (username, password) => {
        const email = normalizeEmail(username);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        return { success: true };
    };

    const register = async (username, password) => {
        if (!username || !password) return { success: false, error: 'Missing fields' };

        const email = normalizeEmail(username);
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) return { success: false, error: error.message };

        // Auto-login since our DB trigger verifies the user instantly behind the scenes
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) return { success: false, error: signInError.message };

        return { success: true, isFirstUserEver: false, user: signInData.user };
    };

    const logout = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            users,
            isLoading,
            login,
            register,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
