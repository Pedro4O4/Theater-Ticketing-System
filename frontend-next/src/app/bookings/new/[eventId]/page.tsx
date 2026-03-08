"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar, FiMapPin, FiTag, FiMinus, FiPlus,
    FiShoppingCart, FiArrowLeft, FiCheckCircle, FiAlertCircle,
    FiCreditCard, FiUsers, FiGrid, FiUser, FiPhone, FiArrowRight, FiClock, FiCopy
} from 'react-icons/fi';
import { getImageUrl } from '@/utils/imageHelper';
import SeatSelector from '@/components/Booking component/SeatSelector';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Event } from '@/types/event';
import { Seat } from '@/types/booking';
import { toast } from 'react-toastify';
import { useLanguage } from '@/contexts/LanguageContext';
import '@/components/Booking component/BookingTicketForm.css';

interface AttendeeInfo {
    attendeeName: string;
    attendeePhone: string;
}

const BookTicketPage = () => {
    const params = useParams();
    const { t } = useLanguage();
    const eventId = params.eventId as string;
    const router = useRouter();
    const [event, setEvent] = useState<Event | null>(null);
    const [numberOfTickets, setNumberOfTickets] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isEventLoading, setIsEventLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Seat selection state
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [seatTotalPrice, setSeatTotalPrice] = useState(0);

    // Attendee form state
    const [showAttendeeForm, setShowAttendeeForm] = useState(false);
    const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo[]>([]);

    // Organizer InstaPay
    const [organizerInstapay, setOrganizerInstapay] = useState<string>('');
    const [organizerInstapayQR, setOrganizerInstapayQR] = useState<string>('');
    const [hasCopied, setHasCopied] = useState(false);
    const [bookingId, setBookingId] = useState<string>('');

    // Receipt upload state
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [receiptUploaded, setReceiptUploaded] = useState(false);
    const receiptInputRef = React.useRef<HTMLInputElement>(null);

    // Compress image to reduce payload size (same as UploadReceiptPage)
    const compressImage = (file: File, maxDimension = 1200, quality = 0.7): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let { width, height } = img;
                    if (width > maxDimension || height > maxDimension) {
                        if (width > height) {
                            height = Math.round((height * maxDimension) / width);
                            width = maxDimension;
                        } else {
                            width = Math.round((width * maxDimension) / height);
                            height = maxDimension;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d')!;
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = () => reject(new Error('Failed to load image'));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsDataURL(file);
        });
    };

    useEffect(() => {
        if (!eventId) return;
        const fetchEvent = async () => {
            try {
                setIsEventLoading(true);
                const response = await api.get<any>(`/event/${eventId}`);
                const data = response.data.success ? response.data.data : response.data;
                setEvent(data);
                // Read organizer InstaPay number from populated event data
                if (data.organizerId && typeof data.organizerId === 'object') {
                    setOrganizerInstapay(data.organizerId.instapayNumber || '');
                    setOrganizerInstapayQR(data.organizerId.instapayQR || '');
                }
            } catch (err: any) {
                console.error("Error fetching event details:", err);
                setError(err.response?.data?.message || "Failed to load event details");
            } finally {
                setIsEventLoading(false);
            }
        };
        fetchEvent();
    }, [eventId]);

    const handleTicketChange = (delta: number) => {
        if (!event) return;
        const max = event.remainingTickets || event.totalTickets || 0;
        const newVal = numberOfTickets + delta;
        if (newVal >= 1 && newVal <= Math.min(max, 10)) {
            setNumberOfTickets(newVal);
        }
    };

    const handleSeatsSelected = useCallback((seats: Seat[], totalPrice: number) => {
        setSelectedSeats(seats);
        setSeatTotalPrice(totalPrice);
    }, []);

    // Step 1 → Step 2: Click "Next" to go to attendee form
    const handleNext = () => {
        if (selectedSeats.length === 0) {
            toast.error("Please select at least one seat");
            return;
        }
        setError(null);

        // Initialize attendee info for each seat (preserve existing data)
        const newAttendeeInfo = selectedSeats.map((_seat, index) => {
            const existing = attendeeInfo[index];
            return existing || { attendeeName: '', attendeePhone: '' };
        });
        setAttendeeInfo(newAttendeeInfo);
        setShowAttendeeForm(true);
    };

    const handleBackToSeats = () => {
        setShowAttendeeForm(false);
    };

    const handleAttendeeChange = (index: number, field: keyof AttendeeInfo, value: string) => {
        setAttendeeInfo(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!event) {
            toast.error("Please select an event before booking");
            return;
        }

        // Validate seat selection for theater events
        if (event.hasTheaterSeating && selectedSeats.length === 0) {
            toast.error("Please select at least one seat");
            return;
        }

        // Validate attendee info for theater events
        if (event.hasTheaterSeating) {
            for (let i = 0; i < attendeeInfo.length; i++) {
                if (!attendeeInfo[i]?.attendeeName?.trim()) {
                    toast.error(`Please enter name for seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`);
                    return;
                }

                const phoneField = attendeeInfo[i]?.attendeePhone?.trim() || '';
                if (!phoneField) {
                    toast.error(`Please enter phone for seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`);
                    return;
                }

                if (!/^01\d{9}$/.test(phoneField)) {
                    toast.error(`Phone for seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber} must be 11 digits starting with 01`);
                    return;
                }

                attendeeInfo[i].attendeePhone = phoneField;
            }
        }

        setIsLoading(true);
        setError(null);

        try {
            const payload: any = {
                eventId: event._id,
                status: 'confirmed'
            };

            if (event.hasTheaterSeating) {
                payload.selectedSeats = selectedSeats.map((seat, index) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    attendeeName: attendeeInfo[index]?.attendeeName || '',
                    attendeePhone: attendeeInfo[index]?.attendeePhone || '',
                }));
            } else {
                payload.numberOfTickets = numberOfTickets;
            }

            const response = await api.post('/booking', payload);


            if (response.data.success) {
                setBookingId(response.data.data?._id || '');
                setSuccess(true);
            }
        } catch (err: any) {
            console.error("Booking error:", err);
            const msg = err.response?.data?.message || "Failed to book tickets. Please try again.";
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'TBA';
        return new Date(dateString).toLocaleDateString('en-US', {
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
                    <p>{t('booking.loadingEvent')}</p>
                </div>
            </div>
        );
    }

    if (!event) {
        return (
            <motion.div className="booking-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="booking-error-state">
                    <FiAlertCircle size={60} />
                    <h2>{t('booking.eventNotFound')}</h2>
                    <p>{t('booking.eventNotFoundDesc')}</p>
                    <motion.button onClick={() => router.push('/events')} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <FiArrowLeft /> {t('booking.browseEvents')}
                    </motion.button>
                </div>
            </motion.div>
        );
    }

    if (success) {
        const ticketCount = event.hasTheaterSeating ? selectedSeats.length : numberOfTickets;
        const totalToPay = event.hasTheaterSeating ? seatTotalPrice : numberOfTickets * (event.ticketPrice || 0);

        return (
            <motion.div className="booking-page" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.div className="booking-success-state" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 20 }}>
                    <motion.div className="success-icon pending-icon" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }}>
                        <FiClock size={80} />
                    </motion.div>
                    <h2>Payment Pending</h2>
                    <p>Your booking for {ticketCount} {event.hasTheaterSeating ? 'seat' : 'ticket'}{ticketCount > 1 ? 's' : ''} is reserved!</p>

                    {event.hasTheaterSeating && selectedSeats.length > 0 && (
                        <div className="success-seats">
                            {selectedSeats.map(seat => (
                                <span key={`${seat.section}-${seat.row}-${seat.seatNumber}`} className="seat-chip">
                                    {seat.row}{seat.seatNumber}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="instapay-section">
                        <h3>Pay via InstaPay</h3>
                        <p className="instapay-instruction">Send <strong>{totalToPay.toFixed(2)} EGP</strong> to the organizer&apos;s InstaPay below:</p>

                        {organizerInstapayQR && (
                            <div style={{
                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
                                margin: '16px 0', padding: '20px',
                                background: 'rgba(139, 92, 246, 0.06)', borderRadius: '16px',
                                border: '1px solid rgba(139, 92, 246, 0.2)'
                            }}>
                                <p style={{ fontSize: '1rem', color: '#a78bfa', margin: 0, fontWeight: 600 }}>
                                    Scan QR Code to pay via InstaPay
                                </p>
                                <img
                                    src={organizerInstapayQR}
                                    alt="InstaPay QR"
                                    style={{
                                        maxWidth: '300px', width: '100%', borderRadius: '14px',
                                        border: '3px solid rgba(139, 92, 246, 0.4)',
                                        boxShadow: '0 8px 30px rgba(139, 92, 246, 0.2)'
                                    }}
                                />
                                <p style={{ fontSize: '0.9rem', color: '#9ca3af', margin: 0 }}>
                                    Open InstaPay app → Scan QR → Send {totalToPay.toFixed(2)} EGP
                                </p>
                            </div>
                        )}
                        {organizerInstapay ? (
                            <div className="instapay-number-box" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className="instapay-number" style={{ flex: 1 }}>{organizerInstapay}</span>
                                <button
                                    type="button"
                                    className="copy-btn"
                                    onClick={() => {
                                        navigator.clipboard.writeText(organizerInstapay).catch(() => {
                                            const ta = document.createElement('textarea'); ta.value = organizerInstapay; ta.style.position = 'fixed'; ta.style.left = '-9999px'; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
                                        });
                                        setHasCopied(true);
                                        toast.success('InstaPay number copied!');
                                        setTimeout(() => setHasCopied(false), 2000);
                                    }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                    <FiCopy size={14} /> {hasCopied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        ) : !organizerInstapayQR ? (
                            <p className="instapay-fallback">Contact the event organizer for payment details.</p>
                        ) : null}

                        <p className="instapay-note">The organizer will confirm your booking once payment is verified.</p>

                        {/* Receipt Upload Section */}
                        <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(139, 92, 246, 0.08)', borderRadius: '12px', border: '1px solid rgba(139, 92, 246, 0.2)' }}>
                            <h4 style={{ margin: '0 0 8px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FiCreditCard /> Upload Payment Receipt
                            </h4>
                            <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: '0 0 12px' }}>Upload a screenshot of your InstaPay transfer to speed up verification.</p>

                            <input
                                type="file"
                                accept="image/*"
                                ref={receiptInputRef}
                                style={{ display: 'none' }}
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                                    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }
                                    setReceiptFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setReceiptPreview(reader.result as string);
                                    reader.readAsDataURL(file);
                                }}
                            />

                            {receiptUploaded ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 600 }}>
                                    <FiCheckCircle size={20} /> Receipt uploaded successfully!
                                </div>
                            ) : !receiptPreview ? (
                                <motion.button
                                    type="button"
                                    onClick={() => receiptInputRef.current?.click()}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        padding: '10px 20px', borderRadius: '10px',
                                        background: 'rgba(139, 92, 246, 0.2)', color: '#a78bfa',
                                        border: '1px dashed rgba(139, 92, 246, 0.5)', cursor: 'pointer',
                                        fontSize: '0.9rem', fontWeight: 500, width: '100%', justifyContent: 'center'
                                    }}
                                >
                                    <FiCreditCard /> Choose Receipt Image
                                </motion.button>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', maxHeight: '200px' }}>
                                        <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#000', borderRadius: '10px' }} />
                                        <button
                                            type="button"
                                            onClick={() => { setReceiptFile(null); setReceiptPreview(null); if (receiptInputRef.current) receiptInputRef.current.value = ''; }}
                                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', border: 'none', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <motion.button
                                        type="button"
                                        onClick={async () => {
                                            if (!receiptFile || !bookingId) return;
                                            try {
                                                setIsUploadingReceipt(true);
                                                const compressedBase64 = await compressImage(receiptFile);
                                                const response = await api.post(`/booking/${bookingId}/receipt`, { receiptBase64: compressedBase64 });
                                                if (response.data?.success) {
                                                    toast.success('Receipt uploaded! Awaiting organizer verification.');
                                                    setReceiptUploaded(true);
                                                } else {
                                                    toast.error(response.data?.message || 'Upload failed');
                                                }
                                            } catch (err: any) {
                                                toast.error(err.response?.data?.message || 'Failed to upload receipt');
                                            } finally {
                                                setIsUploadingReceipt(false);
                                            }
                                        }}
                                        disabled={isUploadingReceipt}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                        style={{
                                            padding: '10px 20px', borderRadius: '10px',
                                            background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', color: 'white',
                                            border: 'none', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                                        }}
                                    >
                                        {isUploadingReceipt ? 'Uploading...' : 'Submit Receipt'}
                                    </motion.button>
                                </div>
                            )}
                        </div>
                    </div>

                    <motion.button
                        className="view-bookings-btn"
                        onClick={() => router.push('/bookings')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Done — View My Bookings
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    const maxTickets = event.remainingTickets || event.totalTickets || 0;
    const ticketPrice = event.ticketPrice || 0;
    const totalDisplayPrice = event.hasTheaterSeating ? seatTotalPrice : numberOfTickets * ticketPrice;

    return (
        <ProtectedRoute requiredRole="Standard User">
            <motion.div className={`booking-page ${event.hasTheaterSeating ? 'fullpage-theater' : ''}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="booking-bg-effect"></div>

                {event.hasTheaterSeating ? (
                    <div className="theater-fullpage-container" dir="ltr">
                        {/* Compact Header Bar */}
                        <motion.div className="theater-header-bar" initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            <motion.button
                                className="back-btn-compact"
                                onClick={() => showAttendeeForm ? handleBackToSeats() : router.back()}
                                whileHover={{ x: -3 }}
                            >
                                <FiArrowLeft size={18} />
                                <span>{showAttendeeForm ? 'Back to Seats' : 'Back'}</span>
                            </motion.button>

                            <div className="event-info-compact">
                                <img src={getImageUrl(event.image)} alt="" className="event-thumb" />
                                <div>
                                    <h2>{event.title}</h2>
                                    <div className="event-meta-compact">
                                        <span><FiCalendar /> {formatDate(event.date)}</span>
                                        <span><FiMapPin /> {event.location || 'TBA'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="booking-summary-compact">
                                {selectedSeats.length > 0 && (
                                    <>
                                        <div className="header-seats-chips">
                                            {selectedSeats.map(seat => (
                                                <span key={`${seat.section}-${seat.row}-${seat.seatNumber}`} className="header-seat-chip">
                                                    {seat.row}{seat.seatNumber}
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

                        {/* Main Content: Seat selector OR Attendee form */}
                        <AnimatePresence mode="wait">
                            {!showAttendeeForm ? (
                                <motion.div
                                    key="seat-selection"
                                    className="theater-seat-area"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <SeatSelector eventId={event._id} onSeatsSelected={handleSeatsSelected} maxSeats={10} />
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
                                                            Seat {seat.row}{seat.seatNumber}
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
                                                            />
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>

                                        {/* InstaPay payment info - shown in attendee form */}
                                        <div style={{
                                            marginTop: '24px', padding: '20px', borderRadius: '16px',
                                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1), rgba(109, 40, 217, 0.08))',
                                            border: '1px solid rgba(139, 92, 246, 0.25)'
                                        }}>
                                            <h4 style={{ margin: '0 0 10px', fontSize: '1.15rem', display: 'flex', alignItems: 'center', gap: '10px', color: '#a78bfa' }}>
                                                <FiCreditCard size={22} /> Payment via InstaPay
                                            </h4>
                                            <p style={{ fontSize: '0.95rem', color: '#d1d5db', margin: 0, lineHeight: 1.5 }}>
                                                After confirming, pay <strong style={{ color: '#fbbf24' }}>{seatTotalPrice.toFixed(2)} EGP</strong> via InstaPay — payment details will be shown after booking.
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Mobile-only selection summary below theater */}
                        {selectedSeats.length > 0 && !showAttendeeForm && (
                            <div className="mobile-selection-summary">
                                <div className="mobile-selection-seats">
                                    {selectedSeats.map(seat => (
                                        <span key={`mob-${seat.section}-${seat.row}-${seat.seatNumber}`} className="mobile-seat-chip">
                                            {seat.row}{seat.seatNumber}
                                            <span className="mobile-chip-price">{seat.price} EGP</span>
                                        </span>
                                    ))}
                                </div>
                                <div className="mobile-selection-total">
                                    <span>{selectedSeats.length} seat{selectedSeats.length !== 1 ? 's' : ''} selected</span>
                                    <strong>{seatTotalPrice.toFixed(2)} EGP</strong>
                                </div>
                            </div>
                        )}

                        {/* Fixed Bottom Action Bar */}
                        <motion.div className="theater-action-bar" initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                            {error && <div className="error-inline"><FiAlertCircle /> {error}</div>}

                            {!showAttendeeForm ? (
                                <motion.button
                                    type="button"
                                    className="confirm-booking-btn"
                                    onClick={handleNext}
                                    disabled={selectedSeats.length === 0}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    <FiArrowRight />
                                    {selectedSeats.length > 0
                                        ? `Next — ${selectedSeats.length} Seat${selectedSeats.length !== 1 ? 's' : ''} — ${seatTotalPrice.toFixed(2)} EGP`
                                        : 'Select Seats to Continue'
                                    }
                                </motion.button>
                            ) : (
                                <motion.button
                                    type="button"
                                    className="confirm-booking-btn"
                                    onClick={() => handleSubmit()}
                                    disabled={isLoading || selectedSeats.length === 0}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isLoading ? (
                                        <><span className="btn-spinner"></span>Processing...</>
                                    ) : (
                                        <><FiCreditCard /> Confirm Booking — {seatTotalPrice.toFixed(2)} EGP</>
                                    )}
                                </motion.button>
                            )}
                        </motion.div>
                    </div>
                ) : (
                    <div className="booking-container">
                        <motion.button className="back-to-events" onClick={() => router.back()} initial={{ x: -30, opacity: 0 }} animate={{ x: 0, opacity: 1 }} whileHover={{ x: -5 }}>
                            <FiArrowLeft size={18} /><span>Back</span>
                        </motion.button>
                        <motion.div className="booking-card" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
                            <div className="booking-header"><FiShoppingCart className="header-icon" /><div><h1>Book Tickets</h1><p>Complete your reservation</p></div></div>
                            <form onSubmit={handleSubmit}>
                                <div className="event-preview">
                                    <div className="preview-image"><img src={getImageUrl(event.image)} alt={event.title} /></div>
                                    <div className="preview-info">
                                        <h3>{event.title}</h3>
                                        <div className="preview-meta">
                                            <span><FiCalendar /> {formatDate(event.date)}</span>
                                            <span><FiMapPin /> {event.location || 'TBA'}</span>
                                            <span><FiTag /> {event.category || 'General'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="ticket-selector-section">
                                    <div className="section-header"><FiUsers className="section-icon" /><div><h3>Number of Tickets</h3><span className="available-count">{maxTickets} available</span></div></div>
                                    <div className="ticket-counter">
                                        <button type="button" className="counter-btn" onClick={() => handleTicketChange(-1)} disabled={numberOfTickets <= 1}><FiMinus /></button>
                                        <span className="ticket-count">{numberOfTickets}</span>
                                        <button type="button" className="counter-btn" onClick={() => handleTicketChange(1)} disabled={numberOfTickets >= Math.min(maxTickets, 10)}><FiPlus /></button>
                                    </div>
                                </div>
                                <div className="price-summary-section">
                                    <div className="price-row"><span>Price per ticket</span><span>{ticketPrice.toFixed(2)} EGP</span></div>
                                    <div className="price-row"><span>Quantity</span><span>× {numberOfTickets}</span></div>
                                    <div className="price-divider"></div>
                                    <div className="price-row total"><span>Total</span><span className="total-price">{totalDisplayPrice.toFixed(2)} EGP</span></div>
                                </div>
                                <div className="booking-actions">
                                    <button type="button" className="cancel-btn" onClick={() => router.push('/events')}>Cancel</button>
                                    <button type="submit" className="confirm-btn" disabled={isLoading || maxTickets === 0}>{isLoading ? 'Processing...' : 'Confirm Booking'}</button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </motion.div>
        </ProtectedRoute>
    );
};

export default BookTicketPage;
