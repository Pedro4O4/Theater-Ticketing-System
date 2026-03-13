"use client";
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiMapPin, FiTag, FiX, FiMaximize2, FiShoppingCart, FiInfo, FiAlertCircle, FiClock, FiShieldOff, FiLoader } from 'react-icons/fi';
import './EventCard.css';
import { getImageUrl } from '@/utils/imageHelper';
import { Event } from '@/types/event';
import { useAuth } from '@/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useInView } from 'react-intersection-observer';
import api from '@/services/api';

interface EventCardProps {
    event: Event;
    index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
    const [showFullImage, setShowFullImage] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useLanguage();

    // Intersection observer for lazy loading seat data
    const { ref, inView } = useInView({
        triggerOnce: true,
        threshold: 0.1,
    });

    const [seatData, setSeatData] = useState<any>(null);
    const [seatLoading, setSeatLoading] = useState(false);

    // Support both _id (MongoDB) and id (Standard)
    const eventId = event._id || (event as any).id;

    // Fetch seat data when theater event comes into view
    React.useEffect(() => {
        if (inView && event.hasTheaterSeating && !seatData && !seatLoading) {
            const fetchSeatData = async () => {
                try {
                    setSeatLoading(true);
                    const response = await api.get<any>(`/booking/event/${eventId}/seats`);
                    const data = response.data.success ? response.data.data : response.data;
                    if (data) {
                        setSeatData(data);
                    }
                } catch (err) {
                    console.error('Error fetching card seat data:', err);
                } finally {
                    setSeatLoading(false);
                }
            };
            fetchSeatData();
        }
    }, [inView, event.hasTheaterSeating, eventId, seatData, seatLoading]);

    const seatCounts = React.useMemo(() => {
        if (!seatData || !seatData.seats) return null;

        const activeSeats = seatData.seats.filter((s: any) => s.isActive);
        const hasBalcony = activeSeats.some((s: any) => (s.section || 'main') === 'balcony');

        const getStats = (section?: string) => {
            const sectionSeats = section
                ? activeSeats.filter((s: any) => (s.section || 'main') === section)
                : activeSeats;
            return {
                available: sectionSeats.filter((s: any) => !s.isBooked).length,
                count: sectionSeats.length
            };
        };

        return {
            total: getStats(),
            main: getStats('main'),
            balcony: getStats('balcony'),
            hasBalcony
        };
    }, [seatData]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            timeZone: 'Africa/Cairo',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTicketStatus = () => {
        const remaining = event.remainingTickets ?? 0;
        if (remaining === 0) return { text: t('card.soldOut'), class: 'sold-out' };
        if (remaining < 20) return { text: `${remaining} ${t('card.left')}`, class: 'limited' };
        return { text: `${remaining} ${t('card.available')}`, class: 'available' };
    };

    const ticketStatus = getTicketStatus();
    const isSoldOut = (event.remainingTickets ?? 0) === 0;

    const isExpired = useMemo(() => {
        if (!event.date) return false;
        const eventDate = new Date(event.date);
        const expirationDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after event date
        return new Date() >= expirationDate;
    }, [event.date]);

    const isPastDeadline = useMemo(() => {
        if (!event.cancellationDeadline) return false;
        return new Date() > new Date(event.cancellationDeadline);
    }, [event.cancellationDeadline]);

    const formatDeadline = (deadline?: string) => {
        if (!deadline) return null;
        return new Date(deadline).toLocaleDateString('en-US', {
            timeZone: 'Africa/Cairo',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Get price from standard chairs if it's a theater event
    const standardPrice = useMemo(() => {
        if (event.hasTheaterSeating && event.seatPricing) {
            const standard = event.seatPricing.find(p => p.seatType.toLowerCase() === 'standard');
            return standard ? standard.price : event.ticketPrice;
        }
        return event.ticketPrice;
    }, [event]);

    return (
        <>
            <motion.div
                ref={ref}
                className="event-card-modern"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                    duration: 0.5,
                    delay: index * 0.1,
                    ease: [0.25, 0.46, 0.45, 0.94]
                }}
                whileHover={{
                    y: -8,
                    transition: { duration: 0.3, ease: "easeOut" }
                }}
                whileTap={{ scale: 0.98 }}
            >
                <div className="card-image-wrapper">
                    <div className="image-click-area" onClick={() => setShowFullImage(true)}>
                        {!imageLoaded && (
                            <div className="image-skeleton">
                                <div className="skeleton-shimmer"></div>
                            </div>
                        )}

                        <img
                            src={getImageUrl(event.image)}
                            alt={event.title}
                            className={`card-image ${imageLoaded ? 'loaded' : ''}`}
                            onLoad={() => setImageLoaded(true)}
                        />
                        <div className="image-gradient-overlay"></div>
                        
                        {!isExpired && (
                            event.hasTheaterSeating ? (
                                <div className="availability-mini-grid">
                                    {seatLoading ? (
                                        <div className="mini-stat-loading">
                                            <FiLoader className="spin" size={14} />
                                        </div>
                                    ) : seatCounts ? (
                                        <>
                                            <div className="mini-stat total" title={t('events.stats.total')}>
                                                <span className="mini-value">{seatCounts.total.available}</span>
                                                <span className="mini-label">{t('events.stats.total')}</span>
                                            </div>
                                            <div className="mini-stat main" title={t('events.stats.main')}>
                                                <span className="mini-value">{seatCounts.main.available}</span>
                                                <span className="mini-label">{t('events.stats.main')}</span>
                                            </div>
                                            {seatCounts.hasBalcony && (
                                                <div className="mini-stat balcony" title={t('events.stats.balcony')}>
                                                    <span className="mini-value">{seatCounts.balcony.available}</span>
                                                    <span className="mini-label">{t('events.stats.balcony')}</span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={`ticket-badge ${ticketStatus.class}`}>{ticketStatus.text}</div>
                                    )}
                                </div>
                            ) : (
                                <div className={`ticket-badge ${ticketStatus.class}`}>{ticketStatus.text}</div>
                            )
                        )}

                        <motion.div className="expand-icon" initial={{ opacity: 0 }} whileHover={{ opacity: 1, scale: 1.1 }}>
                            <FiMaximize2 size={20} />
                        </motion.div>
                    </div>

                    {isSoldOut && (
                        <div className="sold-out-overlay-badge">
                            <span>Sold Out</span>
                        </div>
                    )}
                </div>

                <div className="card-content">
                    <div className="card-info-header">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <h3 className="card-title">{event.title}</h3>
                            {isExpired && (
                                <div className="expired-event-badge">
                                    <FiAlertCircle size={15} /> <span>Expired Event</span>
                                </div>
                            )}
                        </div>
                        {standardPrice !== undefined && (
                            <div className="price-tag" style={{ alignSelf: 'flex-start' }}>
                                <span className="price-amount">{standardPrice.toFixed(2)} EGP</span>
                            </div>
                        )}
                    </div>

                    <div className="card-meta">
                        {event.date && (
                            <div className="meta-item">
                                <FiCalendar className="meta-icon" />
                                <span>{formatDate(event.date)}</span>
                            </div>
                        )}
                        {event.startTime && (
                            <div className="meta-item">
                                <FiClock className="meta-icon" />
                                <span>{event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</span>
                            </div>
                        )}
                        {event.cancellationDeadline && (
                            <div className={`meta-item ${isPastDeadline ? 'deadline-passed' : 'deadline-active'}`}>
                                <FiShieldOff className="meta-icon" />
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Refund Deadline:</span>
                                    <span>{formatDeadline(event.cancellationDeadline)}</span>
                                    {isPastDeadline && !isExpired && (
                                        <span className="deadline-warning-text" style={{ color: '#ef4444', fontSize: '0.7rem', fontWeight: 700 }}>
                                            Returns Disabled
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}
                        {event.location && (
                            <div className="meta-item">
                                <FiMapPin className="meta-icon" />
                                <span>{event.location}</span>
                            </div>
                        )}
                        {event.category && (
                            <div className="meta-item category-tag">
                                <FiTag className="meta-icon" />
                                <span>{event.category}</span>
                            </div>
                        )}
                    </div>

                    <div className="card-actions">
                        <button
                            className="card-action-btn secondary"
                            onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/events/${eventId}`);
                            }}
                        >
                            <FiInfo /> <span>{t('card.details')}</span>
                        </button>

                        {(user?.role === "Standard User" || !user) && !isSoldOut && !isExpired && (
                            <button
                                className="card-action-btn primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/bookings/new/${eventId}`);
                                }}
                            >
                                <FiShoppingCart /> <span>{t('card.bookNow')}</span>
                            </button>
                        )}

                        {(isSoldOut && !isExpired) && (
                            <button className="card-action-btn disabled" disabled>
                                {t('card.soldOut')}
                            </button>
                        )}
                    </div>
                </div>
                <div className="card-glow"></div>
            </motion.div>

            {typeof window !== 'undefined' && createPortal(
                <AnimatePresence>
                    {showFullImage && (
                        <motion.div
                            className="image-modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                        >
                            <motion.div
                                className="image-modal-content"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img src={getImageUrl(event.image)} alt={event.title} className="modal-image" />
                                <motion.button
                                    className="modal-close-btn"
                                    onClick={() => setShowFullImage(false)}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <FiX size={24} />
                                </motion.button>
                                <div className="modal-title">{event.title}</div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </>
    );
};

export default EventCard;

