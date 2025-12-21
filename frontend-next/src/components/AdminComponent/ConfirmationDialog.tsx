"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertTriangle, FiTrash2, FiX, FiAlertCircle } from 'react-icons/fi';
import './ConfirmationDialog.css';

interface ConfirmationDialogProps {
    isOpen: boolean;
    title?: string;
    message?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
    disabled?: boolean;
    variant?: 'danger' | 'warning' | 'info';
    itemName?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    isLoading = false,
    disabled = false,
    variant = 'danger',
    itemName
}) => {
    const getIcon = () => {
        switch (variant) {
            case 'danger':
                return <FiTrash2 />;
            case 'warning':
                return <FiAlertTriangle />;
            default:
                return <FiAlertCircle />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="confirmation-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onCancel}
                >
                    <motion.div
                        className={`confirmation-dialog ${variant}`}
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="dialog-close-btn" onClick={onCancel}>
                            <FiX />
                        </button>

                        <motion.div
                            className={`dialog-icon ${variant}`}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.1, type: 'spring', damping: 15 }}
                        >
                            {getIcon()}
                        </motion.div>

                        <h2 className="dialog-title">{title}</h2>

                        <p className="dialog-message">
                            {message}
                            {itemName && (
                                <span className="dialog-item-name">"{itemName}"</span>
                            )}
                        </p>

                        <div className="dialog-warning-note">
                            <FiAlertTriangle />
                            <span>This action cannot be undone.</span>
                        </div>

                        <div className="dialog-actions">
                            <motion.button
                                className="dialog-btn cancel-btn"
                                onClick={onCancel}
                                disabled={isLoading || disabled}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {cancelText}
                            </motion.button>
                            <motion.button
                                className={`dialog-btn confirm-btn ${variant}`}
                                onClick={onConfirm}
                                disabled={isLoading || disabled}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLoading && <span className="btn-spinner" />}
                                {confirmText}
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default ConfirmationDialog;

