"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/services/api';
import ConfirmationDialog from '@/components/AdminComponent/ConfirmationDialog';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Booking, Event } from '@/types/event';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FiAlertCircle, FiArrowRight, FiTrash2 } from 'react-icons/fi';
import '@/components/Booking component/BookingDetails.css';

import { getImageUrl } from '@/utils/imageHelper';
import SeatSelector from '@/components/Booking component/SeatSelector';
import '@/components/Booking component/BookingTicketForm.css';

const BookingDetailsPage = () => {
    const params = useParams();
    const id = params.id as string;
    const router = useRouter();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [theaterLayout, setTheaterLayout] = useState<any>(null);

    useEffect(() => {
        if (!id) return;
        const fetchDetails = async () => {
            try {
                setLoading(true);
                const bResp = await api.get<any>(`/booking/${id}`);
                const bData = bResp.data.success ? bResp.data.data : bResp.data;
                setBooking(bData);

                // If eventId is an object (populated), use it, otherwise fetch
                if (bData.eventId && typeof bData.eventId === 'object') {
                    setEvent(bData.eventId);
                } else if (bData.eventId) {
                    const eResp = await api.get<any>(`/event/${bData.eventId}`);
                    const eData = eResp.data.success ? eResp.data.data : eResp.data;
                    setEvent(eData);
                }

                // Fetch theater layout if hasTheaterSeating
                const eventIdStr = typeof bData.eventId === 'object' ? bData.eventId._id : bData.eventId;
                if (bData.hasTheaterSeating && eventIdStr) {
                    try {
                        const seatsResp = await api.get<any>(`/booking/event/${eventIdStr}/seats`);
                        const seatsData = seatsResp.data.success ? seatsResp.data.data : seatsResp.data;
                        if (seatsData?.theater?.layout) {
                            setTheaterLayout(seatsData.theater.layout);
                        }
                    } catch (theaterErr) {
                        console.error('Error fetching theater layout:', theaterErr);
                    }
                }
            } catch (err: any) {
                console.error("Error fetching details:", err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [id]);

    const handleCancel = async () => {
        try {
            await api.delete(`/booking/${id}`);
            if (booking) setBooking({ ...booking, status: 'Cancelled' });
            setShowCancelConfirm(false);
            toast.success("Booking cancelled");
        } catch (err: any) {
            toast.error(err.response?.data?.message || err.message);
        }
    };

    if (loading) return (
        <div className="booking-details-loading">
            <div className="spinner"></div>
            <p>Loading details...</p>
        </div>
    );

    if (error || !booking) return (
        <div className="booking-details-error">
            <FiAlertCircle size={48} />
            <p>{error || "Booking not found"}</p>
            <Link href="/bookings" className="back-btn">Back to Bookings</Link>
        </div>
    );

    const eventData = event || (booking.event as any) || {};
    const isCancelled = booking.status === 'Cancelled' || (booking.status as any) === 'cancelled';
    const eventId = eventData._id || eventData.id || booking.eventId;
    const imageUrl = getImageUrl(eventData.image);

    // For theater bookings, use fullpage layout like booking page
    if (booking.hasTheaterSeating && eventId) {
        return (
            <ProtectedRoute requiredRole="Standard User">
                <motion.div className="booking-page fullpage-theater" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <div className="booking-bg-effect"></div>
                    <div className="theater-fullpage-container">
                        {/* Compact Header Bar - Same style as booking page */}
                        <motion.div className="theater-header-bar" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <motion.button className="back-btn-compact" onClick={() => router.push('/bookings')} whileHover={{ x: -3 }}>
                                <FiArrowRight style={{ transform: 'rotate(180deg)' }} /><span>Back</span>
                            </motion.button>
                            <div className="event-info-compact">
                                <img src={imageUrl} alt="" className="event-thumb" />
                                <div>
                                    <h2>{eventData.title}</h2>
                                    <div className="event-meta-compact">
                                        <span>📍 {eventData.location || 'TBA'}</span>
                                        <span>📅 {new Date(eventData.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="booking-summary-compact">
                                <span className={`booking-status ${booking.status?.toLowerCase()}`} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>
                                    {isCancelled ? '❌ Cancelled' : '✅ Confirmed'}
                                </span>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {booking.selectedSeats?.slice(0, 5).map((s, i) => (
                                        <span key={i} className="seats-count" style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa' }}>
                                            {s.row}{s.seatNumber}
                                        </span>
                                    ))}
                                    {(booking.selectedSeats?.length || 0) > 5 && (
                                        <span className="seats-count">+{(booking.selectedSeats?.length || 0) - 5} more</span>
                                    )}
                                </div>
                                <span className="total-amount">${booking.totalPrice?.toFixed(2)}</span>
                                {!isCancelled && (
                                    <motion.button
                                        className="cancel-booking-btn"
                                        onClick={() => setShowCancelConfirm(true)}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <FiTrash2 size={14} /> Cancel
                                    </motion.button>
                                )}
                            </div>
                        </motion.div>

                        {/* Full Page Seat Selector - Same as booking page */}
                        <div className="theater-seat-area">
                            <SeatSelector
                                eventId={eventId}
                                readOnly={true}
                                highlightedSeats={booking.selectedSeats?.map(s => ({
                                    row: s.row,
                                    seatNumber: s.seatNumber,
                                    section: s.section || 'main'
                                })) || []}
                            />
                        </div>
                    </div>

                    <ConfirmationDialog
                        isOpen={showCancelConfirm}
                        title="Cancel Booking"
                        message="Are you sure you want to cancel this booking? This action cannot be undone."
                        onConfirm={handleCancel}
                        onCancel={() => setShowCancelConfirm(false)}
                    />
                </motion.div>
            </ProtectedRoute>
        );
    }

    // For non-theater bookings, use card layout
    return (
        <ProtectedRoute requiredRole="Standard User">
            <div className="booking-details-container">
                <div className="booking-details-wrapper">
                    <div className="booking-details-card">
                        <div className="booking-header">
                            <div className="header-title">
                                <h2>Booking Details</h2>
                                <span className="booking-id-tag">ID: {booking._id}</span>
                            </div>
                            <span className={`booking-status ${booking.status?.toLowerCase()}`}>
                                {isCancelled ? 'Cancelled' : 'Confirmed'}
                            </span>
                        </div>

                        <div className="event-info-section">
                            <div className="event-image-sm">
                                {eventData.image ? (
                                    <img src={imageUrl} alt={eventData.title} />
                                ) : (
                                    <div className="no-photo-placeholder">
                                        <span>No Photo</span>
                                    </div>
                                )}
                            </div>
                            <div className="event-info-content">
                                <h3>{eventData.title}</h3>
                                <div className="detail-meta">
                                    <p><strong>📍 Location:</strong> {eventData.location}</p>
                                    <p><strong>📅 Date:</strong> {new Date(eventData.date).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>

                        <div className="booking-financial-info">
                            <div className="financial-row">
                                <span>Quantity</span>
                                <strong>{booking.numberOfTickets || booking.quantity} ticket(s)</strong>
                            </div>
                            <div className="financial-row">
                                <span>Total Paid</span>
                                <strong className="price-text">${booking.totalPrice?.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="booking-actions">
                            <Link href="/bookings" className="back-button">
                                <FiArrowRight style={{ transform: 'rotate(180deg)' }} /> Back to My Bookings
                            </Link>
                            {!isCancelled && (
                                <button onClick={() => setShowCancelConfirm(true)} className="cancel-booking-btn">
                                    <FiTrash2 /> Cancel Booking
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <ConfirmationDialog
                    isOpen={showCancelConfirm}
                    title="Cancel Booking"
                    message="Are you sure you want to cancel this booking? This action cannot be undone."
                    onConfirm={handleCancel}
                    onCancel={() => setShowCancelConfirm(false)}
                />
            </div>
        </ProtectedRoute>
    );
};

export default BookingDetailsPage;
