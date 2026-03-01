"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiCheckCircle, FiXCircle, FiClock,
    FiUser, FiPhone, FiMail, FiAlertCircle, FiGrid
} from 'react-icons/fi';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { toast } from 'react-toastify';
import '@/components/Event Components/EventBookings.css';

interface BookingSeat {
    row: string;
    seatNumber: number;
    section: string;
    seatType: string;
    price: number;
    attendeeName?: string;
    attendeePhone?: string;
}

interface BookingUser {
    _id: string;
    name: string;
    email: string;
    phone?: string;
}

interface Booking {
    _id: string;
    StandardId: BookingUser;
    eventId: string;
    numberOfTickets: number;
    totalPrice: number;
    status: string;
    hasTheaterSeating: boolean;
    selectedSeats: BookingSeat[];
    createdAt: string;
}

const EventBookingsPage = () => {
    const params = useParams();
    const eventId = params.id as string;
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchBookings();
    }, [eventId]);

    const fetchBookings = async () => {
        try {
            setIsLoading(true);
            const [bookingsRes, eventRes] = await Promise.all([
                api.get(`/booking/event/${eventId}/bookings`),
                api.get(`/event/${eventId}`),
            ]);
            const bData = bookingsRes.data.success ? bookingsRes.data.data : bookingsRes.data;
            const eData = eventRes.data.success ? eventRes.data.data : eventRes.data;
            setBookings(bData);
            setEventTitle(eData.title || '');
        } catch (err: any) {
            console.error('Error fetching bookings:', err);
            toast.error(err.response?.data?.message || 'Failed to load bookings');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId: string, status: string) => {
        try {
            setActionLoading(bookingId);
            await api.patch(`/booking/${bookingId}/status`, { status });
            toast.success(`Booking ${status === 'confirmed' ? 'approved' : 'rejected'}!`);
            fetchBookings();
        } catch (err: any) {
            console.error('Error updating booking:', err);
            toast.error(err.response?.data?.message || 'Failed to update booking');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'confirmed':
                return <span className="status-badge status-confirmed"><FiCheckCircle /> Approved</span>;
            case 'rejected':
                return <span className="status-badge status-rejected"><FiXCircle /> Rejected</span>;
            case 'pending':
            default:
                return <span className="status-badge status-pending"><FiClock /> Pending</span>;
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const pendingCount = bookings.filter(b => b.status === 'pending').length;
    const confirmedCount = bookings.filter(b => b.status === 'confirmed').length;
    const rejectedCount = bookings.filter(b => b.status === 'rejected').length;

    return (
        <ProtectedRoute requiredRole="Organizer">
            <div className="event-bookings-page">
                <div className="eb-bg-effect"></div>

                <motion.div
                    className="eb-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="eb-header">
                        <motion.button
                            className="eb-back-btn"
                            onClick={() => router.push('/my-events')}
                            whileHover={{ x: -3 }}
                        >
                            <FiArrowLeft size={18} /> Back to My Events
                        </motion.button>
                        <h1>Bookings for &quot;{eventTitle}&quot;</h1>

                        {/* Stats */}
                        <div className="eb-stats">
                            <div className="eb-stat pending">
                                <FiClock />
                                <span>{pendingCount} Pending</span>
                            </div>
                            <div className="eb-stat confirmed">
                                <FiCheckCircle />
                                <span>{confirmedCount} Approved</span>
                            </div>
                            <div className="eb-stat rejected">
                                <FiXCircle />
                                <span>{rejectedCount} Rejected</span>
                            </div>
                        </div>
                    </div>

                    {/* Bookings List */}
                    {isLoading ? (
                        <div className="eb-loading">
                            <div className="spinner-ring"></div>
                            <p>Loading bookings...</p>
                        </div>
                    ) : bookings.length === 0 ? (
                        <div className="eb-empty">
                            <FiGrid size={48} />
                            <h3>No bookings yet</h3>
                            <p>No one has booked tickets for this event.</p>
                        </div>
                    ) : (
                        <div className="eb-list">
                            <AnimatePresence>
                                {bookings.map((booking, index) => (
                                    <motion.div
                                        key={booking._id}
                                        className="eb-card"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                    >
                                        <div className="eb-card-top">
                                            <div className="eb-user-info">
                                                <div className="eb-user-avatar">
                                                    {booking.StandardId?.name?.charAt(0)?.toUpperCase() || '?'}
                                                </div>
                                                <div>
                                                    <h3>{booking.StandardId?.name || 'Unknown User'}</h3>
                                                    <div className="eb-user-meta">
                                                        <span><FiMail size={13} /> {booking.StandardId?.email || 'N/A'}</span>
                                                        {booking.StandardId?.phone && (
                                                            <span><FiPhone size={13} /> {booking.StandardId.phone}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="eb-card-right">
                                                {getStatusBadge(booking.status)}
                                                <span className="eb-price">${booking.totalPrice?.toFixed(2)}</span>
                                            </div>
                                        </div>

                                        {/* Seat details */}
                                        {booking.hasTheaterSeating && booking.selectedSeats?.length > 0 && (
                                            <div className="eb-seats-section">
                                                <h4><FiGrid size={14} /> {booking.selectedSeats.length} Seat{booking.selectedSeats.length > 1 ? 's' : ''} Booked</h4>
                                                <div className="eb-seats-grid">
                                                    {booking.selectedSeats.map((seat, sIdx) => (
                                                        <div key={sIdx} className="eb-seat-item">
                                                            <span className="eb-seat-label">{seat.row}{seat.seatNumber}</span>
                                                            <span className="eb-seat-type">{seat.seatType}</span>
                                                            <span className="eb-seat-price">${seat.price}</span>
                                                            {seat.attendeeName && (
                                                                <div className="eb-seat-attendee">
                                                                    <FiUser size={12} /> {seat.attendeeName}
                                                                    {seat.attendeePhone && (
                                                                        <span className="eb-att-phone"><FiPhone size={11} /> {seat.attendeePhone}</span>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="eb-card-bottom">
                                            <span className="eb-date">Booked: {formatDate(booking.createdAt)}</span>

                                            {booking.status === 'pending' && (
                                                <div className="eb-actions">
                                                    <motion.button
                                                        className="eb-approve-btn"
                                                        onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                                                        disabled={actionLoading === booking._id}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                    >
                                                        {actionLoading === booking._id ? '...' : <><FiCheckCircle /> Approve</>}
                                                    </motion.button>
                                                    <motion.button
                                                        className="eb-reject-btn"
                                                        onClick={() => handleStatusUpdate(booking._id, 'rejected')}
                                                        disabled={actionLoading === booking._id}
                                                        whileHover={{ scale: 1.03 }}
                                                        whileTap={{ scale: 0.97 }}
                                                    >
                                                        {actionLoading === booking._id ? '...' : <><FiXCircle /> Reject</>}
                                                    </motion.button>
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </motion.div>
            </div>
        </ProtectedRoute>
    );
};

export default EventBookingsPage;
