import React from 'react';
import './Input.css';

export default function Input({ label, error, className = '', containerClassName = '', id, ...props }) {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className={`nothing-input-container ${containerClassName}`}>
            {label && (
                <label htmlFor={inputId} className="nothing-label">
                    {label}
                </label>
            )}
            <input
                id={inputId}
                className={`nothing-input ${error ? 'input-error' : ''} ${className}`}
                {...props}
            />
            {error && <span className="nothing-error-text">{error}</span>}
        </div>
    );
}
