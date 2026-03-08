import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Wallet, PieChart, Activity, CreditCard, Apple, UserCircle } from 'lucide-react';
import './Layout.css';

// Skipping Alarms in bottom nav to save space
const navItems = [
    { path: '/', label: 'Start', icon: LayoutDashboard },
    { path: '/expenses', label: 'Spend', icon: Wallet },
    { path: '/analytics', label: 'Data', icon: PieChart },
    { path: '/activities', label: 'Habits', icon: Activity },
    { path: '/nutrition', label: 'Food', icon: Apple },
    { path: '/body', label: 'Body', icon: UserCircle },
    { path: '/payments', label: 'Pay', icon: CreditCard },
];

export default function BottomNav() {
    return (
        <nav className="nothing-bottom-nav">
            {navItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => `bottom-nav-link ${isActive ? 'active' : ''}`}
                >
                    <item.icon size={24} />
                    <span className="brand-font">{item.label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
