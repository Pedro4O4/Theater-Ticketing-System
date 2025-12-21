"use client";
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiMapPin, FiTag, FiX, FiMaximize2, FiShoppingCart, FiInfo } from 'react-icons/fi';
import './EventCard.css';
import { getImageUrl } from '@/utils/imageHelper';
import { Event } from '@/types/event';
import { useAuth } from '@/auth/AuthContext';

interface EventCardProps {
    event: Event;
    index?: number;
}

const EventCard: React.FC<EventCardProps> = ({ event, index = 0 }) => {
    const [showFullImage, setShowFullImage] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const router = useRouter();
    const { user } = useAuth();

    // Support both _id (MongoDB) and id (Standard)
    const eventId = event._id || (event as any).id;

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getTicketStatus = () => {
        const remaining = event.remainingTickets ?? 0;
        if (remaining === 0) return { text: 'Sold Out', class: 'sold-out' };
        if (remaining < 20) return { text: `${remaining} left!`, class: 'limited' };
        return { text: `${remaining} available`, class: 'available' };
    };

    const ticketStatus = getTicketStatus();
    const isSoldOut = (event.remainingTickets ?? 0) === 0;

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
                        <div className={`ticket-badge ${ticketStatus.class}`}>{ticketStatus.text}</div>
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
                        <h3 className="card-title">{event.title}</h3>
                        {standardPrice !== undefined && (
                            <div className="price-tag">
                                <span className="price-amount">${standardPrice.toFixed(2)}</span>
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
                            <FiInfo /> <span>Details</span>
                        </button>

                        {(user?.role === "Standard User" || !user) && !isSoldOut && (
                            <button
                                className="card-action-btn primary"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/bookings/new/${eventId}`);
                                }}
                            >
                                <FiShoppingCart /> <span>Book Now</span>
                            </button>
                        )}

                        {isSoldOut && (
                            <button className="card-action-btn disabled" disabled>
                                Sold Out
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

