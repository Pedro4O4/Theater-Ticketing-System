'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar, FiMapPin, FiTag, FiUsers,
    FiInfo, FiArrowLeft, FiX, FiMaximize2, FiShoppingCart,
    FiCheck, FiGrid
} from 'react-icons/fi';
import { useAuth } from '@/auth/AuthContext';
import api from '@/services/api';
import { getImageUrl } from '@/utils/imageHelper';
import SeatSelector from '@/components/Booking component/SeatSelector';
import './EventDetailPage.css';

interface SeatPricing {
    seatType: string;
    price: number;
}

interface SeatData {
    availableCount: number;
    bookedCount: number;
    seats?: any[];
    bookedSeatKeys?: string[];  // Array of seat keys that are booked
    theater?: {
        layout?: any;
    };
}

interface Event {
    _id: string;
    title: string;
    description?: string;
    date?: string;
    location?: string;
    category?: string;
    image?: string;
    ticketPrice?: number;
    totalTickets?: number;
    remainingTickets?: number;
    hasTheaterSeating?: boolean;
    seatPricing?: SeatPricing[];
}

interface DateInfo {
    day: string;
    month: string;
    year: number;
    time: string;
    full: string;
}

interface TicketStatus {
    status: string;
    text: string;
    color: string;
}

interface EventDetailsPageProps {
    id: string;
}

const EventDetailsPage = ({ id }: EventDetailsPageProps) => {
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState<boolean>(false);
    const [imageLoaded, setImageLoaded] = useState<boolean>(false);

    const [seatData, setSeatData] = useState<SeatData | null>(null);
    const [seatLoading, setSeatLoading] = useState<boolean>(false);

    useEffect(() => {
        if (!id) {
            setError('Event ID is missing.');
            setLoading(false);
            return;
        }

        const fetchEventDetails = async () => {
            try {
                const response = await api.get(`/event/${id}`);

                if (response.data.success && response.data.data) {
                    setEvent(response.data.data);
                } else {
                    throw new Error('Failed to load event details');
                }
            } catch (err: any) {
                console.error("Error fetching event:", err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetails();
    }, [id]);

    useEffect(() => {
        if (event?.hasTheaterSeating && event?._id) {
            const fetchSeatData = async () => {
                try {
                    setSeatLoading(true);
                    const response = await api.get(`/booking/event/${event._id}/seats`);
                    if (response.data.success) {
                        setSeatData(response.data.data);
                    }
                } catch (err) {
                    console.error('Error fetching seat data:', err);
                } finally {
                    setSeatLoading(false);
                }
            };
            fetchSeatData();
        }
    }, [event]);

    const formatDate = (dateString: string): DateInfo => {
        const date = new Date(dateString);
        return {
            day: date.toLocaleDateString('en-US', { day: 'numeric' }),
            month: date.toLocaleDateString('en-US', { month: 'short' }),
            year: date.getFullYear(),
            time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            full: date.toLocaleString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        };
    };

    const getTicketStatus = (): TicketStatus => {
        if (!event) return { status: '', text: '', color: '' };
        const remaining = event.remainingTickets ?? event.totalTickets ?? 0;
        const total = event.totalTickets ?? 0;

        if (remaining === 0) return { status: 'sold-out', text: 'Sold Out', color: '#EF4444' };
        if (remaining < 20) return { status: 'limited', text: `Only ${remaining} left!`, color: '#F59E0B' };
        return { status: 'available', text: `${remaining} tickets available`, color: '#10B981' };
    };

    const ticketInfo = getTicketStatus();
    const dateInfo = event?.date ? formatDate(event.date) : null;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1, delayChildren: 0.2 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
    };

    if (loading) {
        return (
            <div className="detail-page">
                <div className="loading-detail">
                    <div className="loading-shimmer"></div>
                    <div className="loading-content">
                        <div className="shimmer-line large"></div>
                        <div className="shimmer-line medium"></div>
                        <div className="shimmer-line small"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <motion.div
                className="detail-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="error-state">
                    <span className="error-emoji">😕</span>
                    <h2>Oops! Something went wrong</h2>
                    <p>{error}</p>
                    <motion.button
                        className="back-btn"
                        onClick={() => router.push('/events')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiArrowLeft /> Back to Events
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    if (!event) return null;

    return (
        <motion.div
            className="detail-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="detail-bg-effect"></div>

            <div className="detail-container">
                <motion.button
                    className="floating-back-btn"
                    onClick={() => router.push('/events')}
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    whileHover={{ x: -5 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <FiArrowLeft size={20} />
                    <span>Back</span>
                </motion.button>

                <motion.div
                    className="detail-card"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <motion.div
                        className="detail-image-section"
                        variants={itemVariants}
                    >
                        <div
                            className="detail-image-wrapper"
                            onClick={() => setShowImageModal(true)}
                        >
                            {!imageLoaded && (
                                <div className="image-skeleton-detail">
                                    <div className="skeleton-shimmer"></div>
                                </div>
                            )}

                            <img
                                src={getImageUrl(event.image)}
                                alt={event.title}
                                className={`detail-image ${imageLoaded ? 'loaded' : ''}`}
                                onLoad={() => setImageLoaded(true)}
                            />

                            <div className="image-expand-hint">
                                <FiMaximize2 />
                                <span>Click to expand</span>
                            </div>

                            {dateInfo && (
                                <div className="date-badge">
                                    <span className="date-day">{dateInfo.day}</span>
                                    <span className="date-month">{dateInfo.month}</span>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    <motion.div
                        className="detail-content"
                        variants={itemVariants}
                    >
                        <div className="detail-header">
                            <h1 className="event-title-main">{event.title}</h1>
                            <div className={`status-badge ${ticketInfo.status}`}>
                                {ticketInfo.status === 'available' && <FiCheck />}
                                {ticketInfo.text}
                            </div>
                        </div>

                        <div className="info-grid">
                            <motion.div
                                className="info-card"
                                whileHover={{ y: -3, scale: 1.02 }}
                            >
                                <div className="info-icon">
                                    <FiCalendar />
                                </div>
                                <div className="info-text">
                                    <span className="info-label">Date & Time</span>
                                    <span className="info-value">{dateInfo?.full || 'TBA'}</span>
                                </div>
                            </motion.div>

                            <motion.div
                                className="info-card"
                                whileHover={{ y: -3, scale: 1.02 }}
                            >
                                <div className="info-icon">
                                    <FiMapPin />
                                </div>
                                <div className="info-text">
                                    <span className="info-label">Location</span>
                                    <span className="info-value">{event.location || 'TBA'}</span>
                                </div>
                            </motion.div>

                            <motion.div
                                className="info-card"
                                whileHover={{ y: -3, scale: 1.02 }}
                            >
                                <div className="info-icon">
                                    <FiTag />
                                </div>
                                <div className="info-text">
                                    <span className="info-label">Category</span>
                                    <span className="info-value">{event.category || 'General'}</span>
                                </div>
                            </motion.div>

                            <motion.div
                                className="info-card"
                                whileHover={{ y: -3, scale: 1.02 }}
                            >
                                <div className="info-icon">
                                    <FiUsers />
                                </div>
                                <div className="info-text">
                                    <span className="info-label">Available Tickets</span>
                                    <span className="info-value" style={{ color: ticketInfo.color }}>
                                        {event.remainingTickets ?? event.totalTickets ?? 'N/A'}
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        <div className="description-section">
                            <h3><FiInfo /> About This Event</h3>
                            <p>{event.description || 'No description available.'}</p>
                        </div>

                        <div className="action-section">
                            {event.hasTheaterSeating && (
                                <div className="theater-seating-info">
                                    <div className="theater-badge">
                                        <FiGrid />
                                        <span>Theater Seating Event</span>
                                    </div>
                                    {seatLoading ? (
                                        <div className="seat-availability-loading">Loading seat availability...</div>
                                    ) : seatData && (
                                        <>
                                            <div className="seat-availability-stats">
                                                <div className="stat-item available">
                                                    <span className="stat-number">{seatData.availableCount}</span>
                                                    <span className="stat-label">Available</span>
                                                </div>
                                                <div className="stat-item booked">
                                                    <span className="stat-number">{seatData.bookedCount}</span>
                                                    <span className="stat-label">Booked</span>
                                                </div>
                                                <div className="stat-item total">
                                                    <span className="stat-number">{seatData.seats?.length || 0}</span>
                                                    <span className="stat-label">Total Seats</span>
                                                </div>
                                            </div>
                                            {/* SeatSelector fetches its own data, so we just need the eventId */}
                                            <div className="theater-preview-container">
                                                <div className="theater-seat-container">
                                                    <SeatSelector
                                                        eventId={event._id}
                                                        readOnly={true}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="price-display">
                                <span className="price-label">
                                    {event.hasTheaterSeating ? 'Starting from' : 'Price per ticket'}
                                </span>
                                <span className="price-amount">
                                    ${event.hasTheaterSeating
                                        ? (event.seatPricing?.find(p => p.seatType === 'standard')?.price?.toFixed(2) ||
                                            event.seatPricing?.[0]?.price?.toFixed(2) ||
                                            '0.00')
                                        : (event.ticketPrice?.toFixed(2) || '0.00')
                                    }
                                </span>
                            </div>

                            {user?.role === "Standard User" && (
                                <motion.button
                                    className={`book-now-btn-detail ${ticketInfo.status === 'sold-out' ? 'disabled' : ''}`}
                                    onClick={() => router.push(`/bookings/new/${event._id}`)}
                                    disabled={ticketInfo.status === 'sold-out'}
                                    whileHover={ticketInfo.status !== 'sold-out' ? { scale: 1.03 } : {}}
                                    whileTap={ticketInfo.status !== 'sold-out' ? { scale: 0.98 } : {}}
                                >
                                    {event.hasTheaterSeating ? <FiGrid /> : <FiShoppingCart />}
                                    {ticketInfo.status === 'sold-out'
                                        ? 'Sold Out'
                                        : event.hasTheaterSeating
                                            ? 'Select Seats'
                                            : 'Book Tickets'
                                    }
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </div>

            <AnimatePresence>
                {showImageModal && (
                    <motion.div
                        className="detail-image-modal"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="modal-image-container"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: "spring", damping: 25 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img src={getImageUrl(event.image)} alt={event.title} />
                            <motion.button
                                className="modal-close"
                                onClick={() => setShowImageModal(false)}
                                whileHover={{ scale: 1.1, rotate: 90 }}
                            >
                                <FiX size={24} />
                            </motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default EventDetailsPage;
