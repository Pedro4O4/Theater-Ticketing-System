'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import api from '@/services/api';
import ConfirmationDialog from '@/components/AdminComponent/ConfirmationDialog';
import CancelSeatsModal from './CancelSeatsModal';
import RequestCancellationModal from './RequestCancellationModal';
import { FiCheckCircle, FiUploadCloud, FiRotateCcw, FiClock } from 'react-icons/fi';
import { toast } from 'react-toastify';
import './BookingDetails.css';

interface Seat {
    row: string;
    seatNumber: number;
    section: string;
    seatType: string;
    price: number;
    seatLabel?: string;
}

interface Booking {
    _id: string;
    eventId?: string;
    event?: any;
    numberOfTickets?: number;
    quantity?: number;
    totalPrice?: number;
    status?: string;
    createdAt?: string;
    hasTheaterSeating?: boolean;
    selectedSeats?: Seat[];
    isReceiptUploaded?: boolean;
    instapayReceipt?: string;
    cancellationRequest?: {
        status: 'none' | 'pending' | 'approved' | 'rejected';
        requestedAt?: string;
        reason?: string;
        seatsToCancel?: { row: string; seatNumber: number; section: string }[];
        cancelAll?: boolean;
    };
}

interface Event {
    _id?: string;
    title?: string;
    date?: string;
    location?: string;
    category?: string;
    description?: string;
    image?: string;
    ticketPrice?: number;
}

interface BookingDetailsProps {
    id: string;
}

const BookingDetails = ({ id }: BookingDetailsProps) => {
    const [booking, setBooking] = useState<Booking | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState<boolean>(false);
    const [showCancelSeatsModal, setShowCancelSeatsModal] = useState(false);
    const [showRequestCancelModal, setShowRequestCancelModal] = useState(false);
    const [cancelLoading, setCancelLoading] = useState(false);
    const [scannedSeatKeys, setScannedSeatKeys] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchBookingDetails();
    }, [id]);

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/booking/${id}`);

            if (response.data) {
                const bData = response.data.success !== undefined ? response.data.data : response.data;
                setBooking(bData);

                let eventIdStr = null;
                if (bData.eventId && typeof bData.eventId === 'object') {
                    eventIdStr = bData.eventId._id || bData.eventId.id;
                    setEvent(bData.eventId);
                } else if (bData.eventId) {
                    eventIdStr = bData.eventId;
                }

                if (eventIdStr && !bData.eventId?._id) {
                    try {
                        const eventResponse = await api.get(`/event/${eventIdStr}`);
                        const eData = eventResponse.data.success ? eventResponse.data.data : eventResponse.data;
                        if (eData) {
                            setEvent(eData);
                        }
                    } catch (eventErr) {
                        console.error("Error fetching event details:", eventErr);
                    }
                }
            } else {
                setError("Booking not found");
            }
        } catch (err: any) {
            console.error("Error fetching booking details:", err);
            setError(err.response?.data?.message || "Failed to load booking details");
        } finally {
            setLoading(false);
        }
    };

    const handleCancelBooking = async () => {
        try {
            await api.delete(`/booking/${id}`);
            setBooking(booking ? { ...booking, status: 'Cancelled' } : null);
            setShowCancelConfirm(false);
        } catch (err: any) {
            console.error("Error canceling booking:", err);
            alert(`Error: ${err.response?.data?.message || err.message}`);
        }
    };

    const handleCancelSeatsConfirm = async (seatKeys: string[], cancelAll: boolean) => {
        try {
            setCancelLoading(true);
            await api.post(`/booking/${id}/cancel-seats`, { seatKeys, cancelAll });
            toast.success(cancelAll ? 'Booking cancelled successfully' : 'Selected seats cancelled');
            setShowCancelSeatsModal(false);
            fetchBookingDetails();
        } catch (err: any) {
            console.error('Error cancelling seats:', err);
            toast.error(err.response?.data?.message || 'Failed to cancel seats');
        } finally {
            setCancelLoading(false);
        }
    };

    const openRequestCancelModal = async () => {
        if (booking?.status === 'confirmed') {
            try {
                const res = await api.get(`/tickets/booking/${id}`);
                const tickets = res.data?.tickets || [];
                const scanned = new Set<string>(
                    tickets.filter((t: any) => t.isScanned).map((t: any) => `${t.section}-${t.seatRow}-${t.seatNumber}`)
                );
                setScannedSeatKeys(scanned);
            } catch {
                setScannedSeatKeys(new Set());
            }
        } else {
            setScannedSeatKeys(new Set());
        }
        setShowRequestCancelModal(true);
    };

    const handleRequestCancellationConfirm = async (seatKeys: string[], cancelAll: boolean, reason: string) => {
        try {
            setCancelLoading(true);
            await api.post(`/booking/${id}/request-cancellation`, { seatKeys, cancelAll, reason });
            toast.success('Cancellation request submitted!');
            setShowRequestCancelModal(false);
            fetchBookingDetails();
        } catch (err: any) {
            console.error('Error requesting cancellation:', err);
            toast.error(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setCancelLoading(false);
        }
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleString('en-US', {
            timeZone: 'Africa/Cairo',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) return <div className="loading">Loading booking details...</div>;
    if (error) return (
        <div className="error-container">
            <div className="error">Error: {error}</div>
            <Link href="/bookings" className="back-button">Back to My Bookings</Link>
        </div>
    );
    if (!booking) return (
        <div className="not-found">
            <h2>Booking not found</h2>
            <Link href="/bookings" className="back-button">Back to My Bookings</Link>
        </div>
    );

    const eventData = event || booking.event || {};

    const bookingDate = booking.createdAt
        ? new Date(booking.createdAt).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' })
        : 'Date not available';

    return (
        <div className="booking-details-container">
            <div className="booking-details-card">
                <div className="booking-header">
                    <h2>Event & Booking Details</h2>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {booking.status === 'pending' && booking.isReceiptUploaded && (
                            <span style={{
                                color: '#10b981',
                                background: 'rgba(16, 185, 129, 0.1)',
                                padding: '4px 10px',
                                borderRadius: '12px',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <FiCheckCircle size={14} /> Pending Organizer Approval
                            </span>
                        )}
                        <span className={`booking-status ${booking.status?.toLowerCase() || 'confirmed'}`}>
                            {booking.status || 'Confirmed'}
                        </span>
                    </div>
                </div>

                <div className="event-details-content">
                    <div className="event-image-container">
                        {eventData.image ? (
                            <img src={eventData.image} alt={eventData.title} className="event-image" />
                        ) : (
                            <div className="event-no-image">No image available</div>
                        )}
                    </div>

                    <div className="event-info">
                        <h3>{eventData.title || 'Event Title Unavailable'}</h3>

                        <div className="event-info-item">
                            <h4>📅 Date & Time</h4>
                            <p>{eventData.date ? formatDate(eventData.date) : 'Date not available'}</p>
                        </div>

                        <div className="event-info-item">
                            <h4>📍 Location</h4>
                            <p>{eventData.location || 'Location not specified'}</p>
                        </div>

                        <div className="event-info-item">
                            <h4>🏷️ Category</h4>
                            <p>{eventData.category || 'Uncategorized'}</p>
                        </div>

                        <div className="event-info-item full-width">
                            <h4>📝 Description</h4>
                            <p className="event-description">{eventData.description || 'No description available'}</p>
                        </div>
                    </div>
                </div>

                <div className="booking-info-section">
                    <h3>Booking Information</h3>
                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Booking ID:</span>
                            <span className="info-value">{booking._id}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Booked on:</span>
                            <span className="info-value">{bookingDate}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Status:</span>
                            <span className="info-value" style={{ textTransform: 'capitalize' }}>{booking.status}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Number of Tickets:</span>
                            <span className="info-value">{booking.numberOfTickets || booking.quantity}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Price per Ticket:</span>
                            <span className="info-value">{eventData.ticketPrice?.toFixed(2) || 'N/A'} EGP</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Total Price:</span>
                            <span className="info-value">{booking.totalPrice?.toFixed(2) || 'N/A'} EGP</span>
                        </div>
                    </div>

                    {booking.hasTheaterSeating && booking.selectedSeats && booking.selectedSeats.length > 0 && (
                        <div className="selected-seats-section" style={{
                            marginTop: '20px',
                            padding: '15px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '12px',
                            border: '1px solid rgba(139, 92, 246, 0.2)'
                        }}>
                            <h4 style={{
                                color: '#8b5cf6',
                                margin: '0 0 12px 0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}>
                                🪑 Your Seats
                            </h4>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px'
                            }}>
                                {booking.selectedSeats.map((seat, index) => {
                                    const isPendingBooking = booking.status === 'pending';
                                    const chipBg = isPendingBooking
                                        ? 'rgba(251, 191, 36, 0.2)'
                                        : seat.seatType === 'vip'
                                            ? 'rgba(249, 115, 22, 0.2)'
                                            : seat.seatType === 'premium'
                                                ? 'rgba(139, 92, 246, 0.2)'
                                                : 'rgba(107, 114, 128, 0.2)';
                                    const chipBorder = isPendingBooking
                                        ? 'rgba(251, 191, 36, 0.5)'
                                        : seat.seatType === 'vip'
                                            ? 'rgba(249, 115, 22, 0.5)'
                                            : seat.seatType === 'premium'
                                                ? 'rgba(139, 92, 246, 0.4)'
                                                : 'rgba(107, 114, 128, 0.4)';
                                    const chipTextColor = isPendingBooking
                                        ? '#fbbf24'
                                        : '#f8fafc';
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                padding: '8px 14px',
                                                background: chipBg,
                                                border: `1px solid ${chipBorder}`,
                                                borderRadius: '8px',
                                                color: chipTextColor
                                            }}
                                        >
                                            <strong>{seat.seatLabel || `${seat.row}${seat.seatNumber}`}</strong>
                                            <span style={{
                                                marginLeft: '8px',
                                                fontSize: '0.8rem',
                                                opacity: 0.8,
                                                textTransform: 'capitalize'
                                            }}>
                                                {seat.seatType}
                                            </span>
                                            <span style={{
                                                marginLeft: '8px',
                                                color: '#22d3ee',
                                                fontWeight: 600
                                            }}>
                                                {seat.price?.toFixed(2)} EGP
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <div className="booking-actions">
                    <Link href="/bookings" className="back-button">Back to My Bookings</Link>
                    {eventData._id && (
                        <Link href={`/events/${eventData._id}`} className="view-event-btn">View Event Page</Link>
                    )}
                    {booking.status === 'pending' && !booking.isReceiptUploaded && (
                        booking.hasTheaterSeating && booking.selectedSeats && booking.selectedSeats.length > 0 ? (
                            <button
                                onClick={() => setShowCancelSeatsModal(true)}
                                className="cancel-booking-btn"
                            >
                                Cancel Seats
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowCancelConfirm(true)}
                                className="cancel-booking-btn"
                            >
                                Cancel Booking
                            </button>
                        )
                    )}
                    {booking.status === 'pending' && booking.isReceiptUploaded && booking.hasTheaterSeating && (
                        <>
                            {booking.cancellationRequest?.status === 'pending' && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '0.75rem 1.5rem', borderRadius: '8px',
                                    background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    fontSize: '0.9rem', fontWeight: 600,
                                }}>
                                    <FiClock /> Cancellation Request Pending
                                </span>
                            )}
                            {(() => {
                                const pendingKeys = new Set(
                                    (booking.cancellationRequest?.seatsToCancel || []).map(s => `${s.section}-${s.row}-${s.seatNumber}`)
                                );
                                const unrequestedSeats = (booking.selectedSeats || []).filter(s => !pendingKeys.has(`${s.section}-${s.row}-${s.seatNumber}`));
                                const showButton = booking.cancellationRequest?.status !== 'pending'
                                    || (booking.cancellationRequest?.status === 'pending' && unrequestedSeats.length > 0);
                                return showButton ? (
                                    <button
                                        onClick={() => openRequestCancelModal()}
                                        className="cancel-booking-btn"
                                        style={{
                                            background: 'rgba(245, 158, 11, 0.15)',
                                            color: '#fbbf24',
                                            borderColor: 'rgba(245, 158, 11, 0.3)',
                                        }}
                                    >
                                        <FiRotateCcw style={{ marginRight: '6px' }} /> {booking.cancellationRequest?.status === 'pending' ? 'Cancel More Seats' : 'Request Cancellation'}
                                    </button>
                                ) : null;
                            })()}
                        </>
                    )}
                    {booking.status === 'pending' && !booking.isReceiptUploaded && (
                        <Link
                            href={`/bookings/${booking._id}/upload-receipt`}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                padding: '0.75rem 1.5rem', borderRadius: '8px',
                                background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa',
                                border: '1px solid rgba(139, 92, 246, 0.4)', cursor: 'pointer',
                                fontSize: '0.9rem', fontWeight: 500, transition: 'all 0.2s', width: 'fit-content',
                                textDecoration: 'none'
                            }}
                        >
                            <FiUploadCloud /> Upload Receipt
                        </Link>
                    )}
                    {booking.status === 'confirmed' && booking.hasTheaterSeating && (
                        <>
                            {booking.cancellationRequest?.status === 'pending' && (
                                <span style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '0.75rem 1.5rem', borderRadius: '8px',
                                    background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24',
                                    border: '1px solid rgba(245, 158, 11, 0.3)',
                                    fontSize: '0.9rem', fontWeight: 600,
                                }}>
                                    <FiClock /> Cancellation Request Pending
                                </span>
                            )}
                            {(() => {
                                const pendingKeys = new Set(
                                    (booking.cancellationRequest?.seatsToCancel || []).map(s => `${s.section}-${s.row}-${s.seatNumber}`)
                                );
                                const unrequestedSeats = (booking.selectedSeats || []).filter(s => !pendingKeys.has(`${s.section}-${s.row}-${s.seatNumber}`));
                                if (booking.cancellationRequest?.status === 'pending' && unrequestedSeats.length > 0) {
                                    return (
                                        <button
                                            onClick={() => openRequestCancelModal()}
                                            className="cancel-booking-btn"
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: '#fbbf24',
                                                borderColor: 'rgba(245, 158, 11, 0.3)',
                                            }}
                                        >
                                            <FiRotateCcw style={{ marginRight: '6px' }} /> Cancel More Seats
                                        </button>
                                    );
                                }
                                if (booking.cancellationRequest?.status === 'rejected' || !booking.cancellationRequest?.status || booking.cancellationRequest.status === 'none') {
                                    return (
                                        <button
                                            onClick={() => openRequestCancelModal()}
                                            className="cancel-booking-btn"
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: '#fbbf24',
                                                borderColor: 'rgba(245, 158, 11, 0.3)',
                                            }}
                                        >
                                            <FiRotateCcw style={{ marginRight: '6px' }} /> Request Ticket Return
                                        </button>
                                    );
                                }
                                return null;
                            })()}
                        </>
                    )}
                </div>
            </div>

            <ConfirmationDialog
                isOpen={showCancelConfirm}
                title="Confirm Cancellation"
                message="Are you sure you want to cancel this booking? This action cannot be undone."
                confirmText="Yes, Cancel Booking"
                cancelText="Keep Booking"
                onConfirm={handleCancelBooking}
                onCancel={() => setShowCancelConfirm(false)}
            />

            {booking.hasTheaterSeating && booking.selectedSeats && booking.selectedSeats.length > 0 && (
                <>
                    <CancelSeatsModal
                        isOpen={showCancelSeatsModal}
                        onClose={() => setShowCancelSeatsModal(false)}
                        onConfirm={handleCancelSeatsConfirm}
                        seats={booking.selectedSeats}
                        isLoading={cancelLoading}
                        bookingType="pending"
                    />
                    <RequestCancellationModal
                        isOpen={showRequestCancelModal}
                        onClose={() => setShowRequestCancelModal(false)}
                        onConfirm={handleRequestCancellationConfirm}
                        seats={(() => {
                            const pendingKeys = new Set(
                                (booking.cancellationRequest?.status === 'pending'
                                    ? booking.cancellationRequest.seatsToCancel || []
                                    : []
                                ).map(s => `${s.section}-${s.row}-${s.seatNumber}`)
                            );
                            return booking.selectedSeats.filter(
                                s => !pendingKeys.has(`${s.section}-${s.row}-${s.seatNumber}`)
                                    && !scannedSeatKeys.has(`${s.section}-${s.row}-${s.seatNumber}`)
                            );
                        })()}
                        isLoading={cancelLoading}
                    />
                </>
            )}
        </div>
    );
};

export default BookingDetails;
