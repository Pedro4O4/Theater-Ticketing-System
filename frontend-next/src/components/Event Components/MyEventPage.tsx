'use client';

import { useState, useEffect, ChangeEvent, KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';
import api from '@/services/api';
import EventCard from './EventCard';
import ConfirmationDialog from '../AdminComponent/ConfirmationDialog';
import { Event } from '@/types/event';
import './MyEventPage.css';

const MyEventsPage = () => {
    const [showOtpModal, setShowOtpModal] = useState<boolean>(false);
    const [otpValue, setOtpValue] = useState<string>('');
    const [isVerifying, setIsVerifying] = useState<boolean>(false);
    const [currentEventId, setCurrentEventId] = useState<string | null>(null);
    const [events, setEvents] = useState<Event[]>([]);
    const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState<boolean>(false);
    const [deleteConfirm, setDeleteConfirm] = useState<{ eventId: string; eventName: string; isApproved: boolean } | null>(null);
    const router = useRouter();
    const { user } = useAuth();

    useEffect(() => {
        if (!user) {
            router.push('/login');
            return;
        }

        if (user.role !== 'Organizer') {
            router.push('/events');
            return;
        }

        fetchMyEvents();
    }, [router, user]);

    useEffect(() => {
        if (events.length > 0) {
            const filtered = events.filter(event =>
                (event.title || event.name || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredEvents(filtered);
        }
    }, [searchTerm, events]);

    const fetchMyEvents = async () => {
        try {
            const response = await api.get('/user/events');

            if (response.data) {
                const eventsData: Event[] = Array.isArray(response.data) ? response.data :
                    (response.data.events || response.data.data || []);

                setEvents(eventsData);
                setFilteredEvents(eventsData);
            }
        } catch (err: any) {
            setError('Failed to fetch your events: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    };

    const handleDeleteClick = (eventId: string, eventName: string, isApproved: boolean) => {
        setDeleteConfirm({ eventId, eventName, isApproved });
    };

    const handleDeleteConfirm = async () => {
        if (!deleteConfirm) return;

        const { eventId, isApproved } = deleteConfirm;
        setIsDeleting(true);

        try {
            if (isApproved) {
                const response = await api.post(`/event/${eventId}/request-deletion-otp`, {});

                if (response.data.success) {
                    setCurrentEventId(eventId);
                    setShowOtpModal(true);
                } else {
                    alert(response.data.message || 'Failed to send OTP');
                }
            } else {
                await api.delete(`/event/${eventId}`);

                setFilteredEvents(prev => prev.filter(event => (event.id || event._id) !== eventId));
                setEvents(prev => prev.filter(event => (event.id || event._id) !== eventId));
                alert('Event deleted successfully');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            alert('Failed to delete event: ' + errorMessage);
        } finally {
            setIsDeleting(false);
            setDeleteConfirm(null);
        }
    };

    const verifyOtpAndDelete = async () => {
        if (!otpValue || otpValue.length < 6) {
            alert('Please enter a valid 6-digit OTP');
            return;
        }

        setIsVerifying(true);

        try {
            const response = await api.post('/event/verify-deletion-otp', {
                eventId: currentEventId,
                otp: otpValue
            });

            if (response.data.success) {
                setFilteredEvents(prev => prev.filter(event => (event.id || event._id) !== currentEventId));
                setEvents(prev => prev.filter(event => (event.id || event._id) !== currentEventId));
                alert('Event deleted successfully');
                setShowOtpModal(false);
                setOtpValue('');
            }
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            alert('Failed to verify OTP: ' + errorMessage);

            if (errorMessage.includes('Invalid or expired OTP')) {
                setOtpValue('');
            } else {
                setShowOtpModal(false);
                setOtpValue('');
            }
        } finally {
            setIsVerifying(false);
        }
    };

    const handleOtpInput = (e: ChangeEvent<HTMLInputElement>, index: number) => {
        const value = e.target.value;
        const newOtp = otpValue.split('');
        newOtp[index] = value;
        setOtpValue(newOtp.join(''));

        if (value && index < 5) {
            const nextInput = e.target.nextElementSibling as HTMLInputElement | null;
            nextInput?.focus();
        }
    };

    const handleOtpKeyDown = (e: KeyboardEvent<HTMLInputElement>, index: number) => {
        if (e.key === 'Backspace' && !otpValue[index] && index > 0) {
            const prevInput = (e.target as HTMLInputElement).previousElementSibling as HTMLInputElement | null;
            prevInput?.focus();
        }
    };

    if (loading) {
        return <div className="loading">Loading your events...</div>;
    }

    if (error) {
        return (
            <div className="no-events-container">
                <div className="no-events">
                    <h2>Error loading events</h2>
                    <p>{error}</p>
                    <Link href="/my-events/new" className="event-button">
                        Create Your First Event
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="event-list-container">
            <div className="event-header">
                <h1 className="page-title">My Events</h1>
                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Search my events..."
                        value={searchTerm}
                        onChange={handleSearchChange}
                        className="search-input"
                    />
                </div>
                <div className="organizer-buttons">
                    <Link href="/events" className="view-events-button">View All Events</Link>
                    <Link href="/my-events/new" className="create-event-button">Create New Event</Link>
                    <Link href="/my-events/analytics" className="analytics-button">Analytics</Link>
                </div>
            </div>

            {filteredEvents && filteredEvents.length > 0 ? (
                <div className="event-grid">
                    {filteredEvents.map((event) => (
                        <div key={event.id || event._id} className="event-card-with-actions">
                            <EventCard event={event} />
                            <div className="event-info">
                            </div>
                            <div className="event-actions">
                                <h3 className="event-title">{event.title || event.name}</h3>
                                <Link href={`/events/${event.id || event._id}`} className="event-button">Details</Link>

                                <div className="button-tooltip-container">
                                    {event.status === 'approved' ? (
                                        <span className="event-button disabled">Edit</span>
                                    ) : (
                                        <Link href={`/my-events/${event.id || event._id}/edit`} className="event-button">Edit</Link>
                                    )}
                                    {event.status === 'approved' &&
                                        <div className="approval-tooltip">Approved events cannot be edited</div>
                                    }
                                </div>

                                <div className="button-tooltip-container">
                                    <button
                                        onClick={() => handleDeleteClick(
                                            event.id || event._id || '',
                                            event.title || event.name || 'this event',
                                            event.status === 'approved'
                                        )}
                                        className="delete-button"
                                        disabled={isDeleting}
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>

                                {event.remainingTickets !== undefined && (
                                    <div className="tickets-badge">
                                        <span className="tickets-count">{event.remainingTickets}</span>
                                        <span className="tickets-label">tickets left</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="no-events-container">
                    <div className="no-events">
                        {searchTerm ? (
                            <>
                                <h2>No events found matching &quot;{searchTerm}&quot;</h2>
                                <p>Try a different search term or create a new event.</p>
                            </>
                        ) : (
                            <>
                                <h2>You haven&apos;t created any events yet</h2>
                                <p>Create your first event to start selling tickets and managing registrations.</p>
                            </>
                        )}
                        <Link href="/my-events/new" className="event-button">
                            Create Your First Event
                        </Link>
                    </div>
                </div>
            )}

            {showOtpModal && (
                <div className="modal-container">
                    <div className="modal-content">
                        <div className="modal-header">Verify OTP</div>
                        <div className="modal-message">
                            Please enter the 6-digit OTP sent to your email to confirm event deletion
                        </div>

                        <div className="otp-input-container">
                            {Array(6).fill(0).map((_, index) => (
                                <input
                                    key={index}
                                    type="text"
                                    className="otp-digit"
                                    maxLength={1}
                                    value={otpValue[index] || ''}
                                    onChange={(e) => handleOtpInput(e, index)}
                                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                                />
                            ))}
                        </div>

                        <div>
                            <button
                                className="modal-button confirm"
                                onClick={verifyOtpAndDelete}
                                disabled={isVerifying}
                            >
                                {isVerifying ? 'Verifying...' : 'Verify & Delete'}
                            </button>
                            <button
                                className="modal-button cancel"
                                onClick={() => {
                                    setShowOtpModal(false);
                                    setOtpValue('');
                                }}
                                disabled={isVerifying}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmationDialog
                isOpen={!!deleteConfirm}
                title="Delete Event"
                message="Are you sure you want to permanently delete this event?"
                itemName={deleteConfirm?.eventName}
                confirmText="Delete Event"
                cancelText="Cancel"
                variant="danger"
                isLoading={isDeleting}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setDeleteConfirm(null)}
            />
        </div>
    );
};

export default MyEventsPage;
