import React, { createContext, useContext, useState, useEffect } from 'react';
import { globalStorage } from '../utils/storage';
import { migrateLegacyDataToUser } from '../utils/migration';
import { v4 as uuidv4 } from 'uuid';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initial load of users and active session
    useEffect(() => {
        const initAuth = async () => {
            const savedUsers = await globalStorage.get('momentum_users', []);
            const activeUserId = await globalStorage.get('momentum_active_user', null);

            setUsers(savedUsers);

            if (activeUserId && savedUsers.length > 0) {
                const user = savedUsers.find(u => u.id === activeUserId);
                if (user) {
                    setCurrentUser(user);
                }
            }
            setIsLoading(false);
        };
        initAuth();
    }, []);

    const login = async (username, password) => {
        const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
        if (!user) return { success: false, error: 'User not found' };
        if (user.password !== password) return { success: false, error: 'Incorrect password' };

        // Log them in
        setCurrentUser(user);
        await globalStorage.set('momentum_active_user', user.id);
        return { success: true };
    };

    const register = async (username, password) => {
        if (!username || !password) return { success: false, error: 'Missing fields' };

        const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());
        if (exists) return { success: false, error: 'Username already taken' };

        const newUser = {
            id: 'user_' + uuidv4(),
            username,
            password,
            createdAt: new Date().toISOString()
        };

        const updatedUsers = [...users, newUser];
        setUsers(updatedUsers);
        await globalStorage.set('momentum_users', updatedUsers);

        // Auto login
        setCurrentUser(newUser);
        await globalStorage.set('momentum_active_user', newUser.id);

        const isFirstUserEver = updatedUsers.length === 1;

        // Run data migration if this is the first user so they don't lose old tasks!
        if (isFirstUserEver) {
            await migrateLegacyDataToUser(newUser.id);
        }

        return { success: true, isFirstUserEver, user: newUser };
    };

    const logout = async () => {
        setCurrentUser(null);
        await globalStorage.set('momentum_active_user', null);
    };

    return (
        <AuthContext.Provider value={{
            currentUser,
            users,    // helpful if we want to show a "Switch User" dropdown
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
