"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiDownload, FiCheckCircle,
    FiAlertCircle, FiUser, FiPhone, FiGrid
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './tickets.css';

interface Ticket {
    _id: string;
    bookingId: any;
    eventId: any;
    userId: any;
    seatRow: string;
    seatNumber: number;
    section: string;
    seatType: string;
    price: number;
    attendeeName: string;
    attendeePhone: string;
    qrData: string;
    qrCodeImage: string;
    isScanned: boolean;
    scannedAt: string | null;
}

const BookingTicketsPage = () => {
    const params = useParams();
    const bookingId = params.id as string;
    const router = useRouter();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');

    useEffect(() => {
        if (!bookingId) return;
        const fetchTickets = async () => {
            try {
                setLoading(true);
                const res = await api.get(`/tickets/booking/${bookingId}`);
                const data = res.data.tickets || [];
                setTickets(data);
                if (data.length > 0 && data[0].eventId) {
                    setEventTitle(data[0].eventId.title || '');
                    setEventDate(data[0].eventId.date || '');
                    setEventLocation(data[0].eventId.location || '');
                }
            } catch (err: any) {
                console.error('Error fetching tickets:', err);
                toast.error(err.response?.data?.message || 'Failed to load tickets');
            } finally {
                setLoading(false);
            }
        };
        fetchTickets();
    }, [bookingId]);

    const downloadQR = (ticket: Ticket) => {
        const link = document.createElement('a');
        link.href = ticket.qrCodeImage;
        link.download = `ticket-${ticket.seatRow}${ticket.seatNumber}-${ticket.section}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success(`QR code for seat ${ticket.seatRow}${ticket.seatNumber} downloaded!`);
    };

    const downloadAll = () => {
        tickets.forEach((ticket, index) => {
            setTimeout(() => downloadQR(ticket), index * 300);
        });
    };

    if (loading) return (
        <ProtectedRoute requiredRole="Standard User">
            <div className="tickets-page">
                <div className="tickets-loading">
                    <div className="spinner-ring"></div>
                    <p>Loading your tickets...</p>
                </div>
            </div>
        </ProtectedRoute>
    );

    if (tickets.length === 0) return (
        <ProtectedRoute requiredRole="Standard User">
            <div className="tickets-page">
                <div className="tickets-empty">
                    <FiAlertCircle size={48} />
                    <h3>No Tickets Found</h3>
                    <p>QR tickets are generated after the organizer approves your payment.</p>
                    <button onClick={() => router.push(`/bookings/${bookingId}`)} className="tickets-back-btn">
                        <FiArrowLeft /> Back to Booking
                    </button>
                </div>
            </div>
        </ProtectedRoute>
    );

    return (
        <ProtectedRoute requiredRole="Standard User">
            <div className="tickets-page">
                <div className="tickets-bg-effect"></div>

                <motion.div
                    className="tickets-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="tickets-header">
                        <motion.button
                            className="tickets-back-btn"
                            onClick={() => router.push(`/bookings/${bookingId}`)}
                            whileHover={{ x: -3 }}
                        >
                            <FiArrowLeft size={18} /> Back to Booking
                        </motion.button>

                        <div className="tickets-event-info">
                            <h1>🎫 Your Tickets</h1>
                            <h2>{eventTitle}</h2>
                            <div className="tickets-meta">
                                {eventLocation && <span>📍 {eventLocation}</span>}
                                {eventDate && <span>📅 {new Date(eventDate).toLocaleDateString()}</span>}
                                <span><FiGrid size={14} /> {tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span>
                            </div>
                        </div>

                        {tickets.length > 1 && (
                            <motion.button
                                className="download-all-btn"
                                onClick={downloadAll}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                            >
                                <FiDownload /> Download All QR Codes
                            </motion.button>
                        )}
                    </div>

                    {/* Tickets Grid */}
                    <div className="tickets-grid">
                        <AnimatePresence>
                            {tickets.map((ticket, index) => (
                                <motion.div
                                    key={ticket._id}
                                    className={`ticket-card ${ticket.isScanned ? 'scanned' : ''}`}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.08 }}
                                >
                                    {/* QR Code */}
                                    <div className="ticket-qr-section">
                                        <img
                                            src={ticket.qrCodeImage}
                                            alt={`QR code for seat ${ticket.seatRow}${ticket.seatNumber}`}
                                            className="ticket-qr-image"
                                        />
                                        {ticket.isScanned && (
                                            <div className="ticket-scanned-overlay">
                                                <FiCheckCircle size={32} />
                                                <span>Scanned</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Ticket Info */}
                                    <div className="ticket-info">
                                        <div className="ticket-seat-badge">
                                            <span className="seat-label">{ticket.seatRow}{ticket.seatNumber}</span>
                                            <span className={`seat-type-tag ${ticket.seatType}`}>{ticket.seatType}</span>
                                        </div>

                                        <div className="ticket-details">
                                            <div className="ticket-detail-row">
                                                <span className="detail-label">Section</span>
                                                <span className="detail-value">{ticket.section}</span>
                                            </div>
                                            <div className="ticket-detail-row">
                                                <span className="detail-label">Row</span>
                                                <span className="detail-value">{ticket.seatRow}</span>
                                            </div>
                                            <div className="ticket-detail-row">
                                                <span className="detail-label">Seat</span>
                                                <span className="detail-value">{ticket.seatNumber}</span>
                                            </div>
                                            <div className="ticket-detail-row">
                                                <span className="detail-label">Price</span>
                                                <span className="detail-value">${ticket.price}</span>
                                            </div>
                                            {ticket.attendeeName && (
                                                <div className="ticket-detail-row">
                                                    <span className="detail-label"><FiUser size={12} /> Attendee</span>
                                                    <span className="detail-value">{ticket.attendeeName}</span>
                                                </div>
                                            )}
                                            {ticket.attendeePhone && (
                                                <div className="ticket-detail-row">
                                                    <span className="detail-label"><FiPhone size={12} /> Phone</span>
                                                    <span className="detail-value">{ticket.attendeePhone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Download Button */}
                                        <motion.button
                                            className="ticket-download-btn"
                                            onClick={() => downloadQR(ticket)}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            <FiDownload /> Download QR
                                        </motion.button>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </div>
        </ProtectedRoute>
    );
};

export default BookingTicketsPage;
