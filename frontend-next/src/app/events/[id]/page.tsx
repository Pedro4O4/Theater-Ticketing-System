"use client";
import React, { useState, useEffect } from 'react';
import api from "@/services/api";
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar, FiMapPin, FiTag, FiUsers,
    FiInfo, FiArrowLeft, FiX, FiMaximize2, FiShoppingCart, FiCheck, FiGrid, FiDollarSign
} from 'react-icons/fi';
import '@/components/Event Components/EventDetailPage.css';
import '@/components/Booking component/BookingTicketForm.css';
import { getImageUrl } from '@/utils/imageHelper';
import { useAuth } from '@/auth/AuthContext';
import { Event } from '@/types/event';
import SeatSelector from '@/components/Booking component/SeatSelector';

const EventDetailsPage = () => {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const { user } = useAuth();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);

    const [seatData, setSeatData] = useState<any>(null);
    const [seatLoading, setSeatLoading] = useState(false);

    useEffect(() => {
        if (!id) {
            setError('Event ID is missing.');
            setLoading(false);
            return;
        }

        const fetchEventDetails = async () => {
            try {
                const response = await api.get<any>(`/event/${id}`);
                const data = response.data.success ? response.data.data : response.data;
                if (data) {
                    setEvent(data);
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
                    const response = await api.get<any>(`/booking/event/${event._id}/seats`);
                    const data = response.data.success ? response.data.data : response.data;
                    if (data) {
                        setSeatData(data);
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

    const formatDate = (dateString: string) => {
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

    const getTicketStatus = () => {
        if (!event) return {};
        const remaining = event.remainingTickets ?? 0;
        if (remaining === 0) return { status: 'sold-out', text: 'Sold Out', color: '#EF4444' };
        if (remaining < 20) return { status: 'limited', text: `Only ${remaining} left!`, color: '#F59E0B' };
        return { status: 'available', text: `${remaining} tickets available`, color: '#10B981' };
    };

    const ticketInfo: any = getTicketStatus();
    const dateInfo = event?.date ? formatDate(event.date) : null;

    if (loading) {
        return <div className="detail-page"><div className="loading-detail"><div className="loading-shimmer"></div><div className="loading-content"><div className="shimmer-line large"></div><div className="shimmer-line medium"></div><div className="shimmer-line small"></div></div></div></div>;
    }

    if (error) {
        return <motion.div className="detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="error-state"><span className="error-emoji">😕</span><h2>Oops! Something went wrong</h2><p>{error}</p><motion.button className="back-btn" onClick={() => router.push('/events')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}><FiArrowLeft /> Back to Events</motion.button></div></motion.div>;
    }

    if (!event) return null;

    // Check if this is a theater seating event
    const hasTheater = event.hasTheaterSeating;

    // For theater events, use fullpage layout like booking page
    if (hasTheater) {
        return (
            <motion.div className="booking-page fullpage-theater" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="booking-bg-effect"></div>
                <div className="theater-fullpage-container">
                    {/* Compact Header Bar - Same as booking page */}
                    <motion.div className="theater-header-bar" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                        <motion.button className="back-btn-compact" onClick={() => router.push('/events')} whileHover={{ x: -3 }}>
                            <FiArrowLeft size={18} /><span>Back</span>
                        </motion.button>
                        <div className="event-info-compact">
                            <img src={getImageUrl(event.image)} alt="" className="event-thumb" />
                            <div>
                                <h2>{event.title}</h2>
                                <div className="event-meta-compact">
                                    <span><FiCalendar /> {dateInfo?.full || 'TBA'}</span>
                                    <span><FiMapPin /> {event.location || 'TBA'}</span>
                                </div>
                            </div>
                        </div>
                        <div className="booking-summary-compact">
                            {seatData && (
                                <>
                                    <span className="seats-count">{seatData.availableCount} available</span>
                                    <span className="seats-count" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}>{seatData.bookedCount} booked</span>
                                </>
                            )}
                            {user?.role === "Standard User" && (
                                <motion.button
                                    className="confirm-booking-btn"
                                    onClick={() => router.push(`/bookings/new/${event._id}`)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{ padding: '10px 20px', minWidth: 'auto', fontSize: '0.9rem' }}
                                >
                                    <FiGrid /> Select Seats
                                </motion.button>
                            )}
                        </div>
                    </motion.div>

                    {/* Full Page Seat Selector - Same as booking page */}
                    <div className="theater-seat-area">
                        <SeatSelector eventId={event._id} readOnly={true} />
                    </div>
                </div>

                {/* Image Modal */}
                <AnimatePresence>
                    {showImageModal && (
                        <motion.div className="detail-image-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImageModal(false)}>
                            <motion.div className="modal-image-container" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()}>
                                <img src={getImageUrl(event.image)} alt={event.title} />
                                <motion.button className="modal-close" onClick={() => setShowImageModal(false)} whileHover={{ scale: 1.1, rotate: 90 }}><FiX size={24} /></motion.button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        );
    }

    // For non-theater events, use the original card layout
    return (
        <motion.div className="detail-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <div className="detail-bg-effect"></div>
            <div className="detail-container">
                <motion.button className="floating-back-btn" onClick={() => router.push('/events')} initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} whileHover={{ x: -5 }} whileTap={{ scale: 0.95 }}><FiArrowLeft size={20} /><span>Back</span></motion.button>

                <motion.div className="detail-card" initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } }}>
                    <motion.div className="detail-image-section" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <div className="detail-image-wrapper" onClick={() => event.image && setShowImageModal(true)}>
                            {event.image ? (
                                <>
                                    {!imageLoaded && <div className="image-skeleton-detail"><div className="skeleton-shimmer"></div></div>}
                                    <motion.img src={getImageUrl(event.image)} alt={event.title} className={`detail-image ${imageLoaded ? 'loaded' : ''}`} onLoad={() => setImageLoaded(true)} whileHover={{ scale: 1.03 }} transition={{ duration: 0.6 }} />
                                    <div className="image-expand-hint"><FiMaximize2 /><span>Click to expand</span></div>
                                </>
                            ) : (
                                <div className="detail-no-photo-placeholder">
                                    <FiX size={48} />
                                    <span>No Photo Uploaded</span>
                                </div>
                            )}
                            {dateInfo && <div className="date-badge"><span className="date-day">{dateInfo.day}</span><span className="date-month">{dateInfo.month}</span></div>}
                        </div>
                    </motion.div>

                    <motion.div className="detail-content" variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                        <div className="detail-header">
                            <h1 className="event-title-main">{event.title}</h1>
                            <div className={`status-badge ${ticketInfo.status}`}>{ticketInfo.status === 'available' && <FiCheck />}{ticketInfo.text}</div>
                        </div>
                        <div className="info-grid">
                            <motion.div className="info-card" whileHover={{ y: -3, scale: 1.02 }}><div className="info-icon"><FiCalendar /></div><div className="info-text"><span className="info-label">Date & Time</span><span className="info-value">{dateInfo?.full || 'TBA'}</span></div></motion.div>
                            <motion.div className="info-card" whileHover={{ y: -3, scale: 1.02 }}><div className="info-icon"><FiMapPin /></div><div className="info-text"><span className="info-label">Location</span><span className="info-value">{event.location || 'TBA'}</span></div></motion.div>
                            <motion.div className="info-card" whileHover={{ y: -3, scale: 1.02 }}><div className="info-icon"><FiTag /></div><div className="info-text"><span className="info-label">Category</span><span className="info-value">{event.category || 'General'}</span></div></motion.div>
                            <motion.div className="info-card" whileHover={{ y: -3, scale: 1.02 }}><div className="info-icon"><FiUsers /></div><div className="info-text"><span className="info-label">Available</span><span className="info-value" style={{ color: ticketInfo.color }}>{event.remainingTickets ?? 'N/A'}</span></div></motion.div>
                        </div>
                        <div className="description-section"><h3><FiInfo /> About This Event</h3><p>{event.description || 'No description available.'}</p></div>

                        <div className="action-section">
                            <div className="price-display">
                                <span className="price-label">Price per ticket</span>
                                <span className="price-amount">${event.ticketPrice?.toFixed(2) || '0.00'}</span>
                            </div>
                            {user?.role === "Standard User" && (
                                <motion.button className={`book-now-btn-detail ${ticketInfo.status === 'sold-out' ? 'disabled' : ''}`} onClick={() => router.push(`/bookings/new/${event._id}`)} disabled={ticketInfo.status === 'sold-out'} whileHover={ticketInfo.status !== 'sold-out' ? { scale: 1.03 } : {}} whileTap={ticketInfo.status !== 'sold-out' ? { scale: 0.98 } : {}}>
                                    <FiShoppingCart />
                                    {ticketInfo.status === 'sold-out' ? 'Sold Out' : 'Book Tickets'}
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            </div>
            <AnimatePresence>
                {showImageModal && (
                    <motion.div className="detail-image-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowImageModal(false)}>
                        <motion.div className="modal-image-container" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: "spring", damping: 25 }} onClick={(e) => e.stopPropagation()}>
                            <img src={getImageUrl(event.image)} alt={event.title} />
                            <motion.button className="modal-close" onClick={() => setShowImageModal(false)} whileHover={{ scale: 1.1, rotate: 90 }}><FiX size={24} /></motion.button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default EventDetailsPage;
