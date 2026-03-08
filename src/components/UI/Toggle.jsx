import React from 'react';
import './Toggle.css';

export default function Toggle({ label, checked, onChange, id }) {
    const toggleId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="nothing-toggle-container">
            {label && <label htmlFor={toggleId} className="nothing-label">{label}</label>}
            <label className="nothing-switch">
                <input
                    id={toggleId}
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                />
                <span className="nothing-slider"></span>
            </label>
        </div>
    );
}
