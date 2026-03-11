'use client';

import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar, FiMapPin, FiTag, FiMinus, FiPlus,
    FiShoppingCart, FiArrowLeft, FiCheckCircle, FiAlertCircle,
    FiCreditCard, FiUsers, FiGrid, FiUser, FiPhone, FiArrowRight, FiClock
} from 'react-icons/fi';
import api from '@/services/api';
import { getImageUrl } from '@/utils/imageHelper';
import SeatSelector from './SeatSelector';
import './BookingTicketForm.css';

interface Seat {
    row: string;
    seatNumber: number;
    section?: string;
    price?: number;
    seatLabel?: string;
}

interface AttendeeInfo {
    attendeeName: string;
    attendeePhone: string;
}

interface Event {
    _id: string;
    title: string;
    date?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category?: string;
    image?: string;
    ticketPrice?: number;
    totalTickets?: number;
    remainingTickets?: number;
    hasTheaterSeating?: boolean;
    cancellationDeadline?: string;
}

interface BookTicketFormProps {
    event?: Event;
    eventId?: string;
    onBookingComplete?: (data: any) => void;
}

const BookTicketForm = ({ event: preSelectedEvent, eventId, onBookingComplete }: BookTicketFormProps) => {
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
    const [numberOfTickets, setNumberOfTickets] = useState<number>(1);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isEventLoading, setIsEventLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);
    const router = useRouter();

    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [seatTotalPrice, setSeatTotalPrice] = useState<number>(0);

    // Attendee form state
    const [showAttendeeForm, setShowAttendeeForm] = useState<boolean>(false);
    const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo[]>([]);

    useEffect(() => {
        if (preSelectedEvent) {
            setSelectedEvent(preSelectedEvent);
            return;
        }

        if (eventId) {
            fetchEventById(eventId);
        }
    }, [preSelectedEvent, eventId]);

    const fetchEventById = async (id: string) => {
        try {
            setIsEventLoading(true);
            const response = await api.get(`/event/${id}`);

            if (response.data && response.data.data) {
                setSelectedEvent(response.data.data);
            } else {
                throw new Error('Invalid event data received');
            }
        } catch (err: any) {
            console.error("Error fetching event details:", err);
            setError("Failed to load event details: " + (err.response?.data?.message || err.message));
        } finally {
            setIsEventLoading(false);
        }
    };

    const handleTicketChange = (delta: number) => {
        const maxTickets = selectedEvent?.remainingTickets ?? selectedEvent?.totalTickets ?? 0;
        const newValue = numberOfTickets + delta;

        if (newValue >= 1 && newValue <= Math.min(maxTickets, 10)) {
            setNumberOfTickets(newValue);
        }
    };

    const handleSeatsSelected = useCallback((seats: Seat[], totalPrice: number) => {
        setSelectedSeats(seats);
        setSeatTotalPrice(totalPrice);
    }, []);

    // Open attendee form
    const handleContinueToAttendee = () => {
        if (selectedSeats.length === 0) {
            setError("Please select at least one seat");
            return;
        }
        setError(null);

        // Initialize attendee info for each seat (preserve existing data)
        const newAttendeeInfo = selectedSeats.map((seat, index) => {
            const existing = attendeeInfo[index];
            return existing || { attendeeName: '', attendeePhone: '' };
        });
        setAttendeeInfo(newAttendeeInfo);
        setShowAttendeeForm(true);
    };

    const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
        setAttendeeInfo(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleBackToSeats = () => {
        setShowAttendeeForm(false);
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!selectedEvent) {
            setError("Please select an event before booking");
            return;
        }

        if (selectedEvent.hasTheaterSeating && selectedSeats.length === 0) {
            setError("Please select at least one seat");
            return;
        }

        // Validate attendee info
        if (selectedEvent.hasTheaterSeating) {
            for (let i = 0; i < attendeeInfo.length; i++) {
                if (!attendeeInfo[i].attendeeName.trim()) {
                    setError(`Please enter name for ${selectedSeats[i].seatLabel || `Seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`}`);
                    return;
                }

                const phone = attendeeInfo[i].attendeePhone.trim();
                if (!/^01\d{9}$/.test(phone)) {
                    setError(`Phone for ${selectedSeats[i].seatLabel || `Seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`} must be 11 digits starting with 01`);
                    return;
                }
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const payload: any = {
                eventId: selectedEvent._id,
            };

            if (selectedEvent.hasTheaterSeating) {
                payload.selectedSeats = selectedSeats.map((seat, index) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    seatLabel: seat.seatLabel,
                    attendeeName: attendeeInfo[index]?.attendeeName || '',
                    attendeePhone: attendeeInfo[index]?.attendeePhone.trim() || '',
                }));
            } else {
                payload.numberOfTickets = numberOfTickets;
            }

            const response = await api.post('/booking', payload);

            setSuccess(true);

            setTimeout(() => {
                if (onBookingComplete) {
                    onBookingComplete(response.data);
                } else {
                    router.push('/bookings');
                }
            }, 2000);

        } catch (err: any) {
            console.error("Booking error:", err);
            setError(err.response?.data?.message || "Failed to book tickets. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const maxTickets = selectedEvent?.remainingTickets ?? selectedEvent?.totalTickets ?? 0;
    const ticketPrice = selectedEvent?.ticketPrice || 0;
    const totalPrice = selectedEvent?.hasTheaterSeating ? seatTotalPrice : numberOfTickets * ticketPrice;
    const ticketCount = selectedEvent?.hasTheaterSeating ? selectedSeats.length : numberOfTickets;

    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
            timeZone: 'Africa/Cairo',
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    if (isEventLoading) {
        return (
            <div className="booking-page">
                <div className="booking-loading">
                    <div className="loading-spinner-booking">
                        <div className="spinner-ring"></div>
                    </div>
                    <p>Loading event details...</p>
                </div>
            </div>
        );
    }

    if (!selectedEvent && !isEventLoading) {
        return (
            <motion.div
                className="booking-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="booking-error-state">
                    <FiAlertCircle size={60} />
                    <h2>Event Not Found</h2>
                    <p>The event you&apos;re looking for doesn&apos;t exist or has been removed.</p>
                    <motion.button
                        onClick={() => router.push('/events')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        <FiArrowLeft /> Browse Events
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    if (success) {
        return (
            <motion.div
                className="booking-page"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <motion.div
                    className="booking-success-state"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", damping: 20 }}
                >
                    <motion.div
                        className="success-icon"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring" }}
                    >
                        <FiCheckCircle size={80} />
                    </motion.div>
                    <h2>Booking Confirmed!</h2>
                    <p>
                        You have successfully booked {ticketCount} {selectedEvent?.hasTheaterSeating ? 'seat' : 'ticket'}{ticketCount > 1 ? 's' : ''} for {selectedEvent?.title}
                    </p>
                    {selectedEvent?.hasTheaterSeating && selectedSeats.length > 0 && (
                        <div className="success-seats">
                            {selectedSeats.map(seat => (
                                <span key={`${seat.section}-${seat.row}-${seat.seatNumber}`} className="seat-chip">
                                    {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
                                </span>
                            ))}
                        </div>
                    )}
                    <div className="success-details">
                        <span>Total Paid: {totalPrice.toFixed(2)} EGP</span>
                    </div>
                    <p className="redirect-text">Redirecting to your bookings...</p>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            className={`booking-page ${selectedEvent?.hasTheaterSeating ? 'fullpage-theater' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="booking-bg-effect"></div>

            {selectedEvent?.hasTheaterSeating ? (
                <div className="theater-fullpage-container">
                    <motion.div
                        className="theater-header-bar"
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        <motion.button
                            className="back-btn-compact"
                            onClick={() => showAttendeeForm ? handleBackToSeats() : router.back()}
                            whileHover={{ x: -3 }}
                        >
                            <FiArrowLeft size={18} />
                            <span>{showAttendeeForm ? 'Back to Seats' : 'Back'}</span>
                        </motion.button>

                        <div className="event-info-compact">
                            <img src={getImageUrl(selectedEvent.image)} alt="" className="event-thumb" />
                            <div>
                                <h2>{selectedEvent.title}</h2>
                                <div className="event-meta-compact">
                                    <span><FiCalendar /> {formatDate(selectedEvent.date)}</span>
                                    <span><FiMapPin /> {selectedEvent.location || 'TBA'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="booking-summary-compact">
                            {selectedSeats.length > 0 && (
                                <>
                                    <div className="header-seats-chips">
                                        {selectedSeats.map(seat => (
                                            <span key={`${seat.section}-${seat.row}-${seat.seatNumber}`} className="header-seat-chip">
                                                {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
                                                <span className="header-chip-price">{seat.price} EGP</span>
                                            </span>
                                        ))}
                                    </div>
                                    <span className="seats-count">{selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''}</span>
                                    <span className="total-amount">{seatTotalPrice.toFixed(2)} EGP</span>
                                </>
                            )}
                        </div>
                    </motion.div>

                    <AnimatePresence mode="wait">
                        {!showAttendeeForm ? (
                            <motion.div
                                key="seat-selection"
                                className="theater-seat-area"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                <SeatSelector
                                    eventId={selectedEvent._id}
                                    onSeatsSelected={handleSeatsSelected}
                                    maxSeats={10}
                                />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="attendee-form"
                                className="attendee-form-area"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                            >
                                <div className="attendee-form-container">
                                    <div className="attendee-form-header">
                                        <FiUsers size={24} />
                                        <div>
                                            <h3>Attendee Information</h3>
                                            <p>Enter name and phone for each seat</p>
                                        </div>
                                    </div>

                                    <div className="attendee-cards-list">
                                        {selectedSeats.map((seat, index) => (
                                            <motion.div
                                                key={`${seat.section}-${seat.row}-${seat.seatNumber}`}
                                                className="attendee-card"
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.08 }}
                                            >
                                                <div className="attendee-card-header">
                                                    <span className="attendee-seat-badge">
                                                        {seat.seatLabel || `Seat ${seat.row}${seat.seatNumber}`}
                                                    </span>
                                                    <span className="attendee-seat-price">{seat.price} EGP</span>
                                                </div>
                                                <div className="attendee-fields">
                                                    <div className="attendee-field">
                                                        <FiUser className="field-icon" />
                                                        <input
                                                            type="text"
                                                            placeholder="Full Name"
                                                            value={attendeeInfo[index]?.attendeeName || ''}
                                                            onChange={(e) => handleAttendeeChange(index, 'attendeeName', e.target.value)}
                                                            className="attendee-input"
                                                        />
                                                    </div>
                                                    <div className="attendee-field">
                                                        <FiPhone className="field-icon" />
                                                        <input
                                                            type="tel"
                                                            placeholder="01xxxxxxxxx"
                                                            value={attendeeInfo[index]?.attendeePhone || ''}
                                                            onChange={(e) => handleAttendeeChange(index, 'attendeePhone', e.target.value)}
                                                            className="attendee-input"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                        />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <motion.div
                        className="theater-action-bar"
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                    >
                        {error && (
                            <div className="error-inline">
                                <FiAlertCircle /> {error}
                            </div>
                        )}

                        {!showAttendeeForm ? (
                            <motion.button
                                type="button"
                                className="confirm-booking-btn"
                                onClick={handleContinueToAttendee}
                                disabled={selectedSeats.length === 0}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <FiArrowRight />
                                {selectedSeats.length > 0
                                    ? `Continue — ${selectedSeats.length} Seat${selectedSeats.length !== 1 ? 's' : ''} — ${seatTotalPrice.toFixed(2)} EGP`
                                    : 'Select Seats to Continue'
                                }
                            </motion.button>
                        ) : (
                            <motion.button
                                type="button"
                                className="confirm-booking-btn"
                                onClick={handleSubmit}
                                disabled={isLoading || selectedSeats.length === 0}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {isLoading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <FiCreditCard />
                                        Confirm Booking — {seatTotalPrice.toFixed(2)} EGP
                                    </>
                                )}
                            </motion.button>
                        )}
                    </motion.div>
                </div>
            ) : (
                <div className="booking-container">
                    <motion.button
                        className="back-to-events"
                        onClick={() => router.back()}
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        whileHover={{ x: -5 }}
                    >
                        <FiArrowLeft size={18} />
                        <span>Back</span>
                    </motion.button>

                    <motion.div
                        className="booking-card"
                        initial={{ y: 30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="booking-header">
                            <FiShoppingCart className="header-icon" />
                            <div>
                                <h1>Book Tickets</h1>
                                <p>Complete your reservation</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <motion.div
                                className="event-preview"
                                whileHover={{ scale: 1.01 }}
                            >
                                <div className="preview-image">
                                    <img
                                        src={getImageUrl(selectedEvent?.image)}
                                        alt={selectedEvent?.title}
                                    />
                                </div>
                                <div className="preview-info">
                                    <h3>{selectedEvent?.title}</h3>
                                    <div className="preview-meta">
                                        <span><FiCalendar /> {formatDate(selectedEvent?.date)}</span>
                                        {selectedEvent?.startTime && <span><FiClock /> {selectedEvent.startTime} {selectedEvent.endTime ? `- ${selectedEvent.endTime}` : ''}</span>}
                                        <span><FiMapPin /> {selectedEvent?.location || 'TBA'}</span>
                                        <span><FiTag /> {selectedEvent?.category || 'General'}</span>
                                        {selectedEvent?.cancellationDeadline && <span style={{ color: new Date() > new Date(selectedEvent.cancellationDeadline) ? '#ef4444' : 'inherit' }}><FiAlertCircle /> Cancel Before: {new Date(selectedEvent.cancellationDeadline).toLocaleString('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                    </div>
                                </div>
                            </motion.div>

                            <div className="ticket-selector-section">
                                <div className="section-header">
                                    <FiUsers className="section-icon" />
                                    <div>
                                        <h3>Number of Tickets</h3>
                                        <span className="available-count">{maxTickets} available</span>
                                    </div>
                                </div>

                                <div className="ticket-counter">
                                    <motion.button
                                        type="button"
                                        className="counter-btn"
                                        onClick={() => handleTicketChange(-1)}
                                        disabled={numberOfTickets <= 1}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiMinus />
                                    </motion.button>

                                    <motion.span
                                        className="ticket-count"
                                        key={numberOfTickets}
                                        initial={{ scale: 1.2 }}
                                        animate={{ scale: 1 }}
                                    >
                                        {numberOfTickets}
                                    </motion.span>

                                    <motion.button
                                        type="button"
                                        className="counter-btn"
                                        onClick={() => handleTicketChange(1)}
                                        disabled={numberOfTickets >= Math.min(maxTickets, 10)}
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <FiPlus />
                                    </motion.button>
                                </div>
                            </div>

                            <motion.div
                                className="price-summary-section"
                                layout
                            >
                                <div className="price-row">
                                    <span>Price per ticket</span>
                                    <span>{ticketPrice.toFixed(2)} EGP</span>
                                </div>
                                <div className="price-row">
                                    <span>Quantity</span>
                                    <span>× {numberOfTickets}</span>
                                </div>
                                <div className="price-divider"></div>
                                <motion.div
                                    className="price-row total"
                                    key={totalPrice}
                                    initial={{ scale: 1.02 }}
                                    animate={{ scale: 1 }}
                                >
                                    <span>Total</span>
                                    <span className="total-price">{totalPrice.toFixed(2)} EGP</span>
                                </motion.div>
                            </motion.div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        className="booking-error"
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -10 }}
                                    >
                                        <FiAlertCircle />
                                        <div>
                                            <p>{error}</p>
                                            <span>Please try again or contact support.</span>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="booking-actions">
                                <motion.button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() => router.push('/events')}
                                    disabled={isLoading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    Cancel
                                </motion.button>

                                <motion.button
                                    type="submit"
                                    className="confirm-btn"
                                    disabled={isLoading || maxTickets === 0}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="btn-spinner"></span>
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <FiCreditCard />
                                            Confirm Booking
                                        </>
                                    )}
                                </motion.button>
                            </div>
                        </form>
                    </motion.div>
                </div>
            )}
        </motion.div>
    );
};

export default BookTicketForm;
