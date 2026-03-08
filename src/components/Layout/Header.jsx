import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import './Layout.css';

export default function Header({ title }) {
    const navigate = useNavigate();
    const { isDark, toggleTheme } = useTheme();
    const { logout } = useAuth();

    return (
        <header className="nothing-header">
            <div className="header-brand mobile-only">
                <span className="brand-font">Moment<span className="text-red">um</span></span>
            </div>

            <h1 className="header-title brand-font desktop-only">{title}</h1>

            <div className="header-actions" style={{ display: 'flex', gap: '8px' }}>
                <button
                    className="header-icon-btn mobile-only"
                    onClick={logout}
                    aria-label="Logout"
                >
                    <LogOut size={24} />
                </button>
                <button
                    className="header-icon-btn mobile-only"
                    onClick={toggleTheme}
                    aria-label="Toggle Dark Mode"
                >
                    {isDark ? <Sun size={24} /> : <Moon size={24} />}
                </button>
                <button
                    className="header-icon-btn mobile-only"
                    onClick={() => navigate('/alarms')}
                    aria-label="Alarms"
                >
                    <Bell size={24} />
                </button>
            </div>
        </header>
    );
}
