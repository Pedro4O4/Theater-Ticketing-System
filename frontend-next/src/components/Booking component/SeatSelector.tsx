"use client";
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/services/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiUsers, FiDollarSign, FiCheck, FiX, FiAlertCircle,
    FiChevronUp, FiLoader, FiChevronsUp, FiChevronsDown,
    FiMinus, FiPlus
} from 'react-icons/fi';
import { Theater } from '@/types/theater';
import { Seat, SeatPricing } from '@/types/booking';
import './SeatSelector.css';

// Match TheaterDesigner colors for consistency
const SEAT_TYPE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
    standard: { bg: '#6B7280', border: '#94A3B8', label: 'Standard' },
    vip: { bg: '#F59E0B', border: '#FCD34D', label: 'VIP' },
    premium: { bg: '#6366F1', border: '#A5B4FC', label: 'Premium' },
    wheelchair: { bg: '#0EA5E9', border: '#7DD3FC', label: 'Wheelchair' }
};

interface SeatSelectorProps {
    eventId: string;
    onSeatsSelected?: (seats: Seat[], totalPrice: number) => void;
    maxSeats?: number;
    readOnly?: boolean;
    highlightedSeats?: { row: string; seatNumber: number; section: string }[];
    initialSeatsData?: any;
}

const SeatSelector: React.FC<SeatSelectorProps> = ({
    eventId,
    onSeatsSelected,
    maxSeats = 10,
    readOnly = false,
    highlightedSeats = [],
    initialSeatsData
}) => {
    const [loading, setLoading] = useState(!initialSeatsData);
    const [error, setError] = useState<string | null>(null);
    const [theaterData, setTheaterData] = useState<Theater | null>(initialSeatsData?.theater || null);
    const [seats, setSeats] = useState<Seat[]>(initialSeatsData?.seats || []);
    const [seatPricing, setSeatPricing] = useState<SeatPricing[]>(initialSeatsData?.seatPricing || []);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
    const [scale, setScale] = useState(1);
    const [activeSection, setActiveSection] = useState<'main' | 'balcony'>('main');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Fetch seat availability
    useEffect(() => {
        if (initialSeatsData) return;

        const fetchSeats = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await api.get<any>(`/booking/event/${eventId}/seats`);

                if (response.data.success) {
                    const data = response.data.data;
                    setTheaterData(data.theater);
                    setSeats(data.seats);
                    setSeatPricing(data.seatPricing);

                    // DEBUG: Log booked seats
                    const bookedSeats = data.seats.filter((s: any) => s.isBooked);
                    console.log('[SeatSelector] Total seats:', data.seats.length);
                    console.log('[SeatSelector] Booked seats:', bookedSeats.length, bookedSeats.map((s: any) => `${s.section}-${s.row}-${s.seatNumber}`));
                }
            } catch (err: any) {
                console.error('Error fetching seats:', err);
                setError(err.response?.data?.message || 'Failed to load seats');
            } finally {
                setLoading(false);
            }
        };
        fetchSeats();
    }, [eventId]);

    // Group seats by SECTION and ROW for easy lookup
    const seatMap = useMemo(() => {
        const map = new Map<string, Seat>();
        seats.forEach(seat => {
            const key = `${seat.section}-${seat.row}-${seat.seatNumber}`;
            map.set(key, seat);
        });
        return map;
    }, [seats]);

    // Helpers
    const getHCorridorCount = useCallback((section: string, rowIndex: number) => {
        return theaterData?.layout?.hCorridors?.[`${section}-h-${rowIndex}`] || 0;
    }, [theaterData]);

    const getVCorridorCount = useCallback((section: string, colIndex: number) => {
        return theaterData?.layout?.vCorridors?.[`${section}-v-${colIndex}`] || 0;
    }, [theaterData]);

    const generateRowLabels = useCallback((count: number, prefix: string = '') => {
        return Array.from({ length: count }, (_, i) =>
            prefix + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
        );
    }, []);

    const getOrderedRowLabels = useCallback((section: 'main' | 'balcony') => {
        if (!theaterData) return [];
        const floor = section === 'balcony' ? theaterData.layout.balcony : theaterData.layout.mainFloor;
        if (!floor) return [];

        const prefix = section === 'balcony' ? 'BALC-' : '';
        const labels = generateRowLabels(floor.rows, prefix);
        const stagePos = theaterData.layout.stage?.position || 'top';

        return stagePos === 'bottom' ? [...labels].reverse() : labels;
    }, [theaterData, generateRowLabels]);

    // Handle seat click
    const handleSeatClick = useCallback((seat: Seat) => {
        if (readOnly || seat.isBooked || seat.isPending || !seat.isActive) return;

        setSelectedSeats(prev => {
            const isSelected = prev.some(
                s => s.row === seat.row &&
                    s.seatNumber === seat.seatNumber &&
                    s.section === seat.section
            );

            if (isSelected) {
                return prev.filter(
                    s => !(s.row === seat.row &&
                        s.seatNumber === seat.seatNumber &&
                        s.section === seat.section)
                );
            }
            if (prev.length >= maxSeats) return prev;
            return [...prev, seat];
        });
    }, [maxSeats]);

    // Calculate total price
    const totalPrice = useMemo(() => {
        return selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0);
    }, [selectedSeats]);

    // Notify parent
    useEffect(() => {
        onSeatsSelected?.(selectedSeats, totalPrice);
    }, [selectedSeats, totalPrice, onSeatsSelected]);

    const clearSelection = () => setSelectedSeats([]);

    // Auto-scale logic - Ref-based measurement matching TheaterDesigner approach
    const canvasRef = React.useRef<HTMLDivElement>(null);
    const hasInitialScale = React.useRef(false);

    useEffect(() => {
        if (!theaterData) return;

        const calculateScale = () => {
            if (!canvasRef.current) return;
            const container = canvasRef.current.parentElement;
            if (!container) return;

            // Temporarily reset scale AND make canvas absolute so it doesn't inflate parent width
            const originalTransform = canvasRef.current.style.transform;
            const originalPosition = canvasRef.current.style.position;
            canvasRef.current.style.transform = 'scale(1)';
            canvasRef.current.style.position = 'absolute';
            const canvasWidth = canvasRef.current.scrollWidth || canvasRef.current.offsetWidth;
            const canvasHeight = canvasRef.current.scrollHeight || canvasRef.current.offsetHeight;
            canvasRef.current.style.transform = originalTransform;
            canvasRef.current.style.position = originalPosition;

            if (canvasWidth === 0) return;

            // On mobile, always use viewport width to avoid inflated measurements
            const isMobile = window.innerWidth <= 768;
            const availableWidth = isMobile ? window.innerWidth : Math.min(container.clientWidth, window.innerWidth);

            // Final scale: allow as low as 0.3 for very zoomed-out views,
            // cap at 1.0 — never upscale beyond natural size
            let calculatedScale = availableWidth / canvasWidth;
            calculatedScale = Math.max(0.3, Math.min(1, calculatedScale));

            setScale(calculatedScale);

            // Adjust container height to match the scaled canvas so nothing is clipped
            container.style.height = `${Math.ceil(canvasHeight * calculatedScale) + 40}px`;
        };

        // Delay initial calculation to ensure content has rendered
        const timer = setTimeout(calculateScale, hasInitialScale.current ? 0 : 200);
        hasInitialScale.current = true;
        window.addEventListener('resize', calculateScale);
        // Mobile zoom changes fire on visualViewport, not window resize
        window.visualViewport?.addEventListener('resize', calculateScale);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateScale);
            window.visualViewport?.removeEventListener('resize', calculateScale);
        };
    }, [theaterData]);

    // Render single seat
    const renderSeatSlot = (section: string, rowLabel: string, seatNum: number) => {
        const seatKey = `${section}-${rowLabel}-${seatNum}`;
        const seat = seatMap.get(seatKey);

        const vCount = getVCorridorCount(section, seatNum);
        const vCorridorSpaces = Array.from({ length: vCount }).map((_, i) => (
            <div key={`vcor-${seatKey}-${i}`} className="v-corridor-space" />
        ));

        if (!seat) {
            const isDisabled = theaterData?.layout.disabledSeats?.includes(seatKey);
            return (
                <React.Fragment key={seatKey}>
                    <div className={`seat-slot ${isDisabled ? 'disabled' : 'empty'}`}>
                        {isDisabled && <FiX />}
                    </div>
                    {vCorridorSpaces}
                </React.Fragment>
            );
        }

        const isSelected = selectedSeats.some(
            s => s.row === seat.row &&
                s.seatNumber === seat.seatNumber &&
                s.section === seat.section
        );

        const isHighlighted = highlightedSeats.some(
            s => s.row === seat.row &&
                s.seatNumber === seat.seatNumber &&
                s.section === seat.section
        );

        const typeColors = SEAT_TYPE_COLORS[seat.seatType] || SEAT_TYPE_COLORS.standard;
        // isPending takes priority over isBooked (backend marks pending seats as booked too)
        const isPending = seat.isPending && !isHighlighted;
        const isConfirmedBooked = seat.isBooked && !seat.isPending && !isHighlighted;

        // Force inline styles for booked/pending seats to ensure visibility
        const bookedStyles = isConfirmedBooked ? {
            background: '#1a1a1a',
            borderColor: '#ef4444',
            opacity: 0.7,
            cursor: 'not-allowed',
            pointerEvents: 'none' as const,
        } : isPending ? {
            background: '#78650d',
            borderColor: '#fbbf24',
            opacity: 0.9,
            cursor: 'not-allowed',
            pointerEvents: 'none' as const,
        } : {};

        const isSeatDisabled = isConfirmedBooked || isPending || !seat.isActive || readOnly || isHighlighted;

        return (
            <React.Fragment key={seatKey}>
                <button
                    className={`seat-btn ${seat.seatType} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${isConfirmedBooked ? 'booked' : ''} ${isPending ? 'pending' : ''} ${!seat.isActive ? 'disabled' : ''}`}
                    style={{
                        '--seat-bg': typeColors.bg,
                        '--seat-border': typeColors.border,
                        ...bookedStyles
                    } as any}
                    onClick={() => handleSeatClick(seat)}
                    onMouseEnter={() => !readOnly && setHoveredSeat(seat)}
                    onMouseLeave={() => setHoveredSeat(null)}
                    disabled={isSeatDisabled}
                >
                    {(isSelected || isHighlighted) ? (
                        <FiCheck className="check-icon" />
                    ) : isConfirmedBooked ? (
                        <FiX style={{ color: '#ef4444', fontSize: '1rem' }} />
                    ) : isPending ? (
                        <FiLoader style={{ color: '#fbbf24', fontSize: '0.85rem' }} />
                    ) : (
                        <span className="seat-num">{seat.seatNumber}</span>
                    )}
                </button>
                {vCorridorSpaces}
            </React.Fragment>
        );
    };

    const renderHCorridorGap = (section: string, rowIndex: number) => {
        const count = getHCorridorCount(section, rowIndex);
        return Array.from({ length: count }).map((_, i) => (
            <div key={`hgor-${section}-${rowIndex}-${i}`} className="h-corridor-space">
                <span className="corridor-label">CORRIDOR</span>
            </div>
        ));
    };

    const renderRow = (section: 'main' | 'balcony', rowLabel: string, rowIndex: number) => {
        const floor = section === 'balcony' ? theaterData?.layout.balcony : theaterData?.layout.mainFloor;
        const seatsPerRow = floor?.seatsPerRow || 0;
        const slots = [];

        // Pre-row corridor
        const preVCount = getVCorridorCount(section, 0);
        const preVSpaces = Array.from({ length: preVCount }).map((_, i) => (
            <div key={`vcor-${section}-${rowLabel}-pre-${i}`} className="v-corridor-space" />
        ));
        slots.push(<React.Fragment key="pre">{preVSpaces}</React.Fragment>);

        for (let s = 1; s <= seatsPerRow; s++) {
            slots.push(renderSeatSlot(section, rowLabel, s));
        }

        return (
            <React.Fragment key={`${section}-${rowLabel}`}>
                <div className="seat-row">
                    <div className="row-label">{rowLabel}</div>
                    <div className="seats-container">
                        {slots}
                    </div>
                    <div className="row-label">{rowLabel}</div>
                </div>
                {renderHCorridorGap(section, rowIndex)}
            </React.Fragment>
        );
    };

    const renderSection = (sectionName: 'main' | 'balcony') => {
        if (!theaterData) return null;
        const rows = getOrderedRowLabels(sectionName);
        if (rows.length === 0) return null;

        return (
            <div key={sectionName} className={`section ${sectionName}-section`}>
                <div className="seats-grid">
                    {renderHCorridorGap(sectionName, -1)}
                    {rows.map((row, idx) => renderRow(sectionName, row, idx))}
                </div>
            </div>
        );
    };

    if (loading) return <div className="seat-selector loading"><FiLoader className="spinner" /><p>Loading seat map...</p></div>;
    if (error) return <div className="seat-selector error"><FiAlertCircle /><p>{error}</p><button onClick={() => window.location.reload()}>Retry</button></div>;

    return (
        <div className="seat-selector" dir="ltr">
            {/* Section Switcher - only show if theater has balcony */}
            {theaterData?.layout.hasBalcony && (
                <div className="section-switcher">
                    <button
                        className={`section-btn ${activeSection === 'main' ? 'active' : ''}`}
                        onClick={() => setActiveSection('main')}
                    >
                        🎭 Main Floor
                    </button>
                    <button
                        className={`section-btn ${activeSection === 'balcony' ? 'active' : ''}`}
                        onClick={() => setActiveSection('balcony')}
                    >
                        🏛️ Balcony
                    </button>
                </div>
            )}

            {/* Legend - between buttons and theater */}
            <div className="seat-legend">
                {Object.entries(SEAT_TYPE_COLORS).map(([type, colors]) => {
                    const pricing = seatPricing.find(p => p.seatType === type);
                    return (
                        <div key={type} className="legend-item">
                            <div className="legend-color" style={{ background: colors.bg }} />
                            <span>{colors.label}</span>
                            {pricing && <span className="legend-price">{pricing.price} EGP</span>}
                        </div>
                    );
                })}
                <div className="legend-item">
                    <div className="legend-color booked" style={{ background: '#1a1a1a', borderColor: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#ef4444', fontSize: '10px', fontWeight: 'bold' }}>X</span>
                    </div>
                    <span>Booked</span>
                </div>
                <div className="legend-item">
                    <div className="legend-color" style={{ background: '#78650d', borderColor: '#fbbf24', border: '2px solid #fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiLoader style={{ color: '#fbbf24', fontSize: '9px' }} />
                    </div>
                    <span>Pending</span>
                </div>
                {highlightedSeats.length > 0 && (
                    <div className="legend-item">
                        <div className="legend-color highlighted" />
                        <span>Your Seats</span>
                    </div>
                )}
                {!readOnly && (
                    <div className="legend-item">
                        <div className="legend-color selected-legend" />
                        <span>Selected</span>
                    </div>
                )}
            </div>

            <div className="theater-frame">
                <div className="theater-canvas-container" ref={containerRef}>
                    <div className="theater-canvas" ref={canvasRef} style={{
                        transform: `scale(${scale})`,
                        transformOrigin: scale < 1 ? 'top left' : 'top center'
                    }}>
                        {/* Stage at top */}
                        {(theaterData?.layout.stage?.position || 'top') === 'top' && (
                            <motion.div
                                className="stage stage-top"
                                style={{ width: `${theaterData?.layout.stage?.width || 60}%` }}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <FiChevronsUp className="stage-icon" />
                                <span>STAGE</span>
                            </motion.div>
                        )}

                        {/* Render only the active section */}
                        {activeSection === 'main' && renderSection('main')}
                        {activeSection === 'balcony' && theaterData?.layout.hasBalcony && renderSection('balcony')}

                        {/* Stage at bottom */}
                        {theaterData?.layout.stage?.position === 'bottom' && (
                            <motion.div
                                className="stage stage-bottom"
                                style={{ width: `${theaterData?.layout.stage?.width || 60}%` }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span>STAGE</span>
                                <FiChevronsDown className="stage-icon" />
                            </motion.div>
                        )}

                        {/* Labels Overlay */}
                        <div className="labels-overlay">
                            {theaterData?.layout.labels?.filter((label: any) => (label.section || 'main') === activeSection).map((label: any) => {
                                const isEntry = label.text?.toUpperCase().includes('ENTRY');
                                const isExit = label.text?.toUpperCase().includes('EXIT');

                                const style: React.CSSProperties = {
                                    width: label.width || 'auto',
                                    height: label.height || 'auto'
                                };

                                if (label.isPixelBased) {
                                    // Pixel-based: x is offset from center, y is from top
                                    style.left = `calc(50% + ${label.position?.x || 0}px)`;
                                    style.top = `${label.position?.y || 0}px`;
                                } else {
                                    // Legacy percentage-based positioning
                                    style.left = `${label.position?.x || 0}%`;
                                    style.top = `${label.position?.y || 0}%`;
                                }

                                return (
                                    <motion.div
                                        key={label.id}
                                        className={`theater-label ${isEntry ? 'label-entry' : ''} ${isExit ? 'label-exit' : ''}`}
                                        style={{
                                            ...style,
                                            minWidth: label.width ? undefined : 'auto'
                                        }}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                    >
                                        {label.icon && <span className="label-icon">{label.icon}</span>}
                                        <span className="label-text">{label.text}</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>



        </div>
    );
};

export default SeatSelector;

