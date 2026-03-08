import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import './Modal.css';
import Card from './Card';

export default function Modal({ isOpen, onClose, title, children }) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="nothing-modal-overlay" onClick={onClose}>
            <div className="nothing-modal-content" onClick={(e) => e.stopPropagation()}>
                <Card padding="large" className="nothing-modal-card">
                    <div className="nothing-modal-header">
                        {title && <h2 className="brand-font">{title}</h2>}
                        <button className="nothing-modal-close" onClick={onClose} aria-label="Close modal">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="nothing-modal-body">
                        {children}
                    </div>
                </Card>
            </div>
        </div>
    );
}
