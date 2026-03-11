"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiDownload, FiCheckCircle,
    FiAlertCircle, FiUser, FiPhone, FiGrid, FiExternalLink
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
    attendeeFirstName?: string;
    attendeeLastName?: string;
    attendeePhone: string;
    seatLabel?: string;
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
    const [payerEmail, setPayerEmail] = useState('');
    const [payerName, setPayerName] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [cancellationDeadline, setCancellationDeadline] = useState('');

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
                    setStartTime(data[0].eventId.startTime || '');
                    setEndTime(data[0].eventId.endTime || '');
                    setCancellationDeadline(data[0].eventId.cancellationDeadline || '');
                }
                if (data.length > 0 && data[0].userId) {
                    setPayerEmail(data[0].userId.email || '');
                    setPayerName(data[0].userId.name || '');
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

    /** Shared helper – draws a ticket onto a canvas and returns its data URL. */
    const buildTicketDataUrl = async (ticket: Ticket): Promise<string> => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        const width = 600;
        const height = 960;
        canvas.width = width;
        canvas.height = height;

        // Background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);

        // Header bar
        ctx.fillStyle = '#6c3ce0';
        ctx.fillRect(0, 0, width, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🎫  EVENT TICKET', width / 2, 52);

        // Dashed separator
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(30, 90);
        ctx.lineTo(width - 30, 90);
        ctx.stroke();
        ctx.setLineDash([]);

        // Event title (word-wrapped)
        let y = 130;
        ctx.fillStyle = '#1f2937';
        ctx.font = 'bold 24px Arial, sans-serif';
        ctx.textAlign = 'center';
        const titleText = eventTitle || 'Event';
        const maxTitleWidth = width - 60;
        if (ctx.measureText(titleText).width > maxTitleWidth) {
            const words = titleText.split(' ');
            let line = '';
            for (const word of words) {
                const test = line + (line ? ' ' : '') + word;
                if (ctx.measureText(test).width > maxTitleWidth && line) {
                    ctx.fillText(line, width / 2, y);
                    y += 30;
                    line = word;
                } else {
                    line = test;
                }
            }
            if (line) ctx.fillText(line, width / 2, y);
        } else {
            ctx.fillText(titleText, width / 2, y);
        }

        // Event date & location
        y += 35;
        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = '#6b7280';
        if (eventDate) {
            ctx.fillText(`📅  ${new Date(eventDate).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`, width / 2, y);
            y += 24;
        }
        if (startTime) {
            ctx.fillText(`⏰  ${startTime} ${endTime ? `- ${endTime}` : ''}`, width / 2, y);
            y += 24;
        }
        if (eventLocation) {
            ctx.fillText(`📍  ${eventLocation}`, width / 2, y);
            y += 24;
        }
        if (cancellationDeadline) {
            ctx.fillStyle = '#ef4444'; // red for deadline
            ctx.font = 'bold 15px Arial, sans-serif';
            ctx.fillText(`⚠️ Cancel Before: ${new Date(cancellationDeadline).toLocaleString('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, width / 2, y);
            y += 24;
            ctx.fillStyle = '#6b7280';
        }

        // Separator
        y += 10;
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#d1d5db';
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 25;

        // Seat info grid
        ctx.textAlign = 'left';
        const leftCol = 50;
        const rightCol = width / 2 + 20;
        const drawInfoRow = (label: string, value: string, x: number, yPos: number) => {
            ctx.font = '13px Arial, sans-serif';
            ctx.fillStyle = '#9ca3af';
            ctx.fillText(label, x, yPos);
            ctx.font = 'bold 17px Arial, sans-serif';
            ctx.fillStyle = '#1f2937';
            ctx.fillText(value, x, yPos + 22);
        };

        drawInfoRow('Section', ticket.section, leftCol, y);
        drawInfoRow('Seat Type', ticket.seatType, rightCol, y);
        y += 55;
        drawInfoRow('Row', ticket.seatRow, leftCol, y);
        drawInfoRow('Seat Number', String(ticket.seatNumber), rightCol, y);
        y += 55;
        drawInfoRow('Price', `${ticket.price.toFixed(2)} EGP`, leftCol, y);

        const seatDisplay = ticket.seatLabel || `${ticket.seatRow}${ticket.seatNumber}`;
        // Derive side text from the label if present
        const lowerLabel = seatDisplay.toLowerCase();
        const derivedSide = lowerLabel.includes('left')
            ? 'Left Side'
            : lowerLabel.includes('right')
                ? 'Right Side'
                : '';

        drawInfoRow('Seat', seatDisplay, rightCol, y);
        y += 55;

        if (derivedSide) {
            drawInfoRow('Side', derivedSide, leftCol, y);
            y += 55;
        }

        const attendeeFullName = (ticket.attendeeFirstName || ticket.attendeeLastName)
            ? `${ticket.attendeeFirstName || ''} ${ticket.attendeeLastName || ''}`.trim()
            : '';

        if (attendeeFullName) {
            drawInfoRow('Attendee', attendeeFullName, leftCol, y);
            if (ticket.attendeePhone) drawInfoRow('Phone', ticket.attendeePhone, rightCol, y);
            y += 55;
        }

        if (payerEmail) {
            drawInfoRow('Paid By', payerName || payerEmail, leftCol, y);
            drawInfoRow('Email', payerEmail, rightCol, y);
            y += 55;
        }

        // Separator before QR
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#d1d5db';
        ctx.beginPath();
        ctx.moveTo(30, y);
        ctx.lineTo(width - 30, y);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 20;

        // QR Code
        const qrImg = new Image();
        qrImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => reject(new Error('Failed to load QR image'));
            qrImg.src = ticket.qrCodeImage;
        });
        const qrSize = 200;
        const qrX = (width - qrSize) / 2;
        ctx.drawImage(qrImg, qrX, y, qrSize, qrSize);
        y += qrSize + 15;

        ctx.textAlign = 'center';
        ctx.font = '12px Arial, sans-serif';
        if (ticket.isScanned) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 16px Arial, sans-serif';
            ctx.fillText(`✅ Scanned at: ${ticket.scannedAt ? new Date(ticket.scannedAt).toLocaleString('en-US', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit' }) : 'Entrance'}`, width / 2, y);
            y += 20;
        }
        ctx.fillStyle = '#9ca3af';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillText('Scan this QR code at the entrance', width / 2, y);

        // Footer
        ctx.fillStyle = '#6c3ce0';
        ctx.fillRect(0, height - 40, width, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Theater Ticketing System — Keep this ticket safe', width / 2, height - 15);

        return canvas.toDataURL('image/png');
    };

    const downloadQR = async (ticket: Ticket) => {
        try {
            const dataUrl = await buildTicketDataUrl(ticket);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `ticket-${ticket.seatRow}${ticket.seatNumber}-${ticket.section}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success(`Ticket for seat ${ticket.seatRow}${ticket.seatNumber} downloaded!`);
        } catch (err) {
            console.error('Error generating ticket image:', err);
            toast.error('Failed to generate ticket image');
        }
    };

    const viewTicket = async (ticket: Ticket) => {
        try {
            // Open the window BEFORE any async/await to preserve the user-gesture
            // chain. Mobile browsers (iOS Safari in particular) block window.open()
            // if it is called after an await, even if it originated from a tap.
            const win = window.open('', '_blank');
            if (!win) {
                toast.error('Popup was blocked. Please allow popups for this site and try again.');
                return;
            }

            const dataUrl = await buildTicketDataUrl(ticket);
            const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Ticket — ${ticket.seatRow}${ticket.seatNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0f0f1a; min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 32px 16px; font-family: Arial, sans-serif; }
    .notice { background: linear-gradient(135deg, #6c3ce0, #a855f7); color: #fff; border-radius: 14px; padding: 18px 28px; max-width: 620px; width: 100%; margin-bottom: 24px; text-align: center; box-shadow: 0 4px 24px rgba(108,60,224,0.4); }
    .notice h2 { font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.02em; }
    .notice p { font-size: 0.9rem; opacity: 0.88; line-height: 1.5; }
    img { max-width: 620px; width: 100%; border-radius: 14px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
  </style>
</head>
<body>
  <div class="notice">
    <h2>📸 Save your QR code before arriving</h2>
    <p>Take a screenshot of this ticket and keep it accessible on your device — our staff will scan your QR code at the theater entrance to verify your seat.</p>
  </div>
  <img src="${dataUrl}" alt="Ticket ${ticket.seatRow}${ticket.seatNumber}" />
</body>
</html>`;
            // Write the generated HTML into the window we already opened above.
            win.document.open();
            win.document.write(html);
            win.document.close();
        } catch (err) {
            console.error('Error generating ticket view:', err);
            toast.error('Failed to open ticket view');
        }
    };

    const downloadAll = async () => {
        for (let i = 0; i < tickets.length; i++) {
            await downloadQR(tickets[i]);
            // Small delay between downloads to avoid browser blocking
            if (i < tickets.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 400));
            }
        }
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
                            <div className="tickets-meta" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
                                {eventLocation && <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>📍 {eventLocation}</span>}
                                {eventDate && <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>📅 {new Date(eventDate).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo' })}</span>}
                                {startTime && <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>⏰ {startTime} {endTime ? `- ${endTime}` : ''}</span>}
                                {cancellationDeadline && <span style={{ padding: '4px 8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', color: '#ef4444', fontWeight: 600 }}>⚠️ Cancel Before: {new Date(cancellationDeadline).toLocaleString('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>}
                                <span style={{ padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}><FiGrid size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} /> {tickets.length} ticket{tickets.length > 1 ? 's' : ''}</span>
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
                                            <span className="seat-label">
                                                {ticket.seatLabel || `${ticket.seatRow}${ticket.seatNumber}`}
                                            </span>
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
                                                <span className="detail-value">{ticket.price} EGP</span>
                                            </div>
                                            {(ticket.attendeeFirstName || ticket.attendeeLastName) && (
                                                <div className="ticket-detail-row">
                                                    <span className="detail-label"><FiUser size={12} /> Attendee</span>
                                                    <span className="detail-value">{ticket.attendeeFirstName} {ticket.attendeeLastName}</span>
                                                </div>
                                            )}
                                            {ticket.attendeePhone && (
                                                <div className="ticket-detail-row">
                                                    <span className="detail-label"><FiPhone size={12} /> Phone</span>
                                                    <span className="detail-value">{ticket.attendeePhone}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Ticket Actions */}
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                            <motion.button
                                                className="ticket-download-btn"
                                                onClick={() => viewTicket(ticket)}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{ flex: 1 }}
                                            >
                                                <FiExternalLink /> View
                                            </motion.button>
                                            <motion.button
                                                className="ticket-download-btn"
                                                onClick={() => downloadQR(ticket)}
                                                whileHover={{ scale: 1.03 }}
                                                whileTap={{ scale: 0.97 }}
                                                style={{ flex: 1 }}
                                            >
                                                <FiDownload /> Download QR
                                            </motion.button>
                                        </div>
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
