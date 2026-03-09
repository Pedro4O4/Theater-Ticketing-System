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
    seatType: string;
    attendeeName: string;
    attendeePhone: string;
    isFree: boolean;
    message: string;
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
                    qrbox: { width: 250, height: 250 },
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
            <div className="scanner-page">
                <div className="scanner-bg-effect"></div>

                <div className="scanner-container">
                    {/* Header */}
                    <div className="scanner-header">
                        <button
                            className="scanner-back-btn"
                            onClick={() => router.push('/scanner')}
                        >
                            <FiArrowLeft size={18} /> Back to Events
                        </button>

                        <h1>📷 QR Code Scanner</h1>
                        <h2>{eventTitle}</h2>

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
                                                    <span className="field-value seat-name">{scanResult.seatRow}{scanResult.seatNumber}</span>
                                                </div>
                                                <div className="result-field">
                                                    <span className="field-label">Status</span>
                                                    <span className={`field-value status-value ${scanResult.isFree ? 'free' : 'not-free'}`}>
                                                        {scanResult.isFree ? '✅ First Scan' : '❌ Already Scanned'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {(scanResult.attendeeName || scanResult.attendeePhone) && (
                                            <div className="result-section">
                                                <h4><FiUser size={16} /> Attendee</h4>
                                                <div className="result-grid">
                                                    {scanResult.attendeeName && (
                                                        <div className="result-field">
                                                            <span className="field-label"><FiUser size={12} /> Name</span>
                                                            <span className="field-value">{scanResult.attendeeName}</span>
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
                                            <span className="history-seat">{item.seatRow}{item.seatNumber}</span>
                                            <span className="history-section">{item.section}</span>
                                            <span className="history-name">{item.attendeeName || item.userName}</span>
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
