"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiCalendar, FiMapPin, FiTag, FiMinus, FiPlus,
    FiShoppingCart, FiArrowLeft, FiCheckCircle, FiAlertCircle,
    FiCreditCard, FiUsers, FiGrid, FiUser, FiPhone, FiArrowRight, FiClock, FiCopy, FiExternalLink, FiTrash2
} from 'react-icons/fi';
import { getImageUrl } from '@/utils/imageHelper';
import SeatSelector from '@/components/Booking component/SeatSelector';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Event } from '@/types/event';
import { Seat } from '@/types/booking';
import CancelSeatsModal from '@/components/Booking component/CancelSeatsModal';
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
    const [existingSeats, setExistingSeats] = useState<{ row: string; seatNumber: number; section: string }[]>([]);
    const [initialSeatsData, setInitialSeatsData] = useState<any>(null);

    // Attendee form state
    const [showAttendeeForm, setShowAttendeeForm] = useState(false);
    const [attendeeInfo, setAttendeeInfo] = useState<AttendeeInfo[]>([]);

    const [organizerInstapay, setOrganizerInstapay] = useState<string>('');
    const [organizerInstapayQR, setOrganizerInstapayQR] = useState<string>('');
    const [organizerInstapayLink, setOrganizerInstapayLink] = useState<string>('');
    const [hasCopied, setHasCopied] = useState(false);
    const [bookingId, setBookingId] = useState<string>('');

    // Receipt upload state
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
    const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);
    const [receiptUploaded, setReceiptUploaded] = useState(false);
    const receiptInputRef = React.useRef<HTMLInputElement>(null);

    // Seat hold state
    const [holdId, setHoldId] = useState<string | null>(null);
    const [holdExpiresAt, setHoldExpiresAt] = useState<Date | null>(null);
    const [holdCountdown, setHoldCountdown] = useState<number>(0);
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    const holdIdRef = useRef<string | null>(null); // for cleanup in useEffect

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
        const fetchAllData = async () => {
            setIsEventLoading(true);
            try {
                // Fetch event details
                const eventPromise = api.get<any>(`/event/${eventId}`);

                // Fetch user bookings (optional)
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                const bookingsPromise = token ? api.get('/user/bookings').catch(e => null) : Promise.resolve(null);

                // Fetch theater seats eagerly
                const seatsPromise = api.get<any>(`/booking/event/${eventId}/seats`).catch(e => null);

                // Wait for all three
                const [eventResponse, bookingsResponse, seatsResponse] = await Promise.all([eventPromise, bookingsPromise, seatsPromise]);

                // Process event
                const eventData = eventResponse.data.success ? eventResponse.data.data : eventResponse.data;
                setEvent(eventData);
                if (eventData.organizerId && typeof eventData.organizerId === 'object') {
                    setOrganizerInstapay(eventData.organizerId.instapayNumber || '');
                    setOrganizerInstapayQR(eventData.organizerId.instapayQR || '');
                    setOrganizerInstapayLink(eventData.organizerId.instapayLink || '');
                }

                // Process bookings (if logged in and successful)
                if (bookingsResponse && bookingsResponse.data) {
                    let bookingsData: any[] = [];
                    if (bookingsResponse.data.success !== undefined) {
                        bookingsData = bookingsResponse.data.data;
                    } else if (Array.isArray(bookingsResponse.data)) {
                        bookingsData = bookingsResponse.data;
                    }

                    const bookedSeats: { row: string; seatNumber: number; section: string }[] = [];
                    bookingsData.forEach(booking => {
                        const bEventId = typeof booking.eventId === 'object' ? booking.eventId._id : booking.eventId;
                        if (bEventId === eventId && booking.status !== 'canceled' && booking.status !== 'rejected') {
                            if (booking.selectedSeats && Array.isArray(booking.selectedSeats)) {
                                bookedSeats.push(...booking.selectedSeats);
                            }
                        }
                    });
                    setExistingSeats(bookedSeats);
                }

                // Process eager seats data
                if (seatsResponse?.data?.success) {
                    setInitialSeatsData(seatsResponse.data.data);
                }

            } catch (err: any) {
                console.error("Error fetching event data:", err);
                setError(err.response?.data?.message || "Failed to load event details");
            } finally {
                setIsEventLoading(false);
            }
        };

        fetchAllData();
    }, [eventId]);

    // Hold countdown timer
    useEffect(() => {
        if (!holdExpiresAt || !showAttendeeForm) return;

        const tick = () => {
            const remaining = Math.max(0, Math.floor((holdExpiresAt.getTime() - Date.now()) / 1000));
            setHoldCountdown(remaining);

            if (remaining <= 0) {
                // Hold expired — go back to seat selection
                toast.warning('Your seat hold has expired. Please select seats again.');
                setShowAttendeeForm(false);
                setHoldId(null);
                holdIdRef.current = null;
                setHoldExpiresAt(null);
            }
        };

        tick(); // run immediately
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [holdExpiresAt, showAttendeeForm]);

    // Release hold on page unload/navigation
    useEffect(() => {
        holdIdRef.current = holdId;
    }, [holdId]);

    useEffect(() => {
        const releaseOnUnload = () => {
            if (holdIdRef.current) {
                // Use sendBeacon for reliable cleanup on page close
                const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
                if (token) {
                    navigator.sendBeacon(
                        `/api/v1/booking/hold-seats/${holdIdRef.current}`,
                        '' // sendBeacon can't do DELETE, but we'll handle via the API proxy
                    );
                }
            }
        };

        window.addEventListener('beforeunload', releaseOnUnload);
        return () => {
            window.removeEventListener('beforeunload', releaseOnUnload);
            // Cleanup hold when component unmounts
            if (holdIdRef.current) {
                api.delete(`/booking/hold-seats/${holdIdRef.current}`).catch(() => { });
            }
        };
    }, []);

    const handleTicketChange = (delta: number) => {
        if (!event) return;
        const max = event.remainingTickets ?? event.totalTickets ?? 0;
        const newVal = numberOfTickets + delta;
        if (newVal >= 1 && newVal <= Math.min(max, 10)) {
            setNumberOfTickets(newVal);
        }
    };

    const handleSeatsSelected = useCallback((seats: Seat[], totalPrice: number) => {
        setSelectedSeats(seats);
        setSeatTotalPrice(totalPrice);
    }, []);

    // Step 1 → Step 2: Click "Next" to hold seats and go to attendee form
    const handleNext = async () => {
        if (selectedSeats.length === 0) {
            toast.error("Please select at least one seat");
            return;
        }
        setError(null);
        setIsLoading(true);

        try {
            // Call hold-seats API for atomic seat reservation
            const response = await api.post('/booking/hold-seats', {
                eventId: event?._id,
                seats: selectedSeats.map(s => ({
                    row: s.row,
                    seatNumber: s.seatNumber,
                    section: s.section || 'main',
                })),
            });

            if (response.data.success) {
                const { holdId: newHoldId, expiresAt } = response.data.data;
                setHoldId(newHoldId);
                holdIdRef.current = newHoldId;
                setHoldExpiresAt(new Date(expiresAt));

                // Initialize attendee info for each seat (preserve existing data)
                const newAttendeeInfo = selectedSeats.map((_seat, index) => {
                    const existing = attendeeInfo[index];
                    return existing || { attendeeName: '', attendeePhone: '' };
                });
                setAttendeeInfo(newAttendeeInfo);
                setShowAttendeeForm(true);
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to hold seats. Please try again.';
            setError(msg);
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancelSeatsConfirm = async (seatKeys: string[], cancelAll: boolean) => {
        setIsLoading(true);
        try {
            // 1. Release the current hold
            if (holdId) {
                await api.delete(`/booking/hold-seats/${holdId}`);
            }

            if (cancelAll) {
                // If canceling all, just go back to seat selection
                setHoldId(null);
                holdIdRef.current = null;
                setHoldExpiresAt(null);
                setShowAttendeeForm(false);
                setSelectedSeats([]);
                setSeatTotalPrice(0);
                setIsCancelModalOpen(false);
                toast.info('All seats released.');
                return;
            }

            // 2. Filter remaining seats
            const remainingSeats = selectedSeats.filter(seat => {
                const key = `${seat.section}-${seat.row}-${seat.seatNumber}`;
                return !seatKeys.includes(key);
            });

            // Update attendee info as well (by index)
            const remainingIndices = selectedSeats
                .map((seat, index) => ({ seat, index }))
                .filter(item => {
                    const key = `${item.seat.section}-${item.seat.row}-${item.seat.seatNumber}`;
                    return !seatKeys.includes(key);
                })
                .map(item => item.index);

            const newAttendeeInfo = remainingIndices.map(idx => attendeeInfo[idx]);
            setAttendeeInfo(newAttendeeInfo);

            // 3. Re-hold the remaining seats
            const response = await api.post('/booking/hold-seats', {
                eventId: event?._id,
                seats: remainingSeats.map(s => ({
                    row: s.row,
                    seatNumber: s.seatNumber,
                    section: s.section || 'main',
                })),
            });

            if (response.data.success) {
                const { holdId: newHoldId, expiresAt } = response.data.data;
                setHoldId(newHoldId);
                holdIdRef.current = newHoldId;
                setHoldExpiresAt(new Date(expiresAt));
                setSelectedSeats(remainingSeats);
                
                // Recalculate total price
                const newTotal = remainingSeats.reduce((sum, s) => sum + (s.price || 0), 0);
                setSeatTotalPrice(newTotal);

                toast.success(`${seatKeys.length} seat(s) released.`);
            }
        } catch (err: any) {
            console.error("Cancellation error:", err);
            toast.error(err.response?.data?.message || "Failed to cancel seats. Please try again.");
        } finally {
            setIsLoading(false);
            setIsCancelModalOpen(false);
        }
    };

    const handleBackToSeats = async () => {
        // Release hold when going back to seat selection
        if (holdId) {
            try {
                await api.delete(`/booking/hold-seats/${holdId}`);
            } catch { /* ignore — hold may have already expired */ }
            setHoldId(null);
            holdIdRef.current = null;
            setHoldExpiresAt(null);
        }
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
                    toast.error(`Please enter name for ${selectedSeats[i].seatLabel || `seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`}`);
                    return;
                }

                const phoneField = attendeeInfo[i]?.attendeePhone?.trim() || '';
                if (!phoneField) {
                    toast.error(`Please enter phone for ${selectedSeats[i].seatLabel || `seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`}`);
                    return;
                }

                if (!/^01\d{9}$/.test(phoneField)) {
                    toast.error(`Phone for ${selectedSeats[i].seatLabel || `seat ${selectedSeats[i].row}${selectedSeats[i].seatNumber}`} must be 11 digits starting with 01`);
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
                status: 'confirmed',
                holdId: holdId || undefined,
            };

            if (event.hasTheaterSeating) {
                payload.selectedSeats = selectedSeats.map((seat, index) => ({
                    row: seat.row,
                    seatNumber: seat.seatNumber,
                    section: seat.section,
                    seatLabel: seat.seatLabel,
                    attendeeName: attendeeInfo[index]?.attendeeName || '',
                    attendeePhone: attendeeInfo[index]?.attendeePhone || '',
                }));
            } else {
                payload.numberOfTickets = numberOfTickets;
            }

            const response = await api.post('/booking', payload);


            if (response.data.success) {
                setBookingId(response.data.data?._id || '');
                setHoldId(null);
                holdIdRef.current = null;
                setHoldExpiresAt(null);
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
                                    {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
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
                        ) : !organizerInstapayQR && !organizerInstapayLink ? (
                            <p className="instapay-fallback">Contact the event organizer for payment details.</p>
                        ) : null}

                        {organizerInstapayLink && (
                            <div style={{
                                marginTop: '16px',
                                display: 'flex',
                                justifyContent: 'center'
                            }}>
                                <a
                                    href={organizerInstapayLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '12px 24px',
                                        background: 'rgba(16, 185, 129, 0.15)',
                                        color: '#10b981',
                                        border: '1px solid rgba(16, 185, 129, 0.3)',
                                        borderRadius: '12px',
                                        textDecoration: 'none',
                                        fontWeight: 600,
                                        transition: 'all 0.2s',
                                        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.1)'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.25)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.15)';
                                        e.currentTarget.style.transform = 'translateY(0)';
                                    }}
                                >
                                    <FiExternalLink /> Pay directly via InstaPay Link
                                </a>
                            </div>
                        )}

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
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
                                    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be less than 5MB'); return; }

                                    setReceiptFile(file);
                                    const reader = new FileReader();
                                    reader.onloadend = () => setReceiptPreview(reader.result as string);
                                    reader.readAsDataURL(file);

                                    if (!bookingId) return;
                                    try {
                                        setIsUploadingReceipt(true);
                                        const compressedBase64 = await compressImage(file);
                                        const response = await api.post(`/booking/${bookingId}/receipt`, { receiptBase64: compressedBase64 });
                                        if (response.data?.success) {
                                            toast.success('Receipt uploaded! Awaiting organizer verification.');
                                            setReceiptUploaded(true);
                                        } else {
                                            toast.error(response.data?.message || 'Upload failed');
                                            setReceiptFile(null);
                                            setReceiptPreview(null);
                                        }
                                    } catch (err: any) {
                                        toast.error(err.response?.data?.message || 'Failed to upload receipt');
                                        setReceiptFile(null);
                                        setReceiptPreview(null);
                                    } finally {
                                        setIsUploadingReceipt(false);
                                        if (receiptInputRef.current) receiptInputRef.current.value = '';
                                    }
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
                                        <img src={receiptPreview} alt="Receipt" style={{ width: '100%', maxHeight: '200px', objectFit: 'contain', background: '#000', borderRadius: '10px', opacity: isUploadingReceipt ? 0.5 : 1 }} />
                                        {isUploadingReceipt && (
                                            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'white', fontWeight: 600, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                                <div className="spinner-ring" style={{ width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                                                Uploading...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <motion.button
                        className={`view-bookings-btn ${isUploadingReceipt ? 'disabled' : ''}`}
                        onClick={() => {
                            if (!isUploadingReceipt) router.push('/bookings');
                        }}
                        disabled={isUploadingReceipt}
                        whileHover={!isUploadingReceipt ? { scale: 1.02 } : {}}
                        whileTap={!isUploadingReceipt ? { scale: 0.98 } : {}}
                        style={{ opacity: isUploadingReceipt ? 0.7 : 1, cursor: isUploadingReceipt ? 'not-allowed' : 'pointer' }}
                    >
                        {isUploadingReceipt ? 'Uploading Receipt...' : 'Done — View My Bookings'}
                    </motion.button>
                </motion.div>
            </motion.div>
        );
    }

    const maxTickets = event.remainingTickets ?? event.totalTickets ?? 0;
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
                                        {event.startTime && <span><FiClock /> {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</span>}
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
                                    <SeatSelector eventId={event._id} onSeatsSelected={handleSeatsSelected} maxSeats={10} highlightedSeats={existingSeats} initialSeatsData={initialSeatsData} />
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
                                             {holdExpiresAt && holdCountdown > 0 && (
                                                <div style={{
                                                    marginLeft: 'auto',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '12px'
                                                }}>
                                                    <motion.button
                                                        className="cancel-hold-btn"
                                                        onClick={() => setIsCancelModalOpen(true)}
                                                        whileHover={{ scale: 1.05 }}
                                                        whileTap={{ scale: 0.95 }}
                                                        style={{
                                                            background: 'rgba(239, 68, 68, 0.1)',
                                                            color: '#ef4444',
                                                            border: '1px solid rgba(239, 68, 68, 0.3)',
                                                            padding: '6px 12px',
                                                            borderRadius: '8px',
                                                            fontSize: '0.85rem',
                                                            fontWeight: 600,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '6px'
                                                        }}
                                                    >
                                                        <FiTrash2 size={14} /> Cancel
                                                    </motion.button>

                                                    <div style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '8px 16px',
                                                        borderRadius: '12px',
                                                        background: holdCountdown <= 60
                                                            ? 'rgba(239, 68, 68, 0.15)'
                                                            : 'rgba(139, 92, 246, 0.12)',
                                                        border: `1px solid ${holdCountdown <= 60
                                                            ? 'rgba(239, 68, 68, 0.4)'
                                                            : 'rgba(139, 92, 246, 0.3)'}`,
                                                        color: holdCountdown <= 60 ? '#ef4444' : '#a78bfa',
                                                        fontWeight: 600,
                                                        fontSize: '0.95rem',
                                                        fontVariantNumeric: 'tabular-nums',
                                                        animation: holdCountdown <= 30 ? 'pulse 1s infinite' : undefined,
                                                    }}>
                                                        <FiClock size={16} />
                                                        {Math.floor(holdCountdown / 60)}:{String(holdCountdown % 60).padStart(2, '0')}
                                                    </div>
                                                </div>
                                            )}
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
                                            {seat.seatLabel || `${seat.row}${seat.seatNumber}`}
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
                                    disabled={selectedSeats.length === 0 || isLoading}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {isLoading ? (
                                        <><span className="btn-spinner"></span>Reserving seats...</>
                                    ) : (
                                        <>
                                            <FiArrowRight />
                                            {selectedSeats.length > 0
                                                ? `Next — ${selectedSeats.length} Seat${selectedSeats.length !== 1 ? 's' : ''} — ${seatTotalPrice.toFixed(2)} EGP`
                                                : 'Select Seats to Continue'
                                            }
                                        </>
                                    )}
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
                                            {event.startTime && <span><FiClock /> {event.startTime} {event.endTime ? `- ${event.endTime}` : ''}</span>}
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

                <CancelSeatsModal
                    isOpen={isCancelModalOpen}
                    onClose={() => setIsCancelModalOpen(false)}
                    onConfirm={handleCancelSeatsConfirm}
                    seats={selectedSeats}
                    isLoading={isLoading}
                    bookingType="pending"
                />
            </motion.div>
        </ProtectedRoute>
    );
};

export default BookTicketPage;
