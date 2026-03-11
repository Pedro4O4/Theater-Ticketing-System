"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { useAuth } from '@/auth/AuthContext';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import {
    FiArrowLeft, FiUser, FiMail, FiPhone, FiShield,
    FiStar, FiSlash, FiBriefcase, FiCalendar, FiCreditCard,
    FiCheckCircle, FiClock, FiXCircle, FiGrid
} from 'react-icons/fi';
import { User } from '@/types/auth';
import './UserDetailsPage.css';

interface Booking {
    _id: string;
    StandardId: string;
    eventId: {
        _id: string;
        title: string;
        date: string;
        imageUrl: string;
        organizerId: {
            name: string;
            instapayNumber: string;
            instapayQR: string;
        }
    };
    status: string;
    numberOfTickets: number;
    totalPrice: number;
    hasTheaterSeating: boolean;
    selectedSeats?: any[];
    isReceiptUploaded?: boolean;
    instapayReceipt?: string;
    createdAt: string;
}

interface OrganizedEvent {
    _id: string;
    title: string;
    date: string;
    location: string;
    ticketPrice: number;
    remainingTickets: number;
    totalTickets: number;
    status: string;
}

interface ScannedTicket {
    _id: string;
    eventId: {
        title: string;
    };
    userId: {
        name: string;
        email: string;
        phone: string;
    };
    seatRow: string;
    seatNumber: number;
    section: string;
    seatType: string;
    seatLabel?: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
    attendeePhone: string;
    scannedAt: string;
}

const ROLE_CONFIG: Record<string, any> = {
    'System Admin': { icon: FiShield, color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.15)', borderColor: 'rgba(239, 68, 68, 0.3)' },
    'Organizer': { icon: FiStar, color: '#f59e0b', bgColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.3)' },
    'Standard User': { icon: FiUser, color: '#22d3ee', bgColor: 'rgba(34, 211, 238, 0.15)', borderColor: 'rgba(34, 211, 238, 0.3)' },
    'Scanner': { icon: FiGrid, color: '#10b981', bgColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' }
};

const UserDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const userId = params.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [events, setEvents] = useState<OrganizedEvent[]>([]);
    const [scannedTickets, setScannedTickets] = useState<ScannedTicket[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Image Modal State
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) return;
        fetchUserDetails();
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            setLoading(true);
            // Fetch User Profile
            const userRes = await api.get(`/user/${userId}`);

            let userData = userRes.data;
            if (userRes.data?.success) {
                userData = userRes.data.data;
            }

            setUser(userData);

            // Fetch Role Specific Data
            if (userData.role === 'Organizer') {
                try {
                    const eventsRes = await api.get(`/event/organizer/${userId}/events`);
                    if (eventsRes.data?.success) {
                        setEvents(eventsRes.data.data || []);
                    }
                } catch (eventErr) {
                    console.error("Could not fetch events", eventErr);
                    setEvents([]);
                }
            } else if (userData.role === 'Standard User') {
                try {
                    const bookingsRes = await api.get(`/booking/user/${userId}`);
                    if (bookingsRes.data?.success) {
                        setBookings(bookingsRes.data.data || []);
                    }
                } catch (bookingErr) {
                    console.error("Could not fetch bookings", bookingErr);
                    setBookings([]);
                }
            } else if (userData.role === 'Scanner') {
                try {
                    const ticketsRes = await api.get(`/tickets/scanner/${userId}`);
                    if (ticketsRes.data?.tickets) {
                        setScannedTickets(ticketsRes.data.tickets || []);
                    }
                } catch (ticketErr) {
                    console.error("Could not fetch scanned tickets", ticketErr);
                    setScannedTickets([]);
                }
            }

            setError(null);
        } catch (err: any) {
            console.error("Error fetching user details:", err);
            setError(err.response?.data?.message || 'Failed to load user details');
            toast.error('Failed to load user details');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="user-details-loading">
                <div className="spinner"></div>
                <p>Loading User Dashboard...</p>
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="user-details-error">
                <h2>User not found</h2>
                <p>{error}</p>
                <button onClick={() => router.push('/admin/users')} className="back-btn">
                    <FiArrowLeft /> Back to Users
                </button>
            </div>
        );
    }

    const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG['Standard User'];
    const RoleIcon = roleConfig.icon;

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'confirmed': return <FiCheckCircle className="status-icon confirmed" />;
            case 'pending': return <FiClock className="status-icon pending" />;
            case 'rejected':
            case 'cancelled': return <FiXCircle className="status-icon cancelled" />;
            default: return null;
        }
    };

    return (
        <div className="user-details-page">
            <div className="details-header">
                <button className="back-btn" onClick={() => router.push('/admin/users')}>
                    <FiArrowLeft /> Back to Users
                </button>
            </div>

            <div className="details-content-grid">
                {/* Left Column: User Profile Info */}
                <motion.div
                    className="profile-section"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                >
                    <div className="profile-card">
                        <div className="profile-avatar-container">
                            <div className="profile-avatar">
                                {user.profilePicture ? (
                                    <img src={user.profilePicture} alt={user.name} />
                                ) : (
                                    <span>{user.name.charAt(0).toUpperCase()}</span>
                                )}
                            </div>
                            {user.isBlocked && (
                                <div className="blocked-shield">
                                    <FiSlash /> Blocked
                                </div>
                            )}
                        </div>

                        <h1 className="profile-name">{user.name}</h1>

                        <div className="role-badge" style={{ background: roleConfig.bgColor, borderColor: roleConfig.borderColor, color: roleConfig.color }}>
                            <RoleIcon /> <span>{user.role}</span>
                        </div>

                        <div className="profile-info-list">
                            <div className="info-item">
                                <div className="info-icon"><FiMail /></div>
                                <div className="info-content">
                                    <label>Email Space</label>
                                    <p>{user.email}</p>
                                </div>
                            </div>

                            {user.phone && (
                                <div className="info-item">
                                    <div className="info-icon"><FiPhone /></div>
                                    <div className="info-content">
                                        <label>Phone Number</label>
                                        <p>{user.phone}</p>
                                    </div>
                                </div>
                            )}

                            {(user.role === 'Organizer' || user.role === 'System Admin') && user.instapayNumber && (
                                <div className="info-item">
                                    <div className="info-icon"><FiCreditCard /></div>
                                    <div className="info-content">
                                        <label>InstaPay Number</label>
                                        <p>{user.instapayNumber}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* Right Column: Role Specific Data */}
                {(user.role === 'Standard User') && (
                    <motion.div
                        className="bookings-section"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="bookings-header">
                            <h2><FiCalendar /> Booking History</h2>
                            <span className="booking-count">{bookings.length} Bookings</span>
                        </div>

                        {bookings.length === 0 ? (
                            <div className="empty-bookings">
                                <FiBriefcase className="empty-icon" />
                                <p>This user has no booking history yet.</p>
                            </div>
                        ) : (
                            <div className="bookings-list">
                                {bookings.map((booking) => (
                                    <div key={booking._id} className="booking-card">
                                        <div className="booking-status-indicator">
                                            {getStatusIcon(booking.status)}
                                        </div>

                                        <div className="booking-header-row">
                                            <h3 className="event-title">{booking.eventId?.title || 'Unknown Event'}</h3>
                                            <span className={`status-badge ${booking.status}`}>{booking.status}</span>
                                        </div>

                                        <div className="booking-details-grid">
                                            <div className="detail-col">
                                                <span className="detail-label">Booking Date</span>
                                                <span className="detail-val">{formatDate(booking.createdAt)}</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Tickets</span>
                                                <span className="detail-val">{booking.numberOfTickets} seats</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Total Amount</span>
                                                <span className="detail-val price">{booking.totalPrice} EGP</span>
                                            </div>
                                        </div>

                                        {booking.hasTheaterSeating && booking.selectedSeats && booking.selectedSeats.length > 0 && (
                                            <div className="seats-preview">
                                                <span className="detail-label">Selected Seats:</span>
                                                <div className="seat-tags">
                                                    {booking.selectedSeats.map((seat, i) => (
                                                        <span key={i} className="seat-tag">
                                                            {seat.seatLabel || `${seat.row}-${seat.seatNumber} (${seat.section})`}
                                                            {(seat.attendeeFirstName || seat.attendeeLastName) && ` - ${seat.attendeeFirstName || ''} ${seat.attendeeLastName || ''}`.trim()}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {booking.isReceiptUploaded && booking.instapayReceipt && (
                                            <div className="receipt-action">
                                                <button
                                                    className="view-receipt-btn"
                                                    onClick={() => setSelectedImage(booking.instapayReceipt!)}
                                                >
                                                    <FiCreditCard /> View Payment Receipt
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {(user.role === 'Organizer') && (
                    <motion.div
                        className="bookings-section"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="bookings-header">
                            <h2><FiStar /> Organized Events</h2>
                            <span className="booking-count">{events.length} Events</span>
                        </div>

                        {events.length === 0 ? (
                            <div className="empty-bookings">
                                <FiBriefcase className="empty-icon" />
                                <p>This organizer hasn't created any events yet.</p>
                            </div>
                        ) : (
                            <div className="bookings-list">
                                {events.map((evt) => (
                                    <div key={evt._id} className="booking-card">
                                        <div className="booking-header-row">
                                            <h3 className="event-title">{evt.title}</h3>
                                            <span className={`status-badge ${evt.status || 'published'}`}>{evt.status || 'Published'}</span>
                                        </div>

                                        <div className="booking-details-grid">
                                            <div className="detail-col">
                                                <span className="detail-label">Event Date</span>
                                                <span className="detail-val">{formatDate(evt.date)}</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Tickets</span>
                                                <span className="detail-val">{evt.remainingTickets} left of {evt.totalTickets}</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Ticket Price</span>
                                                <span className="detail-val price">{evt.ticketPrice} EGP</span>
                                            </div>
                                        </div>
                                        <div className="detail-col" style={{ marginTop: '10px' }}>
                                            <span className="detail-label">Location</span>
                                            <span className="detail-val">{evt.location}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {(user.role === 'Scanner') && (
                    <motion.div
                        className="bookings-section"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="bookings-header">
                            <h2><FiGrid /> Scanned Tickets</h2>
                            <span className="booking-count">{scannedTickets.length} Scans</span>
                        </div>

                        {scannedTickets.length === 0 ? (
                            <div className="empty-bookings">
                                <FiBriefcase className="empty-icon" />
                                <p>This scanner hasn't scanned any tickets yet.</p>
                            </div>
                        ) : (
                            <div className="bookings-list">
                                {scannedTickets.map((ticket) => (
                                    <div key={ticket._id} className="booking-card">
                                        <div className="booking-status-indicator">
                                            <FiCheckCircle className="status-icon confirmed" />
                                        </div>

                                        <div className="booking-header-row">
                                            <h3 className="event-title">{ticket.eventId?.title || 'Unknown Event'}</h3>
                                            <span className="status-badge confirmed">Scanned</span>
                                        </div>

                                        <div className="booking-details-grid">
                                            <div className="detail-col">
                                                <span className="detail-label">Scanned At</span>
                                                <span className="detail-val">{formatDate(ticket.scannedAt)}</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Seat</span>
                                                <span className="detail-val">{ticket.seatLabel || `${ticket.section} - ${ticket.seatRow}${ticket.seatNumber}`}</span>
                                            </div>
                                            <div className="detail-col">
                                                <span className="detail-label">Type</span>
                                                <span className="detail-val">{ticket.seatType}</span>
                                            </div>
                                        </div>

                                        <div className="seats-preview" style={{ marginTop: '10px' }}>
                                            <span className="detail-label" style={{ display: 'block', marginBottom: '8px' }}>Attendee Information:</span>
                                            <div className="detail-col">
                                                <span className="detail-val" style={{ fontSize: '0.9rem' }}>
                                                    <FiUser size={12} style={{ marginRight: '4px' }} /> 
                                                    {(ticket.attendeeFirstName || ticket.attendeeLastName) 
                                                        ? `${ticket.attendeeFirstName || ''} ${ticket.attendeeLastName || ''}`.trim() 
                                                        : (ticket.userId?.name || 'N/A')}
                                                </span>
                                                <span className="detail-val" style={{ fontSize: '0.9rem', color: '#94a3b8' }}><FiPhone size={12} style={{ marginRight: '4px' }} /> {ticket.attendeePhone || ticket.userId?.phone || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </div>

            {/* Image Modal for Receipts */}
            {selectedImage && (
                <div className="receipt-modal-overlay" onClick={() => setSelectedImage(null)}>
                    <div className="receipt-modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={() => setSelectedImage(null)}>✕</button>
                        <h3>Payment Receipt</h3>
                        <div className="receipt-image-container">
                            <img src={selectedImage} alt="Payment Receipt" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserDetailsPage;
