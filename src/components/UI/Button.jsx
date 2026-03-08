import React from 'react';
import './Button.css';

export default function Button({
    children,
    variant = 'primary', // primary, secondary, ghost, outline
    size = 'md', // sm, md, lg
    className = '',
    ...props
}) {
    return (
        <button
            className={`nothing-btn btn-${variant} btn-${size} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
