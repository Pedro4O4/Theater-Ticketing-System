"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiCheckCircle, FiXCircle, FiClock,
    FiUser, FiPhone, FiMail, FiAlertCircle, FiGrid, FiEye, FiX, FiCamera, FiRotateCcw, FiDownload
} from 'react-icons/fi';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { toast } from 'react-toastify';
import '@/components/Event Components/EventBookings.css';
import Loader from '@/components/shared/Loader';

interface BookingSeat {
    row: string;
    seatNumber: number;
    section: string;
    seatType: string;
    price: number;
    seatLabel?: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
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
    isReceiptUploaded?: boolean;
    instapayReceipt?: string;
    cancellationRequest?: {
        status: 'none' | 'pending' | 'approved' | 'rejected';
        requestedAt?: string;
        reason?: string;
        seatsToCancel?: { row: string; seatNumber: number; section: string; seatLabel?: string }[];
        cancelAll?: boolean;
    };
    cancellationHistory?: {
        status: 'none' | 'pending' | 'approved' | 'rejected';
        requestedAt?: string;
        reason?: string;
        seatsToCancel?: { row: string; seatNumber: number; section: string; seatLabel?: string }[];
        cancelAll?: boolean;
    }[];
}

const EventBookingsPage = () => {
    const params = useParams();
    const eventId = params.id as string;
    const router = useRouter();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    // Receipt Modal State
    const [selectedReceipt, setSelectedReceipt] = useState<string | null>(null);
    const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

    // Seat Detail Modal State
    const [selectedSeatInfo, setSelectedSeatInfo] = useState<BookingSeat | null>(null);
    const [isSeatModalOpen, setIsSeatModalOpen] = useState(false);

    // Cancellation Requests
    const [cancellationRequests, setCancellationRequests] = useState<Booking[]>([]);
    const [cancellationLoading, setCancellationLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'bookings' | 'cancellations'>('bookings');
    const [lastSeenCancellations, setLastSeenCancellations] = useState<number>(0);

    useEffect(() => {
        const saved = localStorage.getItem(`lastSeenCancellations_${eventId}`);
        if (saved) setLastSeenCancellations(parseInt(saved));
    }, [eventId]);

    useEffect(() => {
        fetchBookings();
        fetchCancellationRequests();
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

            if (eData.date) {
                const eventDate = new Date(eData.date);
                const expirationDate = new Date(eventDate.getTime() + 24 * 60 * 60 * 1000);
                setIsExpired(new Date() >= expirationDate);
            }
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

    const fetchCancellationRequests = async () => {
        try {
            const res = await api.get(`/booking/event/${eventId}/cancellation-requests`);
            const data = res.data.success ? res.data.data : res.data;
            setCancellationRequests(data);
        } catch (err: any) {
            console.error('Error fetching cancellation requests:', err);
        }
    };

    const handleCancellationAction = async (bookingId: string, action: 'approve' | 'reject') => {
        try {
            setCancellationLoading(true);
            await api.patch(`/booking/${bookingId}/${action}-cancellation`);
            toast.success(`Cancellation ${action === 'approve' ? 'approved' : 'rejected'}!`);
            fetchCancellationRequests();
            fetchBookings();
        } catch (err: any) {
            console.error(`Error ${action}ing cancellation:`, err);
            toast.error(err.response?.data?.message || `Failed to ${action} cancellation`);
        } finally {
            setCancellationLoading(false);
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

    const formatSeatLabel = (seat: { seatLabel?: string; row: string; seatNumber: number }) => {
        return seat.seatLabel || `${seat.row}${seat.seatNumber}`;
    };

    const handleViewReceipt = async (bookingId: string, currentReceipt?: string) => {
        if (currentReceipt) {
            setSelectedReceipt(currentReceipt);
            setIsReceiptModalOpen(true);
            return;
        }

        try {
            setActionLoading(`receipt-${bookingId}`);
            const res = await api.get(`/booking/${bookingId}/receipt`);
            const receiptData = res.data.success ? res.data.data : res.data;
            
            if (receiptData) {
                setSelectedReceipt(receiptData);
                setIsReceiptModalOpen(true);
                // Update the booking in the list so it's cached for this session
                setBookings(prev => prev.map(b => b._id === bookingId ? { ...b, instapayReceipt: receiptData } : b));
            } else {
                toast.error('Receipt image not found.');
            }
        } catch (err: any) {
            console.error('Error fetching receipt:', err);
            toast.error(err.response?.data?.message || 'Failed to load receipt.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleExportFullReport = async () => {
        try {
            setActionLoading('export-full');
            const response = await api.get<any>(`/booking/event/${eventId}/seats`);
            
            if (!response.data.success) {
                throw new Error('Failed to fetch theater layout');
            }

            const allLayoutSeats: any[] = response.data.data.seats;
            
            // Map of active bookings (Confirmed or Pending) by seat key
            // We ignore Rejected bookings as per user request ("dont give me rejected chairs")
            const activeBookingsMap = new Map<string, { seat: BookingSeat, status: string, user: BookingUser }>();
            
            bookings.forEach(booking => {
                if (booking.status === 'confirmed' || booking.status === 'pending') {
                    booking.selectedSeats?.forEach(seat => {
                        const key = `${seat.section}-${seat.row}-${seat.seatNumber}`;
                        activeBookingsMap.set(key, { 
                            seat, 
                            status: booking.status === 'confirmed' ? 'Confirmed' : 'Pending',
                            user: booking.StandardId
                        });
                    });
                }
            });

            // Identity rejected seats to exclude them if needed
            const rejectedSeatsSet = new Set<string>();
            bookings.forEach(booking => {
                if (booking.status === 'rejected') {
                    booking.selectedSeats?.forEach(seat => {
                        rejectedSeatsSet.add(`${seat.section}-${seat.row}-${seat.seatNumber}`);
                    });
                }
            });

            // Filter and Map seats for CSV
            const reportData = allLayoutSeats
                .filter(layoutSeat => {
                    const key = `${layoutSeat.section}-${layoutSeat.row}-${layoutSeat.seatNumber}`;
                    // Exclude seats that are currently rejected
                    return !rejectedSeatsSet.has(key);
                })
                .map(layoutSeat => {
                    const key = `${layoutSeat.section}-${layoutSeat.row}-${layoutSeat.seatNumber}`;
                    const activeInfo = activeBookingsMap.get(key);
                    
                    if (activeInfo) {
                        return [
                            layoutSeat.seatLabel || `${layoutSeat.row}${layoutSeat.seatNumber}`,
                            activeInfo.seat.attendeeFirstName || '',
                            activeInfo.seat.attendeeLastName || '',
                            activeInfo.seat.attendeePhone || '',
                            activeInfo.status
                        ];
                    } else {
                        return [
                            layoutSeat.seatLabel || `${layoutSeat.row}${layoutSeat.seatNumber}`,
                            '',
                            '',
                            '',
                            'Free'
                        ];
                    }
                });

            // Sort: Section (Main > Balcony), Row (A > Z), Seat Number (1 > ...)
            reportData.sort((a, b) => {
                // We don't have section info directly in the processed array easily, 
                // but we can re-derive it or just use the label if it's formatted.
                // Better to sort by the raw layout seat objects first.
                return 0; // Handled below by sorting the layout seats first
            });

            // Re-doing the map with sorting from the start
            const sortedLayoutSeats = [...allLayoutSeats]
                .filter(ls => !rejectedSeatsSet.has(`${ls.section}-${ls.row}-${ls.seatNumber}`))
                .sort((a, b) => {
                    if (a.section !== b.section) return a.section === 'main' ? -1 : 1;
                    if (a.row !== b.row) return a.row.localeCompare(b.row);
                    return a.seatNumber - b.seatNumber;
                });

            const rows = sortedLayoutSeats.map(ls => {
                const key = `${ls.section}-${ls.row}-${ls.seatNumber}`;
                const activeInfo = activeBookingsMap.get(key);
                
                // Dynamic side designation for the report: 1-11 Right, 12+ Left
                const side = ls.seatNumber <= 11 ? 'Right' : 'Left';
                const seatLabel = `${ls.row}${ls.seatNumber} (${side})`;

                return [
                    seatLabel,
                    activeInfo ? (activeInfo.seat.attendeeFirstName || '') : '',
                    activeInfo ? (activeInfo.seat.attendeeLastName || '') : '',
                    activeInfo ? (activeInfo.seat.attendeePhone || '') : '',
                    activeInfo ? activeInfo.status : 'Free'
                ];
            });

            // CSV Header
            const headers = ['Seat', 'First Name', 'Last Name', 'Phone Number', 'Status'];
            const BOM = '\uFEFF';
            const csvContent = BOM + [
                `"Event:","${eventTitle.replace(/"/g, '""')}"`,
                `"Theater Seating Report (Active & Free Chairs)"`,
                '',
                headers.join(','),
                ...rows.map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `${eventTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_theater_report.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('Full theater report downloaded!');
        } catch (err: any) {
            console.error('Error exporting full report:', err);
            toast.error('Failed to export theater report.');
        } finally {
            setActionLoading(null);
        }
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                <h1 style={{ margin: 0 }}>Bookings for &quot;{eventTitle}&quot; {isExpired && <span style={{ color: '#ef4444', fontSize: '1rem', marginLeft: '10px' }}>(Read-Only)</span>}</h1>
                                
                                <div style={{ display: 'flex', gap: '12px' }}>
                                    <motion.button
                                        onClick={handleExportFullReport}
                                        disabled={actionLoading === 'export-full'}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', 
                                            border: '1px solid rgba(16, 185, 129, 0.3)',
                                            padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
                                            fontSize: '0.9rem', transition: 'all 0.2s',
                                            whiteSpace: 'nowrap',
                                            opacity: actionLoading === 'export-full' ? 0.6 : 1
                                        }}
                                    >
                                        <FiDownload size={16} /> {actionLoading === 'export-full' ? 'Exporting...' : 'Download Full Report'}
                                    </motion.button>

                                    {!isExpired && (
                                        <motion.button
                                            onClick={() => router.push(`/my-events/${eventId}/scan`)}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px',
                                                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white', border: 'none',
                                                padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 600,
                                                fontSize: '0.9rem', boxShadow: '0 4px 15px rgba(139, 92, 246, 0.3)',
                                                whiteSpace: 'nowrap'
                                            }}
                                        >
                                            <FiCamera size={16} /> Scan QR Codes
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </div>

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
                            {cancellationRequests.length > 0 && (
                                <div className="eb-stat" style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                                    <FiRotateCcw style={{ color: '#f59e0b' }} />
                                    <span style={{ color: '#fbbf24' }}>{cancellationRequests.length} Return Request{cancellationRequests.length > 1 ? 's' : ''}</span>
                                </div>
                            )}
                        </div>

                        {/* Tab Switcher */}
                        <div style={{
                            display: 'flex', gap: '8px', marginTop: '16px',
                        }}>
                            <button
                                onClick={() => setActiveTab('bookings')}
                                style={{
                                    padding: '10px 24px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeTab === 'bookings' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'bookings' ? 'white' : '#9ca3af',
                                    border: activeTab === 'bookings' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                                }}
                            >
                                Bookings ({bookings.length})
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('cancellations');
                                    setLastSeenCancellations(cancellationRequests.length);
                                    localStorage.setItem(`lastSeenCancellations_${eventId}`, cancellationRequests.length.toString());
                                }}
                                style={{
                                    padding: '10px 24px', borderRadius: '12px', cursor: 'pointer',
                                    background: activeTab === 'cancellations' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255,255,255,0.05)',
                                    color: activeTab === 'cancellations' ? 'white' : '#9ca3af',
                                    border: activeTab === 'cancellations' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                    fontWeight: 600, fontSize: '0.9rem', transition: 'all 0.2s',
                                    position: 'relative',
                                }}
                            >
                                Return Requests ({cancellationRequests.length})
                                {cancellationRequests.length > lastSeenCancellations && (
                                    <span style={{
                                        position: 'absolute', top: '-6px', right: '-6px',
                                        width: '18px', height: '18px', borderRadius: '50%',
                                        background: '#ef4444', color: 'white', fontSize: '0.7rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 700,
                                        boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)',
                                    }}>
                                        {cancellationRequests.length - lastSeenCancellations}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Bookings List */}
                    {activeTab === 'bookings' && (
                        <>
                            {isLoading ? (
                                <Loader message="Loading bookings..." />
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
                                                        <span className="eb-price">{booking.totalPrice?.toFixed(2)} EGP</span>
                                                    </div>
                                                </div>

                                                {/* Seat details */}
                                                {booking.hasTheaterSeating && booking.selectedSeats?.length > 0 && (
                                                    <div className="eb-seats-section">
                                                        <h4><FiGrid size={14} /> {booking.selectedSeats.length} Seat{booking.selectedSeats.length > 1 ? 's' : ''} Booked</h4>
                                                        <div className="eb-seats-grid">
                                                            {booking.selectedSeats.map((seat, sIdx) => (
                                                                <div 
                                                                    key={sIdx} 
                                                                    className="eb-seat-item"
                                                                    onClick={() => {
                                                                        setSelectedSeatInfo(seat);
                                                                        setIsSeatModalOpen(true);
                                                                    }}
                                                                    style={{ cursor: 'pointer' }}
                                                                >
                                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                        <span className="eb-seat-label">
                                                                            {formatSeatLabel(seat)}
                                                                        </span>
                                                                        <FiEye size={14} style={{ color: '#8b5cf6', opacity: 0.7 }} title="View attendee details" />
                                                                    </div>
                                                                    <span className="eb-seat-type">{seat.seatType}</span>
                                                                    <span className="eb-seat-price">{seat.price} EGP</span>
                                                                    {(seat.attendeeFirstName || seat.attendeeLastName) && (
                                                                        <div className="eb-seat-attendee">
                                                                            <FiUser size={12} /> {seat.attendeeFirstName} {seat.attendeeLastName}
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

                                                    <div className="eb-actions">
                                                        {booking.isReceiptUploaded && (
                                  <motion.button
                                                                className="eb-view-receipt-btn"
                                                                onClick={() => handleViewReceipt(booking._id, booking.instapayReceipt)}
                                                                disabled={actionLoading === `receipt-${booking._id}`}
                                                                whileHover={{ scale: 1.03 }}
                                                                whileTap={{ scale: 0.97 }}
                                                                    style={{
                                                                        background: 'rgba(139, 92, 246, 0.2)',
                                                                        color: '#a78bfa',
                                                                        border: '1px solid rgba(139, 92, 246, 0.4)',
                                                                        display: 'flex', alignItems: 'center', gap: '6px',
                                                                        padding: '6px 12px', borderRadius: '6px',
                                                                        fontSize: '0.85rem',
                                                                        opacity: actionLoading === `receipt-${booking._id}` ? 0.7 : 1,
                                                                        cursor: actionLoading === `receipt-${booking._id}` ? 'not-allowed' : 'pointer'
                                                                    }}
                                                            >
                                                                <FiEye /> {actionLoading === `receipt-${booking._id}` ? 'Loading...' : 'View Receipt'}
                                                            </motion.button>
                                                        )}

                                                        {booking.status === 'pending' && !isExpired && (
                                                            <>
                                                                <motion.button
                                                                    className="eb-approve-btn"
                                                                    onClick={() => handleStatusUpdate(booking._id, 'confirmed')}
                                                                    disabled={actionLoading === booking._id || !booking.isReceiptUploaded}
                                                                    whileHover={booking.isReceiptUploaded ? { scale: 1.03 } : {}}
                                                                    whileTap={booking.isReceiptUploaded ? { scale: 0.97 } : {}}
                                                                    title={!booking.isReceiptUploaded ? 'Waiting for user to upload receipt' : 'Approve this booking'}
                                                                    style={{ opacity: !booking.isReceiptUploaded ? 0.4 : 1, cursor: !booking.isReceiptUploaded ? 'not-allowed' : 'pointer' }}
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
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            )}
                        </>
                    )}

                    {/* Cancellation Requests Tab */}
                    {activeTab === 'cancellations' && (
                        <>
                            {cancellationRequests.length === 0 ? (
                                <div className="eb-empty">
                                    <FiRotateCcw size={48} />
                                    <h3>No Cancellation Requests</h3>
                                    <p>No users have requested ticket returns for this event.</p>
                                </div>
                            ) : (
                                <div className="eb-list">
                                    <AnimatePresence>
                                        {cancellationRequests.flatMap((booking) => {
                                            const allRequests = [
                                                ...(booking.cancellationRequest?.status === 'pending' ? [{ ...booking.cancellationRequest, id: 'pending' }] : []),
                                                ...(booking.cancellationHistory || []).map((h, i) => ({ ...h, id: `hist-${i}` }))
                                            ];
                                            
                                            allRequests.sort((a, b) => new Date(b.requestedAt || 0).getTime() - new Date(a.requestedAt || 0).getTime());

                                            return allRequests.map((req, rIdx) => {
                                                const isPending = req.status === 'pending';
                                                const isApproved = req.status === 'approved';
                                                const isRejected = req.status === 'rejected';

                                                const statusBadgeStyle = isPending 
                                                    ? { background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)' }
                                                    : isApproved
                                                        ? { background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)' }
                                                        : { background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' };

                                                const statusText = isPending ? 'Return Request' : isApproved ? 'Return Approved' : 'Return Rejected';
                                                const statusIcon = isPending ? <FiRotateCcw size={12} /> : isApproved ? <FiCheckCircle size={12} /> : <FiXCircle size={12} />;
                                                const borderColor = isPending ? '#f59e0b' : isApproved ? '#10b981' : '#ef4444';

                                                return (
                                                    <motion.div
                                                        key={`${booking._id}-${req.id}`}
                                                        className="eb-card"
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: rIdx * 0.05 }}
                                                        style={{ borderLeft: `3px solid ${borderColor}` }}
                                                    >
                                                        <div className="eb-card-top">
                                                            <div className="eb-user-info">
                                                                <div className="eb-user-avatar" style={{ background: `linear-gradient(135deg, ${borderColor}, #000)` }}>
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
                                                                <span className="status-badge" style={{
                                                                    ...statusBadgeStyle,
                                                                    padding: '4px 12px', borderRadius: '20px',
                                                                    fontSize: '0.8rem', fontWeight: 600,
                                                                    display: 'flex', alignItems: 'center', gap: '4px'
                                                                }}>
                                                                    {statusIcon} {statusText}
                                                                </span>
                                                                <span className="eb-price">{booking.totalPrice?.toFixed(2)} EGP</span>
                                                            </div>
                                                        </div>

                                                        {/* Seats to cancel */}
                                                        <div style={{
                                                            margin: '12px 0', padding: '14px',
                                                            background: 'rgba(245, 158, 11, 0.06)',
                                                            border: `1px solid ${borderColor}55`,
                                                            borderRadius: '12px',
                                                        }}>
                                                            <h4 style={{ margin: '0 0 10px', color: borderColor, fontSize: '0.9rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                <FiGrid size={14} />
                                                                {req.cancelAll
                                                                    ? `Requested to return ALL ${booking.selectedSeats?.length || 0} seats`
                                                                    : `Requested to return ${req.seatsToCancel?.length || 0} seat(s)`
                                                                }
                                                            </h4>
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                                {(req.cancelAll
                                                                    ? booking.selectedSeats
                                                                    : req.seatsToCancel || []
                                                                ).map((seat, sIdx) => (
                                                                    <span key={sIdx} style={{
                                                                        padding: '4px 12px', borderRadius: '8px',
                                                                        background: 'rgba(239, 68, 68, 0.12)',
                                                                        border: '1px solid rgba(239, 68, 68, 0.25)',
                                                                        color: '#fca5a5', fontSize: '0.85rem', fontWeight: 600,
                                                                    }}>
                                                                        {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            {req.reason && (
                                                                <div style={{
                                                                    marginTop: '10px', padding: '10px 14px',
                                                                    background: 'rgba(255,255,255,0.03)',
                                                                    borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)',
                                                                }}>
                                                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 600 }}>Reason:</span>
                                                                    <p style={{ color: '#e2e8f0', fontSize: '0.85rem', margin: '4px 0 0', lineHeight: 1.5 }}>
                                                                        {req.reason}
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* All booking seats for reference */}
                                                        {booking.hasTheaterSeating && booking.selectedSeats?.length > 0 && (
                                                            <div className="eb-seats-section">
                                                                <h4><FiGrid size={14} /> All Booked Seats ({booking.selectedSeats.length})</h4>
                                                                <div className="eb-seats-grid">
                                                                    {booking.selectedSeats.map((seat, sIdx) => {
                                                                        const isRequestedForCancel = req.seatsToCancel?.some(
                                                                            (cs: any) => cs.row === seat.row && cs.seatNumber === seat.seatNumber && cs.section === seat.section
                                                                        ) || req.cancelAll;
                                                                        return (
                                                                            <div 
                                                                                key={sIdx} 
                                                                                className="eb-seat-item" 
                                                                                onClick={() => {
                                                                                    setSelectedSeatInfo(seat as any);
                                                                                    setIsSeatModalOpen(true);
                                                                                }}
                                                                                style={{
                                                                                    borderColor: isRequestedForCancel ? 'rgba(239, 68, 68, 0.4)' : undefined,
                                                                                    background: isRequestedForCancel ? 'rgba(239, 68, 68, 0.08)' : undefined,
                                                                                    cursor: 'pointer'
                                                                                }}
                                                                            >
                                                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                                                    <span className="eb-seat-label">
                                                                                        {formatSeatLabel(seat as any)}
                                                                                    </span>
                                                                                    <FiEye size={14} style={{ color: '#8b5cf6', opacity: 0.7 }} title="View attendee details" />
                                                                                </div>
                                                                                <span className="eb-seat-type">{seat.seatType}</span>
                                                                                <span className="eb-seat-price">{seat.price} EGP</span>
                                                                                {isRequestedForCancel && (
                                                                                    <span style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 700 }}>RETURN</span>
                                                                                )}
                                                                                {(seat.attendeeFirstName || seat.attendeeLastName) && (
                                                                                    <div className="eb-seat-attendee">
                                                                                        <FiUser size={12} /> {seat.attendeeFirstName} {seat.attendeeLastName}
                                                                                        {seat.attendeePhone && (
                                                                                            <span className="eb-att-phone"><FiPhone size={11} /> {seat.attendeePhone}</span>
                                                                                        )}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="eb-card-bottom">
                                                            <span className="eb-date">
                                                                Requested: {req.requestedAt
                                                                    ? formatDate(req.requestedAt)
                                                                    : 'N/A'}
                                                            </span>
                                                                 <div className="eb-actions">
                                                                    {booking.isReceiptUploaded && (
                                                                        <motion.button
                                                                            className="eb-view-receipt-btn"
                                                                            onClick={() => handleViewReceipt(booking._id, booking.instapayReceipt)}
                                                                            disabled={actionLoading === `receipt-${booking._id}`}
                                                                            whileHover={{ scale: 1.03 }}
                                                                            whileTap={{ scale: 0.97 }}
                                                                            style={{
                                                                                background: 'rgba(139, 92, 246, 0.2)',
                                                                                color: '#a78bfa',
                                                                                border: '1px solid rgba(139, 92, 246, 0.4)',
                                                                                display: 'flex', alignItems: 'center', gap: '6px',
                                                                                padding: '6px 12px', borderRadius: '6px',
                                                                                fontSize: '0.85rem',
                                                                                opacity: actionLoading === `receipt-${booking._id}` ? 0.7 : 1,
                                                                                cursor: actionLoading === `receipt-${booking._id}` ? 'not-allowed' : 'pointer'
                                                                            }}
                                                                        >
                                                                            <FiEye /> {actionLoading === `receipt-${booking._id}` ? 'Loading...' : 'View Receipt'}
                                                                        </motion.button>
                                                                    )}
                                                                    {!isExpired && isPending && (
                                                                        <>
                                                                            <motion.button
                                                                                className="eb-approve-btn"
                                                                                onClick={() => handleCancellationAction(booking._id, 'approve')}
                                                                                disabled={cancellationLoading}
                                                                                whileHover={{ scale: 1.03 }}
                                                                                whileTap={{ scale: 0.97 }}
                                                                            >
                                                                                <FiCheckCircle /> Approve Return
                                                                            </motion.button>
                                                                            <motion.button
                                                                                className="eb-reject-btn"
                                                                                onClick={() => handleCancellationAction(booking._id, 'reject')}
                                                                                disabled={cancellationLoading}
                                                                                whileHover={{ scale: 1.03 }}
                                                                                whileTap={{ scale: 0.97 }}
                                                                            >
                                                                                <FiXCircle /> Reject
                                                                            </motion.button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                        </div>
                                                    </motion.div>
                                                );
                                            });
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </>
                    )}
                </motion.div>
            </div>

            {/* Receipt Modal */}
            <AnimatePresence>
                {isReceiptModalOpen && selectedReceipt && (
                    <div className="modal-overlay" onClick={() => setIsReceiptModalOpen(false)} style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999,
                        display: 'flex', justifyContent: 'center', alignItems: 'center'
                    }}>
                        <motion.div
                            className="receipt-modal-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: '#1e1b4b', padding: '20px', borderRadius: '12px',
                                maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
                                border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                <h3 style={{ color: 'white', margin: 0 }}>InstaPay Receipt</h3>
                                <button
                                    onClick={() => setIsReceiptModalOpen(false)}
                                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer' }}
                                >
                                    <FiX size={24} />
                                </button>
                            </div>
                            <div style={{
                                flex: 1, overflow: 'auto', display: 'flex', justifyContent: 'center',
                                backgroundColor: '#000', borderRadius: '8px'
                            }}>
                                <img
                                    src={selectedReceipt}
                                    alt="Transaction Receipt"
                                    style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain' }}
                                />
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Seat Detail Modal */}
            <AnimatePresence>
                {isSeatModalOpen && selectedSeatInfo && (
                    <div className="modal-overlay" onClick={() => setIsSeatModalOpen(false)} style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 9999,
                        display: 'flex', justifyContent: 'center', alignItems: 'center',
                        backdropFilter: 'blur(5px)'
                    }}>
                        <motion.div
                            className="seat-modal-content"
                            onClick={(e) => e.stopPropagation()}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            style={{
                                background: '#11111a', padding: '30px', borderRadius: '24px',
                                maxWidth: '400px', width: '90%', display: 'flex', flexDirection: 'column',
                                border: '1px solid rgba(139, 92, 246, 0.3)',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ 
                                        width: '40px', height: '40px', borderRadius: '12px', 
                                        background: 'rgba(139, 92, 246, 0.15)', display: 'flex', 
                                        alignItems: 'center', justifyContent: 'center', color: '#8b5cf6' 
                                    }}>
                                        <FiGrid size={20} />
                                    </div>
                                    <h3 style={{ color: 'white', margin: 0, fontSize: '1.2rem' }}>Seat Information</h3>
                                </div>
                                <button
                                    onClick={() => setIsSeatModalOpen(false)}
                                    style={{ 
                                        background: 'rgba(255,255,255,0.05)', border: 'none', 
                                        color: '#9ca3af', cursor: 'pointer', padding: '8px',
                                        borderRadius: '10px', display: 'flex', alignItems: 'center'
                                    }}
                                >
                                    <FiX size={20} />
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{ 
                                    padding: '16px', background: 'rgba(255,255,255,0.02)', 
                                    borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' 
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Seat Label</span>
                                        <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: '1rem' }}>{formatSeatLabel(selectedSeatInfo)}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Section / Type</span>
                                        <span style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>
                                            {selectedSeatInfo.section} / {selectedSeatInfo.seatType}
                                        </span>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    <h4 style={{ color: '#94a3b8', fontSize: '0.85rem', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Attendee Details</h4>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                                        <div style={{ color: '#8b5cf6', opacity: 0.8 }}><FiUser size={18} /></div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>First Name</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedSeatInfo.attendeeFirstName || 'Not provided'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                                        <div style={{ color: '#8b5cf6', opacity: 0.8 }}><FiUser size={18} /></div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Last Name</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedSeatInfo.attendeeLastName || 'Not provided'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                                        <div style={{ color: '#22c55e', opacity: 0.8 }}><FiPhone size={18} /></div>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Phone Number</span>
                                            <span style={{ color: '#f8fafc', fontWeight: 600 }}>{selectedSeatInfo.attendeePhone || 'Not provided'}</span>
                                        </div>
                                    </div>
                                </div>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsSeatModalOpen(false)}
                                    style={{
                                        marginTop: '10px',
                                        padding: '14px',
                                        borderRadius: '14px',
                                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                                        color: 'white',
                                        border: 'none',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.4)'
                                    }}
                                >
                                    Close Details
                                </motion.button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </ProtectedRoute>
    );
};

export default EventBookingsPage;
