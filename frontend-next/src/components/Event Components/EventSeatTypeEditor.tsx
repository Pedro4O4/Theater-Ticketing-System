'use client';

import { useState, useEffect, useCallback, useMemo, MouseEvent, ChangeEvent } from 'react';
import { motion } from 'framer-motion';
import {
    FiGrid, FiMaximize2, FiMinimize2, FiStar, FiDollarSign,
    FiZap, FiCheck, FiChevronsUp, FiChevronsDown, FiInfo
} from 'react-icons/fi';
import api from '@/services/api';
import './EventSeatTypeEditor.css';

interface SeatTypeInfo {
    label: string;
    color: string;
    hoverColor: string;
}

interface SeatAssignment {
    seatType: 'standard' | 'vip' | 'premium';
    price: number;
}

interface SeatPricingItem {
    section: string;
    row: string;
    seatNumber: number;
    seatType: string;
    price: number;
}

interface TypePricing {
    standard: number;
    vip: number;
    premium: number;
}

interface Summary {
    counts: Record<string, number>;
    totalRevenue: Record<string, number>;
}

interface TheaterLayout {
    mainFloor?: {
        rows: number;
        seatsPerRow: number;
        aislePositions?: number[];
    };
    balcony?: {
        rows: number;
        seatsPerRow: number;
        aislePositions?: number[];
    };
    hasBalcony?: boolean;
    stage?: {
        position: 'top' | 'bottom';
    };
}

interface Theater {
    layout?: TheaterLayout;
    seatConfig?: any[];
    removedSeats?: string[];
}

interface EventSeatTypeEditorProps {
    theaterId?: string;
    initialSeatPricing?: SeatPricingItem[];
    onPricingChange?: (data: { seatPricing: SeatPricingItem[]; typePricing: TypePricing; summary: Summary }) => void;
    readOnly?: boolean;
}

const SEAT_TYPES: Record<string, SeatTypeInfo> = {
    standard: { label: 'Standard', color: '#6B7280', hoverColor: '#4B5563' },
    vip: { label: 'VIP', color: '#F59E0B', hoverColor: '#D97706' },
    premium: { label: 'Premium', color: '#8B5CF6', hoverColor: '#7C3AED' }
};

const EventSeatTypeEditor = ({
    theaterId,
    initialSeatPricing = [],
    onPricingChange,
    readOnly = false
}: EventSeatTypeEditorProps) => {
    const [theater, setTheater] = useState<Theater | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const [seatAssignments, setSeatAssignments] = useState<Map<string, SeatAssignment>>(new Map());
    const [typePricing, setTypePricing] = useState<TypePricing>({
        standard: 25,
        vip: 50,
        premium: 75
    });

    const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
    const [currentSeatType, setCurrentSeatType] = useState<'standard' | 'vip' | 'premium'>('vip');
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [showPricing, setShowPricing] = useState<boolean>(true);

    useEffect(() => {
        if (!theaterId) {
            setLoading(false);
            return;
        }

        const fetchTheater = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/theater/${theaterId}`);
                setTheater(response.data.data || response.data);

                if (initialSeatPricing?.length > 0) {
                    const assignmentMap = new Map<string, SeatAssignment>();
                    initialSeatPricing.forEach(sp => {
                        const key = `${sp.section}-${sp.row}-${sp.seatNumber}`;
                        assignmentMap.set(key, {
                            seatType: sp.seatType as 'standard' | 'vip' | 'premium',
                            price: sp.price
                        });
                        if (sp.seatType && sp.price) {
                            setTypePricing(prev => ({
                                ...prev,
                                [sp.seatType]: sp.price
                            }));
                        }
                    });
                    setSeatAssignments(assignmentMap);
                }
            } catch (err: any) {
                console.error('Error fetching theater:', err);
                setError(err.response?.data?.message || err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchTheater();
    }, [theaterId, initialSeatPricing]);

    const generateRowLabels = useCallback((count: number, prefix = ''): string[] => {
        return Array.from({ length: count }, (_, i) =>
            prefix + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
        );
    }, []);

    const mainRowLabels = useMemo(() => {
        if (!theater?.layout?.mainFloor) return [];
        return generateRowLabels(theater.layout.mainFloor.rows);
    }, [theater, generateRowLabels]);

    const balconyRowLabels = useMemo(() => {
        if (!theater?.layout?.balcony) return [];
        return generateRowLabels(theater.layout.balcony.rows, 'BALC-');
    }, [theater, generateRowLabels]);

    const handleSeatClick = useCallback((row: string, seatNum: number, section: string, e: MouseEvent) => {
        if (readOnly) return;

        const seatKey = `${section}-${row}-${seatNum}`;

        if (e.ctrlKey || e.metaKey) {
            setSelectedSeats(prev => {
                const next = new Set(prev);
                if (next.has(seatKey)) {
                    next.delete(seatKey);
                } else {
                    next.add(seatKey);
                }
                return next;
            });
        } else {
            setSelectedSeats(new Set([seatKey]));
        }
    }, [readOnly]);

    const applyTypeToSelected = useCallback(() => {
        const price = typePricing[currentSeatType];

        setSeatAssignments(prev => {
            const next = new Map(prev);
            selectedSeats.forEach(seatKey => {
                next.set(seatKey, { seatType: currentSeatType, price });
            });
            return next;
        });
        setSelectedSeats(new Set());
    }, [selectedSeats, currentSeatType, typePricing]);

    const clearSelectedType = useCallback(() => {
        setSeatAssignments(prev => {
            const next = new Map(prev);
            selectedSeats.forEach(seatKey => {
                next.set(seatKey, { seatType: 'standard', price: typePricing.standard });
            });
            return next;
        });
        setSelectedSeats(new Set());
    }, [selectedSeats, typePricing]);

    const getSeatInfo = useCallback((row: string, seatNum: number, section: string): SeatAssignment => {
        const seatKey = `${section}-${row}-${seatNum}`;
        return seatAssignments.get(seatKey) || { seatType: 'standard', price: typePricing.standard };
    }, [seatAssignments, typePricing]);

    const summary = useMemo((): Summary => {
        const counts: Record<string, number> = { standard: 0, vip: 0, premium: 0 };
        const totalRevenue: Record<string, number> = { standard: 0, vip: 0, premium: 0 };

        seatAssignments.forEach(({ seatType, price }) => {
            counts[seatType] = (counts[seatType] || 0) + 1;
            totalRevenue[seatType] = (totalRevenue[seatType] || 0) + price;
        });

        if (theater?.seatConfig) {
            const configuredCount = theater.seatConfig.length;
            const assignedCount = seatAssignments.size;
            counts.standard += configuredCount - assignedCount;
            totalRevenue.standard += (configuredCount - assignedCount) * typePricing.standard;
        }

        return { counts, totalRevenue };
    }, [seatAssignments, theater, typePricing]);

    useEffect(() => {
        if (!onPricingChange) return;

        const seatPricing: SeatPricingItem[] = Array.from(seatAssignments.entries()).map(([key, info]) => {
            const [section, row, seatNumber] = key.split('-');
            return {
                section,
                row,
                seatNumber: parseInt(seatNumber),
                seatType: info.seatType,
                price: info.price
            };
        });

        onPricingChange({
            seatPricing,
            typePricing,
            summary
        });
    }, [seatAssignments, typePricing, summary, onPricingChange]);

    const renderSeat = (row: string, seatNum: number, section: string, isAisle: boolean, isRemoved: boolean) => {
        const seatKey = `${section}-${row}-${seatNum}`;

        if (isAisle) {
            return <div key={`${seatKey}-aisle`} className="seat-aisle" />;
        }

        if (isRemoved) {
            return <div key={seatKey} className="seat-slot empty" />;
        }

        const { seatType, price } = getSeatInfo(row, seatNum, section);
        const isSelected = selectedSeats.has(seatKey);
        const typeInfo = SEAT_TYPES[seatType];

        return (
            <motion.div
                key={seatKey}
                className={`seat ${seatType} ${isSelected ? 'selected' : ''}`}
                style={{
                    '--seat-color': typeInfo.color,
                    '--seat-hover': typeInfo.hoverColor
                } as React.CSSProperties}
                onClick={(e) => handleSeatClick(row, seatNum, section, e)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                title={`${row}${seatNum} - ${typeInfo.label} (${price} EGP)`}
            >
                <span className="seat-number">{seatNum}</span>
            </motion.div>
        );
    };

    const renderRow = (rowLabel: string, seatsPerRow: number, aislePositions: number[] | undefined, section: string, removedSeats: Set<string> = new Set()) => {
        const seats = [];
        for (let s = 1; s <= seatsPerRow; s++) {
            const seatKey = `${section}-${rowLabel}-${s}`;
            const isAisle = aislePositions?.includes(s) || false;
            const isRemoved = removedSeats.has(seatKey);
            seats.push(renderSeat(rowLabel, s, section, isAisle, isRemoved));
        }

        const isStageTop = theater?.layout?.stage?.position === 'top';
        const leftSideLabel = isStageTop ? `${rowLabel} Left` : `${rowLabel} Right`;
        const rightSideLabel = isStageTop ? `${rowLabel} Right` : `${rowLabel} Left`;

        return (
            <div key={`${section}-${rowLabel}`} className="seat-row">
                <div className="row-label">{leftSideLabel}</div>
                <div className="seats-container">{seats}</div>
                <div className="row-label">{rightSideLabel}</div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="seat-editor loading">
                <div className="spinner">⏳</div>
                <p>Loading theater layout...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="seat-editor error">
                <FiInfo size={40} />
                <p>Error: {error}</p>
            </div>
        );
    }

    if (!theater) {
        return (
            <div className="seat-editor empty">
                <FiGrid size={40} />
                <p>Select a theater to configure seat pricing</p>
            </div>
        );
    }

    const removedSeatsSet = new Set(theater.removedSeats || []);

    return (
        <div className="seat-type-editor">
            {!readOnly && (
                <motion.div
                    className="editor-toolbar"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <div className="toolbar-section">
                        <span className="toolbar-label">Assign as:</span>
                        {Object.entries(SEAT_TYPES).map(([type, info]) => (
                            <button
                                key={type}
                                className={`type-btn ${currentSeatType === type ? 'active' : ''}`}
                                style={{ '--type-color': info.color } as React.CSSProperties}
                                onClick={() => setCurrentSeatType(type as 'standard' | 'vip' | 'premium')}
                            >
                                {type === 'vip' && <FiStar />}
                                {info.label}
                            </button>
                        ))}
                    </div>

                    <div className="toolbar-section">
                        {selectedSeats.size > 0 && (
                            <>
                                <button className="apply-btn" onClick={applyTypeToSelected}>
                                    <FiZap />
                                    Apply to {selectedSeats.size} seats
                                </button>
                                <button className="clear-btn" onClick={clearSelectedType}>
                                    Reset to Standard
                                </button>
                            </>
                        )}
                    </div>

                    <div className="toolbar-section zoom-controls">
                        <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))}>
                            <FiMinimize2 />
                        </button>
                        <span>{Math.round(zoomLevel * 100)}%</span>
                        <button onClick={() => setZoomLevel(z => Math.min(1.5, z + 0.1))}>
                            <FiMaximize2 />
                        </button>
                    </div>
                </motion.div>
            )}

            {!readOnly && showPricing && (
                <motion.div
                    className="pricing-panel"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                >
                    <h4><FiDollarSign /> Set Prices</h4>
                    <div className="price-inputs">
                        {Object.entries(SEAT_TYPES).map(([type, info]) => (
                            <div key={type} className="price-input-group">
                                <label style={{ color: info.color }}>{info.label}</label>
                                <div className="price-input">
                                    <span>EGP</span>
                                    <input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={typePricing[type as keyof TypePricing]}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTypePricing(prev => ({
                                            ...prev,
                                            [type]: parseFloat(e.target.value) || 0
                                        }))}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}

            <div
                className="seat-map-container"
                style={{ transform: `scale(${zoomLevel})` }}
            >
                {theater.layout?.stage?.position === 'top' && (
                    <div className="stage stage-top">
                        <FiChevronsUp className="stage-icon" />
                        <span>STAGE</span>
                    </div>
                )}

                {theater.layout?.hasBalcony && (
                    <div className="section balcony-section">
                        <div className="section-label">
                            <FiChevronsUp />
                            BALCONY
                        </div>
                        <div className="seats-grid">
                            {balconyRowLabels.map(rowLabel =>
                                renderRow(
                                    rowLabel,
                                    theater.layout!.balcony!.seatsPerRow,
                                    theater.layout!.balcony!.aislePositions,
                                    'balcony',
                                    removedSeatsSet
                                )
                            )}
                        </div>
                    </div>
                )}

                <div className="section main-section">
                    <div className="section-label">
                        <FiGrid />
                        MAIN FLOOR
                    </div>
                    <div className="seats-grid">
                        {mainRowLabels.map(rowLabel =>
                            renderRow(
                                rowLabel,
                                theater.layout!.mainFloor!.seatsPerRow,
                                theater.layout!.mainFloor!.aislePositions,
                                'main',
                                removedSeatsSet
                            )
                        )}
                    </div>
                </div>

                {theater.layout?.stage?.position === 'bottom' && (
                    <div className="stage stage-bottom">
                        <span>STAGE</span>
                        <FiChevronsDown className="stage-icon" />
                    </div>
                )}
            </div>

            <div className="editor-footer">
                <div className="legend">
                    {Object.entries(SEAT_TYPES).map(([type, info]) => (
                        <div key={type} className="legend-item">
                            <div className="legend-color" style={{ background: info.color }} />
                            <span>{info.label}</span>
                            <span className="legend-count">({summary.counts[type] || 0})</span>
                            <span className="legend-price">{typePricing[type as keyof TypePricing]} EGP</span>
                        </div>
                    ))}
                </div>

                <div className="summary">
                    <span className="total-seats">
                        Total: {Object.values(summary.counts).reduce((a, b) => a + b, 0)} seats
                    </span>
                    <span className="total-revenue">
                        Max Revenue: {Object.values(summary.totalRevenue).reduce((a, b) => a + b, 0).toFixed(2)} EGP
                    </span>
                </div>
            </div>

            {!readOnly && (
                <div className="editor-instructions">
                    <p>
                        <strong>Tip:</strong> Click seats to select, Ctrl/Cmd+Click for multi-select.
                        Choose a seat type and click &quot;Apply&quot; to assign.
                    </p>
                </div>
            )}
        </div>
    );
};

export default EventSeatTypeEditor;
