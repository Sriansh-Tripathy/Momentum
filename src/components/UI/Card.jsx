import React from 'react';
import './Card.css';

export default function Card({ children, className = '', onClick, padding = 'normal' }) {
    const classes = `nothing-card padding-${padding} ${onClick ? 'clickable' : ''} ${className}`;

    return (
        <div className={classes} onClick={onClick}>
            {children}
        </div>
    );
}
