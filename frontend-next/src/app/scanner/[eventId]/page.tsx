"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/services/api';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import {
    FiArrowLeft, FiCamera, FiCheckCircle, FiXCircle,
    FiUser, FiPhone, FiMail, FiGrid, FiAlertTriangle,
    FiRefreshCw
} from 'react-icons/fi';
import { toast } from 'react-toastify';
import '../scanner.css';

interface ScanResult {
    ticket: any;
    userEmail: string;
    userPhone: string;
    userName: string;
    seatRow: string;
    seatNumber: number;
    section: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
    attendeePhone: string;
    seatLabel?: string;
    isFree: boolean;
    message: string;
    eventId: string;
    eventTitle: string;
    eventDate: string;
    eventLocation: string;
    startTime: string;
    endTime: string;
}

interface ScanStats {
    total: number;
    scanned: number;
    remaining: number;
    percentage: number;
}

const ScannerEventPage = () => {
    const params = useParams();
    const eventId = params.eventId as string;
    const router = useRouter();
    const [isScanning, setIsScanning] = useState(false);
    const [scanResult, setScanResult] = useState<ScanResult | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [stats, setStats] = useState<ScanStats | null>(null);
    const [eventTitle, setEventTitle] = useState('');
    const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
    const scannerRef = useRef<any>(null);
    const scannerContainerRef = useRef<HTMLDivElement>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        fetchStats();
        fetchEventInfo();
    }, [eventId]);

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
        } catch (err) {
            console.error('Error fetching event:', err);
        }
    };

    const startScanner = async () => {
        setScanResult(null);
        setScanError(null);
        setIsScanning(true);

        try {
            const { Html5Qrcode } = await import('html5-qrcode');
            await new Promise(resolve => setTimeout(resolve, 100));

            const scannerId = 'scanner-qr-element';
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
                    qrbox: (viewfinderWidth, viewfinderHeight) => {
                        const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
                        const qrboxSize = Math.floor(minEdgeSize * 0.7);
                        return { width: qrboxSize, height: qrboxSize };
                    },
                },
                async (decodedText) => {
                    if (isProcessingRef.current) return;
                    isProcessingRef.current = true;
                    stopScanner();
                    await handleScan(decodedText);
                },
                () => { },
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
            setScanHistory(prev => [result, ...prev.slice(0, 19)]);
            fetchStats();

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
        <ProtectedRoute requiredRole="Scanner">
            <div className="scanner-dashboard">
                <div className="scanner-dash-bg"></div>

                <div className="scanner-dash-container">
                    {/* Header */}
                    <div className="scanner-dash-header" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                        <div className="scanner-dash-header-left" style={{ width: '100%', marginBottom: '15px' }}>
                            <button
                                className="scanner-logout-btn"
                                onClick={() => router.push('/scanner')}
                                style={{ padding: '8px 12px' }}
                            >
                                <FiArrowLeft size={16} /> Back
                            </button>
                            <div style={{ marginLeft: '10px' }}>
                                <h1 style={{ fontSize: '1.2rem', marginBottom: '4px' }}>📷 QR Code Scanner</h1>
                                <p style={{ fontSize: '0.9rem', color: '#94a3b8', margin: 0 }}>{eventTitle}</p>
                            </div>
                        </div>

                        {stats && (
                            <div className="scanner-dash-header-left" style={{ width: '100%', justifyContent: 'space-between', background: 'rgba(0,0,0,0.2)', padding: '10px', borderRadius: '10px' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', color: '#f8fafc' }}>{stats.total}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Total</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', color: '#10b981' }}>{stats.scanned}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Scanned</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.remaining}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Remaining</span>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <span style={{ display: 'block', fontSize: '1.1rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.percentage}%</span>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Progress</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="scanner-body">
                        <div className="scanner-area">
                            {!isScanning && !scanResult && !scanError && (
                                <button
                                    className="start-scan-btn"
                                    onClick={startScanner}
                                >
                                    <FiCamera size={48} />
                                    <span>Tap to Open Camera</span>
                                    <small>Point the camera at a ticket QR code</small>
                                </button>
                            )}

                            {isScanning && (
                                <div className="scanner-active">
                                    <div id="scanner-qr-element" ref={scannerContainerRef}></div>
                                    <button
                                        className="stop-scan-btn"
                                        onClick={stopScanner}
                                    >
                                        Stop Scanning
                                    </button>
                                </div>
                            )}

                            {scanError && !scanResult && (
                                <div className="scan-error">
                                    <FiAlertTriangle size={48} />
                                    <h3>Scan Error</h3>
                                    <p>{scanError}</p>
                                    <button
                                        className="retry-scan-btn"
                                        onClick={() => { resetScan(); startScanner(); }}
                                    >
                                        <FiRefreshCw /> Try Again
                                    </button>
                                </div>
                            )}

                            {scanResult && (
                                <div className={`scan-result ${scanResult.isFree ? 'valid' : 'invalid'}`}>
                                    <div className="result-icon">
                                        {scanResult.isFree ? (
                                            <FiCheckCircle size={64} className="icon-valid" />
                                        ) : (
                                            <FiXCircle size={64} className="icon-invalid" />
                                        )}
                                    </div>

                                    <p className="result-message">{scanResult.message}</p>

                                    <div className="result-details">
                                        <div className="result-section">
                                            <h4><FiGrid size={16} /> Event Details</h4>
                                            <div className="result-grid">
                                                <div className="result-field" style={{ gridColumn: '1 / -1' }}>
                                                    <span className="field-label">Title</span>
                                                    <span className="field-value" style={{ fontWeight: 'bold' }}>{scanResult.eventTitle || eventTitle}</span>
                                                </div>
                                                {scanResult.eventLocation && (
                                                    <div className="result-field">
                                                        <span className="field-label">Location</span>
                                                        <span className="field-value">{scanResult.eventLocation}</span>
                                                    </div>
                                                )}
                                                {scanResult.eventDate && (
                                                    <div className="result-field">
                                                        <span className="field-label">Date</span>
                                                        <span className="field-value">{new Date(scanResult.eventDate).toLocaleDateString('en-US', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                )}
                                                {scanResult.startTime && (
                                                    <div className="result-field" style={{ gridColumn: '1 / -1' }}>
                                                        <span className="field-label">Time</span>
                                                        <span className="field-value">{scanResult.startTime} {scanResult.endTime ? `- ${scanResult.endTime}` : ''}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

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
                                                    <span className="field-label">Status</span>
                                                    <span className={`field-value status-value ${scanResult.isFree ? 'free' : 'not-free'}`}>
                                                        {scanResult.isFree ? '✅ First Scan' : '❌ Already Scanned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {(scanResult.attendeeFirstName || scanResult.attendeeLastName || scanResult.attendeePhone) && (
                                            <div className="result-section">
                                                <h4><FiUser size={16} /> Attendee</h4>
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

                                    <button
                                        className="scan-next-btn"
                                        onClick={() => { resetScan(); startScanner(); }}
                                    >
                                        <FiCamera /> Scan Next Ticket
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Scan History */}
                        {scanHistory.length > 0 && (
                            <div className="scan-history">
                                <h3>Recent Scans</h3>
                                <div className="history-list">
                                    {scanHistory.map((item, index) => (
                                        <div key={index} className={`history-item ${item.isFree ? 'valid' : 'invalid'}`}>
                                            <span className="history-seat">{item.seatLabel || `${item.seatRow}${item.seatNumber}`}</span>
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
                </div>
            </div>
        </ProtectedRoute>
    );
};

export default ScannerEventPage;
