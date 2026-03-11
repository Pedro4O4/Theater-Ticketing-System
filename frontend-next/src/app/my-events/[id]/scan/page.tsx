"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiArrowLeft, FiCamera, FiCheckCircle, FiXCircle,
    FiUser, FiPhone, FiMail, FiGrid, FiAlertTriangle,
    FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import './scanner.css';

interface ScanResult {
    ticket: any;
    userEmail: string;
    userPhone: string;
    userName: string;
    seatRow: string;
    seatNumber: number;
    section: string;
    seatType: string;
    seatLabel?: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
    attendeePhone: string;
    isFree: boolean;
    message: string;
    eventTitle?: string;
    eventDate?: string;
    eventLocation?: string;
    startTime?: string;
    endTime?: string;
}

interface ScanStats {
    total: number;
    scanned: number;
    remaining: number;
    percentage: number;
}

const QRScannerPage = () => {
    const params = useParams();
    const eventId = params.id as string;
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [stats, setStats] = useState<ScanStats | null>(null);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventLocation, setEventLocation] = useState('');
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');
    const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
    const scannerRef = useRef<any>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        fetchStats();
        fetchEventInfo();
    }, [eventId]);

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get(`/tickets/event/${eventId}/stats`);
            setStats(res.data);
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchEventInfo = async () => {
        try {
            const res = await api.get(`/event/${eventId}`);
            const data = res.data.success ? res.data.data : res.data;
            setEventTitle(data.title || '');
            setEventDate(data.date || '');
            setEventLocation(data.location || '');
            setStartTime(data.startTime || '');
            setEndTime(data.endTime || '');
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const startScanner = async () => {
        setScanResult(null);
        setScanError(null);
        setIsScanning(true);

        try {
            // Dynamic import to avoid SSR issues
            const { Html5Qrcode } = await import('html5-qrcode');

            // Wait for the DOM element to be available
            await new Promise(resolve => setTimeout(resolve, 100));

            const scannerId = 'qr-scanner-element';
            const element = document.getElementById(scannerId);
            if (!element) {
                throw new Error('Scanner element not found');
            }

            const scanner = new Html5Qrcode(scannerId);
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                async (decodedText) => {
                    // Prevent multiple scans - only process the first one
                    if (isProcessingRef.current) return;
                    isProcessingRef.current = true;

                    // Stop camera immediately to prevent further reads
                    stopScanner();
                    // QR code successfully decoded
                    await handleScan(decodedText);
                },
                (errorMessage) => {
                    // Scan error (ignore - continuous scanning)
                },
            );
        } catch (err: any) {
            console.error('Scanner error:', err);
            setScanError(err?.message || 'Failed to start camera. Please allow camera access.');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        try {
            if (scannerRef.current) {
                const state = scannerRef.current.getState();
                // State 2 = SCANNING
                if (state === 2) {
                    await scannerRef.current.stop();
                }
                scannerRef.current.clear();
                scannerRef.current = null;
            }
        } catch (err) {
            console.error('Error stopping scanner:', err);
        }
        setIsScanning(false);
    };

    const handleScan = async (qrData: string) => {
        try {
            const res = await api.post('/tickets/scan', { qrData, eventId });
            const result: ScanResult = res.data;
            setScanResult(result);
            setScanHistory(prev => [result, ...prev.slice(0, 19)]); // Keep last 20
            fetchStats(); // Refresh stats

            if (result.isFree) {
                toast.success('Valid ticket! Seat is free.');
            } else {
                toast.warning('This ticket was already scanned!');
            }
        } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to verify QR code';
            setScanError(msg);
            toast.error(msg);
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setScanError(null);
        isProcessingRef.current = false;
    };

    return (
        <ProtectedRoute requiredRole="Organizer">
            <div className="scanner-page">
                <div className="scanner-bg-effect"></div>

                <motion.div
                    className="scanner-container"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="scanner-header">
                        <motion.button
                            className="scanner-back-btn"
                            onClick={() => router.push(`/my-events/${eventId}/bookings`)}
                            whileHover={{ x: -3 }}
                        >
                            <FiArrowLeft size={18} /> Back to Bookings
                        </motion.button>

                        <h1>📷 QR Code Scanner</h1>
                        <h2>{eventTitle}</h2>
                        <div className="scanner-stats" style={{ marginTop: '8px' }}>
                            {eventDate && (
                                <div className="stat-item">
                                    <span className="stat-number" style={{ fontSize: '0.9rem' }}>
                                        {new Date(eventDate).toLocaleDateString('en-US', {
                                            timeZone: 'Africa/Cairo',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                        })}
                                    </span>
                                    <span className="stat-label">Date</span>
                                </div>
                            )}
                            {startTime && (
                                <div className="stat-item">
                                    <span className="stat-number" style={{ fontSize: '0.9rem' }}>
                                        {startTime} {endTime ? `- ${endTime}` : ''}
                                    </span>
                                    <span className="stat-label">Time</span>
                                </div>
                            )}
                            {eventLocation && (
                                <div className="stat-item">
                                    <span className="stat-number" style={{ fontSize: '0.9rem' }}>
                                        {eventLocation}
                                    </span>
                                    <span className="stat-label">Location</span>
                                </div>
                            )}
                        </div>

                        {/* Stats Bar */}
                        {stats && (
                            <div className="scanner-stats">
                                <div className="stat-item">
                                    <span className="stat-number">{stats.total}</span>
                                    <span className="stat-label">Total</span>
                                </div>
                                <div className="stat-item scanned">
                                    <span className="stat-number">{stats.scanned}</span>
                                    <span className="stat-label">Scanned</span>
                                </div>
                                <div className="stat-item remaining">
                                    <span className="stat-number">{stats.remaining}</span>
                                    <span className="stat-label">Remaining</span>
                                </div>
                                <div className="stat-item percentage">
                                    <span className="stat-number">{stats.percentage}%</span>
                                    <span className="stat-label">Progress</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="scanner-body">
                        {/* Scanner Area */}
                        <div className="scanner-area">
                            {!isScanning && !scanResult && !scanError && (
                                <motion.button
                                    className="start-scan-btn"
                                    onClick={startScanner}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                >
                                    <FiCamera size={48} />
                                    <span>Tap to Open Camera</span>
                                    <small>Point the camera at a ticket QR code</small>
                                </motion.button>
                            )}

                            {isScanning && (
                                <div className="scanner-active">
                                    <div id="qr-scanner-element" ref={scannerContainerRef}></div>
                                    <motion.button
                                        className="stop-scan-btn"
                                        onClick={stopScanner}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                    >
                                        Stop Scanning
                                    </motion.button>
                                </div>
                            )}

                            {scanError && !scanResult && (
                                <div className="scan-error">
                                    <FiAlertTriangle size={48} />
                                    <h3>Scan Error</h3>
                                    <p>{scanError}</p>
                                    <motion.button
                                        className="retry-scan-btn"
                                        onClick={() => { resetScan(); startScanner(); }}
                                        whileHover={{ scale: 1.03 }}
                                    >
                                        <FiRefreshCw /> Try Again
                                    </motion.button>
                                </div>
                            )}

                            {/* Scan Result */}
                            <AnimatePresence>
                                {scanResult && (
                                    <motion.div
                                        className={`scan-result ${scanResult.isFree ? 'valid' : 'invalid'}`}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9 }}
                                    >
                                        <div className="result-icon">
                                            {scanResult.isFree ? (
                                                <FiCheckCircle size={64} className="icon-valid" />
                                            ) : (
                                                <FiXCircle size={64} className="icon-invalid" />
                                            )}
                                        </div>

                                        <p className="result-message">{scanResult.message}</p>

                                        <div className="result-details">
                                            {/* Seat Info */}
                                            <div className="result-section">
                                                <h4><FiGrid size={16} /> Seat Information</h4>
                                                <div className="result-grid">
                                                    <div className="result-field">
                                                        <span className="field-label">Section</span>
                                                        <span className="field-value">{scanResult.section}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Row</span>
                                                        <span className="field-value">{scanResult.seatRow}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Seat Number</span>
                                                        <span className="field-value">{scanResult.seatNumber}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Seat</span>
                                                        <span className="field-value seat-name">
                                                            {scanResult.seatLabel || `${scanResult.seatRow}${scanResult.seatNumber}`}
                                                        </span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Side</span>
                                                        <span className="field-value">
                                                            {(() => {
                                                                const label = (scanResult.seatLabel || `${scanResult.seatRow}${scanResult.seatNumber}`).toLowerCase();
                                                                if (label.includes('left')) return 'Left Side';
                                                                if (label.includes('right')) return 'Right Side';
                                                                return '—';
                                                            })()}
                                                        </span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Type</span>
                                                        <span className="field-value">{scanResult.seatType}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label">Status</span>
                                                        <span className={`field-value status-value ${scanResult.isFree ? 'free' : 'not-free'}`}>
                                                            {scanResult.isFree ? '✅ Free (First Scan)' : '❌ Already Scanned'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Attendee Info */}
                                            {(scanResult.attendeeFirstName || scanResult.attendeeLastName || scanResult.attendeePhone) && (
                                                <div className="result-section">
                                                    <h4><FiUser size={16} /> Attendee Details</h4>
                                                    <div className="result-grid">
                                                        {(scanResult.attendeeFirstName || scanResult.attendeeLastName) && (
                                                            <div className="result-field">
                                                                <span className="field-label"><FiUser size={12} /> Name</span>
                                                                <span className="field-value">{scanResult.attendeeFirstName} {scanResult.attendeeLastName}</span>
                                                            </div>
                                                        )}
                                                        {scanResult.attendeePhone && (
                                                            <div className="result-field">
                                                                <span className="field-label"><FiPhone size={12} /> Phone</span>
                                                                <span className="field-value">{scanResult.attendeePhone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Payer Info */}
                                            <div className="result-section">
                                                <h4><FiMail size={16} /> Paid By</h4>
                                                <div className="result-grid">
                                                    <div className="result-field">
                                                        <span className="field-label"><FiUser size={12} /> Name</span>
                                                        <span className="field-value">{scanResult.userName}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label"><FiMail size={12} /> Email</span>
                                                        <span className="field-value">{scanResult.userEmail}</span>
                                                    </div>
                                                    <div className="result-field">
                                                        <span className="field-label"><FiPhone size={12} /> Phone</span>
                                                        <span className="field-value">{scanResult.userPhone}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <motion.button
                                            className="scan-next-btn"
                                            onClick={() => { resetScan(); startScanner(); }}
                                            whileHover={{ scale: 1.03 }}
                                            whileTap={{ scale: 0.97 }}
                                        >
                                            <FiCamera /> Scan Next Ticket
                                        </motion.button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Scan History */}
                        {scanHistory.length > 0 && (
                            <div className="scan-history">
                                <h3>Recent Scans</h3>
                                <div className="history-list">
                                    {scanHistory.map((item, index) => (
                                        <div key={index} className={`history-item ${item.isFree ? 'valid' : 'invalid'}`}>
                                            <span className="history-seat">
                                                {item.seatLabel || `${item.seatRow}${item.seatNumber}`}
                                            </span>
                                            <span className="history-section">{item.section}</span>
                                            <span className="history-name">{(item.attendeeFirstName || item.attendeeLastName) ? `${item.attendeeFirstName || ''} ${item.attendeeLastName || ''}`.trim() : item.userName}</span>
                                            <span className={`history-status ${item.isFree ? 'free' : 'not-free'}`}>
                                                {item.isFree ? '✅' : '❌'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </ProtectedRoute>
    );
};

export default QRScannerPage;
