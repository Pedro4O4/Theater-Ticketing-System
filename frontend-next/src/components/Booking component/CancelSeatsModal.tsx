"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiTrash2, FiCheckSquare, FiSquare } from 'react-icons/fi';
import './CancelSeatsModal.css';

interface Seat {
    row: string;
    seatNumber: number;
    section: string;
    seatType?: string;
    price?: number;
    seatLabel?: string;
}

interface CancelSeatsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (seatKeys: string[], cancelAll: boolean) => void;
    seats: Seat[];
    isLoading?: boolean;
    bookingType: 'pending' | 'confirmed';
}

const CancelSeatsModal: React.FC<CancelSeatsModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    seats,
    isLoading = false,
    bookingType,
}) => {
    const [selectedSeatKeys, setSelectedSeatKeys] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const getSeatKey = (seat: Seat) => `${seat.section}-${seat.row}-${seat.seatNumber}`;

    const toggleSeat = (seat: Seat) => {
        const key = getSeatKey(seat);
        const newSelected = new Set(selectedSeatKeys);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedSeatKeys(newSelected);
        setSelectAll(newSelected.size === seats.length);
    };

    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedSeatKeys(new Set());
            setSelectAll(false);
        } else {
            setSelectedSeatKeys(new Set(seats.map(getSeatKey)));
            setSelectAll(true);
        }
    };

    const handleConfirm = () => {
        const isAll = selectedSeatKeys.size === seats.length;
        onConfirm(Array.from(selectedSeatKeys), isAll);
    };

    const selectedPrice = seats
        .filter((s) => selectedSeatKeys.has(getSeatKey(s)))
        .reduce((sum, s) => sum + (s.price || 0), 0);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="cancel-seats-overlay" onClick={onClose}>
                <motion.div
                    className="cancel-seats-modal"
                    onClick={(e) => e.stopPropagation()}
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                >
                    <div className="csm-header">
                        <h2>
                            {bookingType === 'pending'
                                ? 'Select Seats to Cancel'
                                : 'Select Seats to Request Cancellation'}
                        </h2>
                        <button className="csm-close-btn" onClick={onClose}>
                            <FiX size={20} />
                        </button>
                    </div>

                    <p className="csm-subtitle">
                        {bookingType === 'pending'
                            ? 'Choose which seats you want to cancel from your pending booking, or select all.'
                            : 'Choose which seats you want to return, or select all. The organizer will review your request.'}
                    </p>

                    <div className="csm-select-all" onClick={toggleSelectAll}>
                        {selectAll ? (
                            <FiCheckSquare size={20} className="csm-check-icon checked" />
                        ) : (
                            <FiSquare size={20} className="csm-check-icon" />
                        )}
                        <span>Select All ({seats.length} seats)</span>
                    </div>

                    <div className="csm-seats-grid">
                        {seats.map((seat) => {
                            const key = getSeatKey(seat);
                            const isSelected = selectedSeatKeys.has(key);
                            return (
                                <motion.div
                                    key={key}
                                    className={`csm-seat-item ${isSelected ? 'selected' : ''}`}
                                    onClick={() => toggleSeat(seat)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <div className="csm-seat-check">
                                        {isSelected ? (
                                            <FiCheckSquare size={18} className="csm-check-icon checked" />
                                        ) : (
                                            <FiSquare size={18} className="csm-check-icon" />
                                        )}
                                    </div>
                                    <div className="csm-seat-info">
                                        <span className="csm-seat-label">
                                            {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
                                        </span>
                                        <span className="csm-seat-type">{seat.seatType || 'standard'}</span>
                                    </div>
                                    <span className="csm-seat-price">
                                        {(seat.price || 0).toFixed(2)} EGP
                                    </span>
                                </motion.div>
                            );
                        })}
                    </div>

                    {selectedSeatKeys.size > 0 && (
                        <div className="csm-summary">
                            <span>{selectedSeatKeys.size} seat(s) selected</span>
                            <span className="csm-refund">{selectedPrice.toFixed(2)} EGP</span>
                        </div>
                    )}

                    <div className="csm-actions">
                        <button className="csm-cancel-btn" onClick={onClose} disabled={isLoading}>
                            Go Back
                        </button>
                        <button
                            className="csm-confirm-btn"
                            onClick={handleConfirm}
                            disabled={selectedSeatKeys.size === 0 || isLoading}
                        >
                            <FiTrash2 size={16} />
                            {isLoading
                                ? 'Processing...'
                                : bookingType === 'pending'
                                    ? `Cancel ${selectedSeatKeys.size} Seat(s)`
                                    : `Request Cancellation`}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CancelSeatsModal;
