"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import ConfirmationDialog from '../AdminComponent/ConfirmationDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiMapPin, FiClock, FiTrash2, FiEye, FiAlertCircle, FiCheckCircle, FiUploadCloud, FiGrid, FiCopy } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './UserBookingPage.css';

interface Booking {
    _id: string;
    eventId: string;
    userId: string;
    numberOfTickets: number;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'canceled' | 'rejected';
    selectedSeats?: { section: string; row: string; seatNumber: number }[];
    createdAt: string;
    pendingExpiresAt?: string;
    isReceiptUploaded?: boolean;
    instapayReceipt?: string;
    hasTheaterSeating?: boolean;
}

interface EventData {
    _id: string;
    title: string;
    date: string;
    location: string;
    image: string;
    ticketPrice: number;
    organizerId?: {
        _id: string;
        name: string;
        instapayNumber?: string;
        instapayQR?: string;
    };
}

const UserBookingsPage = () => {
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [eventDetails, setEventDetails] = useState<Record<string, EventData>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteBookingId, setDeleteBookingId] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [cancellationLoading, setCancellationLoading] = useState(false);
    const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

    const [timers, setTimers] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        const updateTimers = () => {
            const newTimers: Record<string, string> = {};
            const now = new Date().getTime();
            const expiredIds: string[] = [];

            bookings.forEach(booking => {
                if (booking.status === 'pending' && booking.pendingExpiresAt) {
                    const expires = new Date(booking.pendingExpiresAt).getTime();
                    const distance = expires - now;

                    if (distance > 0) {
                        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                        newTimers[booking._id] = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                    } else {
                        newTimers[booking._id] = 'Expired';
                        expiredIds.push(booking._id);
                    }
                }
            });
            setTimers(newTimers);
            // Update expired bookings via setState instead of direct mutation
            if (expiredIds.length > 0) {
                setBookings(prev =>
                    prev.map(b =>
                        expiredIds.includes(b._id) ? { ...b, status: 'canceled' } : b
                    )
                );
            }
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bookings.length]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/user/bookings');

            let bookingsData: Booking[] = [];
            if (response.data.success !== undefined) {
                bookingsData = response.data.data;
            } else if (Array.isArray(response.data)) {
                bookingsData = response.data;
            }

            setBookings(bookingsData);

            // Fetch event details for each unique eventId
            const events: Record<string, EventData> = {};
            const missingEventIds: string[] = [];

            bookingsData.forEach(booking => {
                const eventVal = booking.eventId;
                if (typeof eventVal === 'object' && eventVal !== null) {
                    const id = (eventVal as any)._id || (eventVal as any).id;
                    if (id) {
                        events[id] = eventVal as any;
                        // Replace the object with its ID in the booking record for local lookup
                        booking.eventId = id;
                    }
                } else if (typeof eventVal === 'string' && eventVal && !events[eventVal]) {
                    missingEventIds.push(eventVal);
                }
            });

            // Fetch only events that weren't populated
            const uniqueMissingIds = Array.from(new Set(missingEventIds));

            if (uniqueMissingIds.length > 0) {
                await Promise.all(
                    uniqueMissingIds.map(async (eventId) => {
                        try {
                            const eventResp = await api.get(`/event/${eventId}`);
                            const data = eventResp.data.success ? eventResp.data.data : eventResp.data;
                            if (data) {
                                events[eventId] = data;
                            }
                        } catch (err) {
                            console.error(`Error fetching event ${eventId}:`, err);
                        }
                    })
                );
            }

            setEventDetails(events);
        } catch (err: any) {
            console.error("Error fetching bookings:", err);
            setError(err.response?.data?.message || "Failed to load bookings");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelClick = (bookingId: string) => {
        setDeleteBookingId(bookingId);
        setShowDeleteConfirm(true);
    };

    const confirmCancel = async () => {
        if (!deleteBookingId) return;
        try {
            setCancellationLoading(true);
            await api.delete(`/booking/${deleteBookingId}`);

            // Remove from local state so it disappears from the list
            setBookings(prev => prev.filter(b => b._id !== deleteBookingId));

            toast.success("Booking cancelled successfully");
            setShowDeleteConfirm(false);
        } catch (err: any) {
            console.error("Error canceling booking:", err);
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setCancellationLoading(false);
        }
    };

    const handleUploadClick = (bookingId: string) => {
        router.push(`/bookings/${bookingId}/upload-receipt`);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (loading) return (
        <div className="bookings-page-loading">
            <div className="spinner"></div>
            <p>Loading your bookings...</p>
        </div>
    );

    if (error) return (
        <div className="bookings-page-error">
            <FiAlertCircle size={48} />
            <p>{error}</p>
            <button onClick={fetchBookings}>Try Again</button>
        </div>
    );

    return (
        <div className="user-bookings-container">
            <div className="bookings-hero">
                <h1>My Bookings</h1>
                <p>Manage your event reservations and tickets</p>
                <div className="hero-stats">
                    <div className="stat-card">
                        <span className="stat-value">{bookings.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                    <div className="stat-card">
                        <span className="stat-value">{bookings.filter(b => b.status === 'confirmed').length}</span>
                        <span className="stat-label">Confirmed</span>
                    </div>
                </div>
            </div>

            {/* Pending bookings banner at top */}
            {(() => {
                const pendingBookings = bookings.filter(b => b.status === 'pending' && !b.isReceiptUploaded);
                if (pendingBookings.length === 0) return null;
                return (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                            margin: '0 0 28px', padding: '24px', borderRadius: '20px',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(239, 68, 68, 0.10))',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            backdropFilter: 'blur(10px)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', color: '#fbbf24', fontWeight: 700, fontSize: '1.3rem' }}>
                            <FiAlertCircle size={26} />
                            Action Required — {pendingBookings.length} Pending Booking{pendingBookings.length > 1 ? 's' : ''}
                        </div>

                        {pendingBookings.map(booking => {
                            const event = eventDetails[booking.eventId];
                            const timeLeft = timers[booking._id];
                            const instapayQR = event?.organizerId?.instapayQR;
                            const instapayNumber = event?.organizerId?.instapayNumber ?? '';

                            return (
                                <div key={booking._id} style={{
                                    padding: '20px', borderRadius: '16px', marginBottom: '14px',
                                    background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)'
                                }}>
                                    {/* Event info + timer */}
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <strong style={{ fontSize: '1.2rem', display: 'block', marginBottom: '4px' }}>{event?.title || 'Event'}</strong>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '1rem', color: '#d1d5db', flexWrap: 'wrap' }}>
                                                <span style={{ fontWeight: 700, color: '#fbbf24', fontSize: '1.1rem' }}>{booking.totalPrice.toFixed(2)} EGP</span>
                                                <span>{booking.numberOfTickets} ticket{booking.numberOfTickets > 1 ? 's' : ''}</span>
                                                {booking.selectedSeats && booking.selectedSeats.length > 0 && (
                                                    <span style={{ color: '#a78bfa' }}>
                                                        Seats: {booking.selectedSeats.map(s => `${s.row}${s.seatNumber}`).join(', ')}
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                        {timeLeft && timeLeft !== 'Expired' && (
                                            <span style={{
                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                padding: '6px 16px', borderRadius: '24px',
                                                background: 'rgba(245, 158, 11, 0.25)', color: '#f59e0b',
                                                fontSize: '1.1rem', fontWeight: 700
                                            }}>
                                                <FiClock size={18} /> {timeLeft}
                                            </span>
                                        )}
                                        {timeLeft === 'Expired' && (
                                            <span style={{ padding: '6px 16px', borderRadius: '24px', background: 'rgba(239, 68, 68, 0.25)', color: '#ef4444', fontSize: '1rem', fontWeight: 700 }}>Expired</span>
                                        )}
                                    </div>

                                    {/* Payment info text */}
                                    <p style={{ fontSize: '0.95rem', color: '#e5e7eb', margin: '0 0 16px', lineHeight: 1.5 }}>
                                        Pay <strong style={{ color: '#fbbf24' }}>{booking.totalPrice.toFixed(2)} EGP</strong> via InstaPay and upload your receipt before time runs out.
                                    </p>

                                    {/* InstaPay QR image + number */}
                                    {(instapayQR || instapayNumber) && (
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                            margin: '12px 0 16px', padding: '16px',
                                            background: 'rgba(255,255,255,0.03)', borderRadius: '12px',
                                            border: '1px solid rgba(139, 92, 246, 0.2)'
                                        }}>
                                            {instapayQR && (
                                                <img
                                                    src={instapayQR}
                                                    alt="InstaPay QR"
                                                    style={{
                                                        width: '220px', height: '220px', objectFit: 'contain',
                                                        borderRadius: '10px', border: '2px solid rgba(139, 92, 246, 0.4)'
                                                    }}
                                                />
                                            )}
                                            <div style={{ width: '100%' }}>
                                                {instapayNumber && (
                                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                                        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>InstaPay Number:</span>
                                                        <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.4px' }}>{instapayNumber}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                navigator.clipboard.writeText(instapayNumber).catch(() => {
                                                                    const ta = document.createElement('textarea'); ta.value = instapayNumber; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
                                                                });
                                                                setCopiedNumber(booking._id);
                                                                toast.success('InstaPay number copied!');
                                                                setTimeout(() => setCopiedNumber(null), 2000);
                                                            }}
                                                            style={{
                                                                background: copiedNumber === booking._id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(139, 92, 246, 0.15)',
                                                                border: '1px solid ' + (copiedNumber === booking._id ? 'rgba(16, 185, 129, 0.4)' : 'rgba(139, 92, 246, 0.3)'),
                                                                color: copiedNumber === booking._id ? '#10b981' : '#a78bfa',
                                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                                                                fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '8px',
                                                                transition: 'all 0.2s'
                                                            }}
                                                        >
                                                            <FiCopy size={13} /> {copiedNumber === booking._id ? 'Copied!' : 'Copy'}
                                                        </button>
                                                    </div>
                                                )}
                                                {instapayQR && (
                                                    <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '6px 0 0', textAlign: 'center' }}>
                                                        Scan QR → Send {booking.totalPrice.toFixed(2)} EGP
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <motion.button
                                        onClick={() => handleUploadClick(booking._id)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', width: '100%',
                                            padding: '14px', borderRadius: '12px',
                                            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white',
                                            border: 'none', cursor: 'pointer', fontSize: '1rem', fontWeight: 700,
                                            boxShadow: '0 6px 20px rgba(139, 92, 246, 0.35)',
                                            letterSpacing: '0.3px'
                                        }}
                                    >
                                        <FiUploadCloud size={20} /> Upload Receipt Now
                                    </motion.button>
                                </div>
                            );
                        })}
                    </motion.div>
                );
            })()}

            {bookings.length === 0 ? (
                <div className="empty-bookings">
                    <div className="empty-icon"><FiCalendar size={60} /></div>
                    <h3>No Bookings Found</h3>
                    <p>You haven't made any bookings yet. Start exploring events now!</p>
                    <Link href="/events" className="browse-btn">Browse Events</Link>
                </div>
            ) : (
                <div className="bookings-grid">
                    <AnimatePresence>
                        {bookings.map((booking, index) => {
                            const event = eventDetails[booking.eventId];
                            const isCancelled = booking.status === 'canceled';

                            const isPending = booking.status === 'pending';
                            const timeLeft = timers[booking._id];

                            return (
                                <motion.div
                                    key={booking._id}
                                    className={`booking-card ${isCancelled ? 'cancelled' : ''} ${isPending ? 'pending' : ''}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <div className="booking-status-badge">
                                        {isCancelled ? 'Cancelled' : isPending ? (
                                            <>
                                                Pending
                                                {timeLeft && timeLeft !== 'Expired' && !booking.isReceiptUploaded && (
                                                    <span className="booking-timer">
                                                        <FiClock size={12} /> {timeLeft}
                                                    </span>
                                                )}
                                            </>
                                        ) : 'Confirmed'}
                                    </div>

                                    <div className="booking-card-header">
                                        <h3>{event?.title || 'Loading Event...'}</h3>
                                        <span className="booking-id">ID: {booking._id.substring(0, 8)}...</span>
                                    </div>

                                    <div className="booking-card-body">
                                        <div className="info-item">
                                            <FiCalendar />
                                            <span>{event ? formatDate(event.date) : '...'}</span>
                                        </div>
                                        <div className="info-item">
                                            <FiMapPin />
                                            <span>{event?.location || '...'}</span>
                                        </div>
                                        <div className="info-item">
                                            <FiClock />
                                            <span>Booked on {formatDate(booking.createdAt)}</span>
                                        </div>

                                        {isPending && booking.isReceiptUploaded && (
                                            <div style={{
                                                margin: '12px 0', padding: '10px 14px', borderRadius: '10px',
                                                background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)',
                                                display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600
                                            }}>
                                                <FiCheckCircle size={16} /> Receipt uploaded — awaiting verification
                                            </div>
                                        )}

                                        <div className="booking-summary">
                                            <div className="summary-row">
                                                <span>Tickets</span>
                                                <strong>{booking.numberOfTickets}</strong>
                                            </div>
                                            {booking.selectedSeats && booking.selectedSeats.length > 0 && (
                                                <div className="summary-row seats">
                                                    <span>Seats</span>
                                                    <div className="seats-list">
                                                        {booking.selectedSeats.map(s => `${s.row}${s.seatNumber}`).join(', ')}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="summary-row total">
                                                <span>Total Price</span>
                                                <strong>{booking.totalPrice.toFixed(2)} EGP</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="booking-card-footer">
                                        <Link href={`/bookings/${booking._id}`} className="view-details-btn">
                                            <FiEye /> Details
                                        </Link>
                                        {!isCancelled && isPending && (
                                            <button
                                                onClick={() => handleCancelClick(booking._id)}
                                                className="cancel-btn"
                                                disabled={cancellationLoading}
                                            >
                                                <FiTrash2 /> Cancel
                                            </button>
                                        )}
                                        {isPending && !booking.isReceiptUploaded && (
                                            <button
                                                onClick={() => handleUploadClick(booking._id)}
                                                className="upload-receipt-btn"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                                    background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa',
                                                    border: '1px solid rgba(139, 92, 246, 0.4)', cursor: 'pointer',
                                                    fontSize: '0.85rem', fontWeight: 500, transition: 'all 0.2s'
                                                }}
                                            >
                                                <FiUploadCloud /> Upload Receipt
                                            </button>
                                        )}
                                        {booking.status === 'confirmed' && booking.hasTheaterSeating && (
                                            <Link
                                                href={`/bookings/${booking._id}/tickets`}
                                                className="view-tickets-btn"
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '0.5rem 1rem', borderRadius: '8px',
                                                    background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white',
                                                    border: 'none', cursor: 'pointer', textDecoration: 'none',
                                                    fontSize: '0.85rem', fontWeight: 600, transition: 'all 0.2s',
                                                    boxShadow: '0 2px 10px rgba(139, 92, 246, 0.3)'
                                                }}
                                            >
                                                <FiGrid /> QR Tickets
                                            </Link>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            <ConfirmationDialog
                isOpen={showDeleteConfirm}
                title="Cancel Booking"
                message="Are you sure you want to cancel this booking? Your seats will be released."
                itemName={eventDetails[bookings.find(b => b._id === deleteBookingId)?.eventId || '']?.title}
                confirmText={cancellationLoading ? "Cancelling..." : "Yes, Cancel Booking"}
                cancelText="Keep Booking"
                variant="danger"
                onConfirm={confirmCancel}
                onCancel={() => setShowDeleteConfirm(false)}
                isLoading={cancellationLoading}
                disabled={cancellationLoading}
            />

        </div>
    );
};

export default UserBookingsPage;
