import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Activity, CreditCard, Bell, Apple, UserCircle, Moon, Sun, LogOut } from 'lucide-react';
import { useTheme } from '../../store/ThemeContext';
import { useAuth } from '../../store/AuthContext';
import './Layout.css';

const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/expenses', label: 'Expenses', icon: Wallet },
    { path: '/analytics', label: 'Analytics', icon: PieChart },
    { path: '/activities', label: 'Activities', icon: Activity },
    { path: '/nutrition', label: 'Nutrition', icon: Apple },
    { path: '/body', label: 'Body', icon: UserCircle },
    { path: '/payments', label: 'Payments', icon: CreditCard },
    { path: '/alarms', label: 'Alarms', icon: Bell },
];

export default function Sidebar() {
    const { isDark, toggleTheme } = useTheme();
    const { logout } = useAuth();

    return (
        <aside className="nothing-sidebar">
            <div className="sidebar-logo">
                <span className="brand-font">Moment<span className="text-red">um</span></span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                    >
                        <item.icon size={20} />
                        <span className="brand-font">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="sidebar-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className="nothing-version text-secondary brand-font">v0.4.5</span>
                    <button onClick={logout} className="icon-btn text-secondary" title="Logout" style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={14} />
                    </button>
                </div>
                <button
                    onClick={toggleTheme}
                    className="icon-btn"
                    title="Toggle Dark Mode"
                    style={{ background: 'transparent', border: 'none', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                >
                    {isDark ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>
        </aside>
    );
}
