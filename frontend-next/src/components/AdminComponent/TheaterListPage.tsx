'use client';

import { useState, useEffect, ChangeEvent, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiPlus, FiEdit2, FiTrash2, FiGrid, FiEye, FiUsers,
    FiLayers, FiSearch, FiX, FiChevronRight
} from 'react-icons/fi';
import api from '@/services/api';
import ConfirmationDialog from './ConfirmationDialog';
import './TheaterListPage.css';

interface TheaterLayout {
    mainFloor?: {
        rows?: number;
        seatsPerRow?: number;
    };
    hasBalcony?: boolean;
    balcony?: {
        rows?: number;
    };
    removedSeats?: string[];
}

interface SeatConfig {
    row: string;
    seatNumber: number;
    seatType: string;
}

interface Theater {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    totalSeats?: number;
    vipSeats?: number;
    premiumSeats?: number;
    layout?: TheaterLayout;
    seatConfig?: SeatConfig[];
}

const TheaterListPage = () => {
    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [previewTheater, setPreviewTheater] = useState<Theater | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        fetchTheaters();
    }, []);

    const fetchTheaters = async () => {
        try {
            setLoading(true);
            const response = await api.get('/theater');
            if (response.data.success) {
                setTheaters(response.data.data);
            }
        } catch (err: any) {
            console.error('Error fetching theaters:', err);
            setError(err.response?.data?.message || 'Failed to load theaters');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (theaterId: string) => {
        try {
            await api.delete(`/theater/${theaterId}`);
            setTheaters(prev => prev.filter(t => t._id !== theaterId));
            setDeleteConfirm(null);
        } catch (err: any) {
            console.error('Error deleting theater:', err);
            alert('Failed to delete theater: ' + (err.response?.data?.message || err.message));
        }
    };

    const filteredTheaters = theaters.filter(theater =>
        theater.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        theater.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="theater-list-page">
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Loading theaters...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="theater-list-page">
            <motion.div
                className="page-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="header-content">
                    <div className="header-icon">
                        <FiGrid />
                    </div>
                    <div>
                        <h1>Theater Management</h1>
                        <p>Create and manage theater layouts for events</p>
                    </div>
                </div>
                <Link href="/admin/theaters/new" className="create-btn">
                    <FiPlus />
                    <span>Create Theater</span>
                </Link>
            </motion.div>

            <motion.div
                className="search-bar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <FiSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="Search theaters..."
                    value={searchTerm}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                    <button className="clear-search" onClick={() => setSearchTerm('')}>
                        <FiX />
                    </button>
                )}
            </motion.div>

            {error && (
                <div className="error-state">
                    <p>{error}</p>
                    <button onClick={fetchTheaters}>Retry</button>
                </div>
            )}

            {!loading && !error && filteredTheaters.length === 0 && (
                <motion.div
                    className="empty-state"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    <FiGrid className="empty-icon" />
                    <h2>No Theaters Found</h2>
                    <p>
                        {searchTerm
                            ? 'No theaters match your search criteria'
                            : 'Get started by creating your first theater layout'
                        }
                    </p>
                    {!searchTerm && (
                        <Link href="/admin/theaters/new" className="create-btn">
                            <FiPlus /> Create Your First Theater
                        </Link>
                    )}
                </motion.div>
            )}

            <div className="theaters-grid">
                <AnimatePresence>
                    {filteredTheaters.map((theater, index) => (
                        <motion.div
                            key={theater._id}
                            className={`theater-card ${!theater.isActive ? 'inactive' : ''}`}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ y: -5 }}
                        >
                            <div className="card-header">
                                <div className="theater-icon">
                                    <FiLayers />
                                </div>
                                <div className="theater-info">
                                    <h3>{theater.name}</h3>
                                    {!theater.isActive && (
                                        <span className="inactive-badge">Inactive</span>
                                    )}
                                </div>
                            </div>

                            <div className="theater-card-preview">
                                <div className="mini-layout-wrapper">
                                    <div className="mini-layout" style={{
                                        transform: `scale(${Math.min(1, 150 / ((theater.layout?.mainFloor?.rows || 1) * 10 + 40))})`
                                    }}>
                                        <div className="mini-stage">STAGE</div>
                                        <div className="mini-grid" style={{
                                            gridTemplateRows: `repeat(${theater.layout?.mainFloor?.rows || 0}, 1fr)`,
                                            gridTemplateColumns: `repeat(${theater.layout?.mainFloor?.seatsPerRow || 0}, 1fr)`
                                        }}>
                                            {Array.from({ length: (theater.layout?.mainFloor?.rows || 0) * (theater.layout?.mainFloor?.seatsPerRow || 0) }).map((_, i) => {
                                                const rowIdx = Math.floor(i / (theater.layout?.mainFloor?.seatsPerRow || 1));
                                                const seatIdx = i % (theater.layout?.mainFloor?.seatsPerRow || 1);
                                                const row = String.fromCharCode(65 + rowIdx);
                                                const seatNum = seatIdx + 1;
                                                const seatKey = `${row}${seatNum}`;
                                                const isRemoved = theater.layout?.removedSeats?.includes(seatKey);
                                                const isVIP = theater.seatConfig?.find(s => s.row === row && s.seatNumber === seatNum)?.seatType === 'vip';
                                                const isPremium = theater.seatConfig?.find(s => s.row === row && s.seatNumber === seatNum)?.seatType === 'premium';

                                                return (
                                                    <div
                                                        key={i}
                                                        className={`mini-seat-dot ${isRemoved ? 'removed' : ''} ${isVIP ? 'vip' : isPremium ? 'premium' : ''}`}
                                                    />
                                                );
                                            })}
                                        </div>
                                        {theater.layout?.hasBalcony && (
                                            <div className="mini-balcony-indicator">BALCONY</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="card-body">
                                {theater.description && (
                                    <p className="description">{theater.description}</p>
                                )}

                                <div className="stats-grid">
                                    <div className="stat">
                                        <FiUsers />
                                        <span>{theater.totalSeats || 0} seats</span>
                                    </div>
                                    <div className="stat">
                                        <FiGrid />
                                        <span>{theater.layout?.mainFloor?.rows || 0} rows</span>
                                    </div>
                                    {theater.layout?.hasBalcony && (
                                        <div className="stat balcony">
                                            <FiLayers />
                                            <span>Balcony</span>
                                        </div>
                                    )}
                                    {theater.vipSeats && theater.vipSeats > 0 && (
                                        <div className="stat vip">
                                            <span>⭐ {theater.vipSeats} VIP</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="card-actions">
                                <button
                                    className="action-btn preview"
                                    onClick={() => router.push(`/admin/theaters/${theater._id}/view`)}
                                    title="View Theater"
                                >
                                    <FiEye />
                                </button>
                                <button
                                    className="action-btn edit"
                                    onClick={() => router.push(`/admin/theaters/${theater._id}/edit`)}
                                    title="Edit"
                                >
                                    <FiEdit2 />
                                </button>
                                <button
                                    className="action-btn delete"
                                    onClick={() => setDeleteConfirm(theater._id)}
                                    title="Delete"
                                >
                                    <FiTrash2 />
                                </button>
                            </div>

                            <div
                                className="navigate-arrow"
                                onClick={() => router.push(`/admin/theaters/${theater._id}/edit`)}
                            >
                                <FiChevronRight />
                            </div>
                        </motion.div>
                    ))
                    }
                </AnimatePresence >
            </div >

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                title="Delete Theater"
                message="Are you sure you want to permanently delete this theater?"
                itemName={theaters.find(t => t._id === deleteConfirm)?.name}
                confirmText="Delete Theater"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
                onCancel={() => setDeleteConfirm(null)}
            />

            <AnimatePresence>
                {previewTheater && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setPreviewTheater(null)}
                    >
                        <motion.div
                            className="preview-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e: MouseEvent) => e.stopPropagation()}
                        >
                            <button
                                className="close-modal-btn"
                                onClick={() => setPreviewTheater(null)}
                            >
                                <FiX />
                            </button>
                            <h2>{previewTheater.name}</h2>
                            <div className="preview-content">
                                <div className="mini-stage">STAGE</div>
                                <div className="mini-seats">
                                    {Array.from({ length: previewTheater.layout?.mainFloor?.rows || 5 }).map((_, row) => (
                                        <div key={row} className="mini-row">
                                            {Array.from({ length: previewTheater.layout?.mainFloor?.seatsPerRow || 10 }).map((_, seat) => (
                                                <div
                                                    key={seat}
                                                    className={`mini-seat ${previewTheater.seatConfig?.find(
                                                        s => s.row === String.fromCharCode(65 + row) && s.seatNumber === seat + 1
                                                    )?.seatType || 'standard'
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                                {previewTheater.layout?.hasBalcony && (
                                    <div className="balcony-label">+ Balcony ({previewTheater.layout.balcony?.rows} rows)</div>
                                )}
                            </div>
                            <div className="preview-stats">
                                <span>Total: {previewTheater.totalSeats} seats</span>
                                {previewTheater.vipSeats && previewTheater.vipSeats > 0 && <span>VIP: {previewTheater.vipSeats}</span>}
                                {previewTheater.premiumSeats && previewTheater.premiumSeats > 0 && <span>Premium: {previewTheater.premiumSeats}</span>}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default TheaterListPage;
