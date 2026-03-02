"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import ConfirmationDialog from '../AdminComponent/ConfirmationDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiMapPin, FiClock, FiTrash2, FiEye, FiAlertCircle, FiCheckCircle, FiUploadCloud, FiGrid } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './UserBookingPage.css';

interface Booking {
    _id: string;
    eventId: string;
    userId: string;
    numberOfTickets: number;
    totalPrice: number;
    status: 'pending' | 'confirmed' | 'cancelled';
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

    const [timers, setTimers] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchBookings();
    }, []);

    useEffect(() => {
        const updateTimers = () => {
            const newTimers: Record<string, string> = {};
            const now = new Date().getTime();

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
                        // Optionally update status locally to cancelled
                        booking.status = 'cancelled';
                    }
                }
            });
            setTimers(newTimers);
        };

        updateTimers();
        const interval = setInterval(updateTimers, 1000);
        return () => clearInterval(interval);
    }, [bookings]);

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
                            const isCancelled = booking.status === 'cancelled' || (booking as any).status === 'Cancelled';

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
                                                <strong>${booking.totalPrice.toFixed(2)}</strong>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="booking-card-footer">
                                        <Link href={`/bookings/${booking._id}`} className="view-details-btn">
                                            <FiEye /> Details
                                        </Link>
                                        {!isCancelled && (
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
