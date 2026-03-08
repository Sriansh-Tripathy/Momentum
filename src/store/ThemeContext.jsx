import React, { createContext, useContext, useEffect, useState } from 'react';
import { globalStorage } from '../utils/storage';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
    // Default to dark mode based on the Nothing aesthetic, or user preference if saved
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            const savedTheme = await globalStorage.get('theme_is_dark');
            if (savedTheme !== undefined) {
                setIsDark(savedTheme);
            }
        };
        loadTheme();
    }, []);

    useEffect(() => {
        // Apply class to HTML element so it affects the whole page including scrollbars/body
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        // Save preference
        globalStorage.set('theme_is_dark', isDark);
    }, [isDark]);

    const toggleTheme = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => useContext(ThemeContext);
