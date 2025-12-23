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
}

const SeatSelector: React.FC<SeatSelectorProps> = ({
    eventId,
    onSeatsSelected,
    maxSeats = 10,
    readOnly = false,
    highlightedSeats = []
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [theaterData, setTheaterData] = useState<Theater | null>(null);
    const [seats, setSeats] = useState<Seat[]>([]);
    const [seatPricing, setSeatPricing] = useState<SeatPricing[]>([]);
    const [selectedSeats, setSelectedSeats] = useState<Seat[]>([]);
    const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
    const [scale, setScale] = useState(1);
    const [activeSection, setActiveSection] = useState<'main' | 'balcony'>('main');
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Fetch seat availability
    useEffect(() => {
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
        if (readOnly || seat.isBooked || !seat.isActive) return;

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
            } else {
                if (prev.length >= maxSeats) return prev;
                return [...prev, seat];
            }
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

    // Auto-scale logic
    useEffect(() => {
        if (!theaterData) return;

        const calculateScale = () => {
            if (containerRef.current && theaterData?.layout) {
                // Account for the padding in .theater-canvas-container
                const containerWidth = containerRef.current.offsetWidth - 80;

                // Estimate theater width based on layout
                const mainFloor = theaterData.layout.mainFloor;
                const seatsPerRow = mainFloor?.seatsPerRow || 12;
                const seatSize = 28; // compact size
                const seatGap = 2;   // tight gap

                // Count vertical corridors
                const vCorridors = theaterData.layout.vCorridors || {};
                let totalCorridorWidth = 0;
                Object.values(vCorridors).forEach((count: any) => {
                    totalCorridorWidth += count * 20; // 20px per corridor segment
                });

                const gridWidth = (seatsPerRow * seatSize) + ((seatsPerRow - 1) * seatGap) + totalCorridorWidth + 100; // row labels + buffer

                // Account for labels that might be outside the grid
                const labels = theaterData.layout.labels || [];
                let maxLabelExtentX = gridWidth / 2;

                labels.forEach((label: any) => {
                    if (label.isPixelBased) {
                        // x is offset from center
                        const labelWidth = typeof label.width === 'number' ? label.width : 100;
                        const extent = Math.abs(label.position?.x || 0) + (labelWidth / 2);
                        maxLabelExtentX = Math.max(maxLabelExtentX, extent);
                    }
                });

                // The theater is centered, so maxLabelExtentX defines the minimum half-width needed
                const totalWidthRequired = (maxLabelExtentX * 2) + 120; // Add some side buffer

                const newScale = Math.min(1.2, containerWidth / totalWidthRequired);
                setScale(newScale);
            }
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
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

        // Force inline styles for booked seats to ensure visibility
        const bookedStyles = (seat.isBooked && !isHighlighted) ? {
            background: '#2d1f1f',
            borderColor: '#6b3a3a',
            opacity: 0.7,
            cursor: 'not-allowed',
            pointerEvents: 'none' as const,
        } : {};

        return (
            <React.Fragment key={seatKey}>
                <motion.button
                    className={`seat-btn ${seat.seatType} ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''} ${seat.isBooked && !isHighlighted ? 'booked' : ''} ${!seat.isActive ? 'disabled' : ''}`}
                    style={{
                        '--seat-bg': typeColors.bg,
                        '--seat-border': typeColors.border,
                        ...bookedStyles
                    } as any}
                    onClick={() => handleSeatClick(seat)}
                    onMouseEnter={() => !readOnly && setHoveredSeat(seat)}
                    onMouseLeave={() => setHoveredSeat(null)}
                    disabled={(seat.isBooked && !isHighlighted) || !seat.isActive || readOnly}
                    whileHover={!seat.isBooked && seat.isActive && !readOnly ? { scale: 1.15 } : {}}
                    whileTap={!seat.isBooked && seat.isActive && !readOnly ? { scale: 0.95 } : {}}
                >
                    {(isSelected || isHighlighted) ? (
                        <FiCheck className="check-icon" />
                    ) : seat.isBooked && !isHighlighted ? (
                        <FiX style={{ color: '#ef4444', fontSize: '1rem' }} />
                    ) : (
                        <span className="seat-num">{seat.seatNumber}</span>
                    )}
                </motion.button>
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
        <div className="seat-selector">
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

            <div className="theater-frame">
                <div className="theater-canvas-container" ref={containerRef}>
                    <div className="theater-canvas" style={{ transform: `scale(${scale})` }}>
                        {/* Stage at top */}
                        {(theaterData?.layout.stage?.position || 'top') === 'top' && (
                            <motion.div
                                className="stage stage-top"
                                style={{ width: `${theaterData?.layout.stage?.width || 60}%` }}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span>STAGE</span>
                                <FiChevronsUp className="stage-icon" />
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

            <div className="seat-legend">
                {Object.entries(SEAT_TYPE_COLORS).map(([type, colors]) => {
                    const pricing = seatPricing.find(p => p.seatType === type);
                    return (
                        <div key={type} className="legend-item">
                            <div className="legend-color" style={{ background: colors.bg }} />
                            <span>{colors.label}</span>
                            {pricing && <span className="legend-price">${pricing.price}</span>}
                        </div>
                    );
                })}
                <div className="legend-item"><div className="legend-color booked" /><span>Booked</span></div>
                <div className="legend-item">
                    <div className={`legend-color ${readOnly ? 'highlighted' : 'selected-legend'}`} />
                    <span>{readOnly ? 'Your Seats' : 'Selected'}</span>
                </div>
            </div>

            <AnimatePresence>
                {hoveredSeat && !hoveredSeat.isBooked && hoveredSeat.isActive && (
                    <motion.div className="seat-tooltip" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <strong>{hoveredSeat.row}{hoveredSeat.seatNumber}</strong>
                        <span className="tooltip-type">{SEAT_TYPE_COLORS[hoveredSeat.seatType]?.label}</span>
                        <span className="tooltip-price">${hoveredSeat.price}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {!readOnly && selectedSeats.length > 0 && (
                    <motion.div className="selection-summary" initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 50 }}>
                        <div className="summary-header">
                            <div className="summary-count"><FiUsers /><span>{selectedSeats.length} seat{selectedSeats.length > 1 ? 's' : ''} selected</span></div>
                            <button className="clear-btn" onClick={clearSelection}>Clear All</button>
                        </div>
                        <div className="selected-seats-list">
                            {selectedSeats.map(seat => (
                                <motion.div key={`${seat.section}-${seat.row}-${seat.seatNumber}`} className="selected-seat-chip" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                                    <span>{seat.row}{seat.seatNumber}</span>
                                    <span className="chip-price">${seat.price}</span>
                                    <button onClick={() => handleSeatClick(seat)} className="remove-seat"><FiX /></button>
                                </motion.div>
                            ))}
                        </div>
                        <div className="summary-total"><FiDollarSign /><span>Total:</span><strong>${totalPrice.toFixed(2)}</strong></div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default SeatSelector;

