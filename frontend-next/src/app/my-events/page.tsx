"use client";
import React, { useState, useEffect } from 'react';
import api from "@/services/api";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';
import EventCard from '@/components/Event Components/EventCard';
import { Event } from '@/types/event';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { toast } from 'react-toastify';
import '@/components/Event Components/MyEventPage.css';
import '@/components/Event Components/EventBookings.css';

const MyEventsPage = () => {
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otpValue, setOtpValue] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [currentEventId, setCurrentEventId] = useState<string | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetchMyEvents();
    }, []);

    const fetchMyEvents = async () => {
        try {
            setLoading(true);
            const response = await api.get<any>('/user/events');
            const data = response.data.success ? response.data.data : response.data;
            if (Array.isArray(data)) {
                setEvents(data);
            } else {
                setEvents([]);
            }
        } catch (err: any) {
            setError('Failed to fetch your events: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = events.filter(event =>
        (event.title || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async (eventId: string, isApproved: boolean) => {
        if (!window.confirm('Are you sure you want to delete this event?')) return;
        setIsDeleting(true);
        try {
            if (isApproved) {
                const response = await api.post(`/event/${eventId}/request-deletion-otp`);
                if (response.data.success) {
                    setCurrentEventId(eventId);
                    setShowOtpModal(true);
                } else {
                    toast.error(response.data.message || 'Failed to send OTP');
                }
            } else {
                await api.delete(`/event/${eventId}`);
                setEvents(prev => prev.filter(e => e._id !== eventId));
                toast.success('Event deleted successfully');
            }
        } catch (err: any) {
            toast.error('Failed to delete event: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsDeleting(false);
        }
    };

    const verifyOtpAndDelete = async () => {
        if (!otpValue || otpValue.length < 6) {
            toast.error('Please enter a valid 6-digit OTP');
            return;
        }
        setIsVerifying(true);
        try {
            const response = await api.post('/event/verify-deletion-otp', { eventId: currentEventId, otp: otpValue });
            if (response.data.success) {
                setEvents(prev => prev.filter(e => e._id !== currentEventId));
                toast.success('Event deleted successfully');
                setShowOtpModal(false);
                setOtpValue('');
            }
        } catch (err: any) {
            toast.error('Failed to verify OTP: ' + (err.response?.data?.message || err.message));
            if (err.response?.data?.message?.includes('Invalid')) setOtpValue('');
            else setShowOtpModal(false);
        } finally {
            setIsVerifying(false);
        }
    };

    if (loading) return <div className="loading">Loading your events...</div>;

    return (
        <ProtectedRoute requiredRole="Organizer">
            <div className="event-list-container">
                <div className="event-header">
                    <h1 className="page-title">My Events</h1>
                    <div className="search-container">
                        <input type="text" placeholder="Search my events..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="search-input" />
                    </div>
                    <div className="organizer-buttons">
                        <Link href="/events" className="view-events-button">View All Events</Link>
                        <Link href="/my-events/new" className="create-event-button">Create New Event</Link>
                        <Link href="/my-events/analytics" className="analytics-button">Analytics</Link>
                    </div>
                </div>

                {filteredEvents.length > 0 ? (
                    <div className="event-grid">
                        {filteredEvents.map((event) => (
                            <div key={event._id} className="event-card-with-actions">
                                <EventCard event={event} />
                                <div className="event-actions">
                                    <div className="button-tooltip-container">
                                        {event.status === 'approved' ? (
                                            <span className="event-button disabled">Edit</span>
                                        ) : (
                                            <Link href={`/my-events/${event._id}/edit`} className="event-button">Edit</Link>
                                        )}
                                        {event.status === 'approved' && <div className="approval-tooltip">Approved events cannot be edited</div>}
                                    </div>
                                    {event.status !== 'approved' && (
                                        <div className="button-tooltip-container">
                                            <button
                                                onClick={() => handleDelete(event._id, false)}
                                                className="delete-button"
                                                disabled={isDeleting}
                                            >
                                                {isDeleting ? 'Deleting...' : 'Delete'}
                                            </button>
                                        </div>
                                    )}
                                    <div className="event-status-badge">
                                        <span className={`status-dot ${event.status}`}></span>
                                        <span className="status-text">{event.status}</span>
                                    </div>
                                    <Link href={`/my-events/${event._id}/bookings`} className="view-bookings-btn-card">
                                        View Bookings
                                    </Link>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="no-events-container">
                        <div className="no-events">
                            {searchTerm ? (
                                <><h2>No events found matching "{searchTerm}"</h2><p>Try a different search term or create a new event.</p></>
                            ) : (
                                <><h2>You haven't created any events yet</h2><p>Create your first event to start selling tickets and managing registrations.</p></>
                            )}
                            <Link href="/my-events/new" className="event-button">Create Your First Event</Link>
                        </div>
                    </div>
                )}

                {showOtpModal && (
                    <div className="modal-container">
                        <div className="modal-content">
                            <div className="modal-header">Verify OTP</div>
                            <div className="modal-message">Please enter the 6-digit OTP sent to your email to confirm event deletion</div>
                            <div className="otp-input-container">
                                {[0, 1, 2, 3, 4, 5].map((index) => (
                                    <input
                                        key={index} type="text" className="otp-digit" maxLength={1} value={otpValue[index] || ''}
                                        onChange={(e) => {
                                            const newOtp = otpValue.split('');
                                            newOtp[index] = e.target.value;
                                            setOtpValue(newOtp.join(''));
                                            if (e.target.value && index < 5) (e.target.nextElementSibling as HTMLInputElement)?.focus();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Backspace' && !otpValue[index] && index > 0) ((e.currentTarget as HTMLInputElement).previousElementSibling as HTMLInputElement)?.focus();
                                        }}
                                    />
                                ))}
                            </div>
                            <div>
                                <button className="modal-button confirm" onClick={verifyOtpAndDelete} disabled={isVerifying}>{isVerifying ? 'Verifying...' : 'Verify & Delete'}</button>
                                <button className="modal-button cancel" onClick={() => { setShowOtpModal(false); setOtpValue(''); }} disabled={isVerifying}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
};

export default MyEventsPage;
