"use client";
import React, { useState, useEffect } from 'react';
import { FiCheck, FiX, FiDollarSign } from 'react-icons/fi';
import { TheaterLayout } from '@/types/theater';
import TheaterDesigner from '../Theater/TheaterDesigner';
import './EventSeatConfigurator.css';

const SEAT_TYPES = {
    STANDARD: 'standard',
    VIP: 'vip',
    PREMIUM: 'premium',
    WHEELCHAIR: 'wheelchair'
};

interface SeatConfig {
    section: string;
    row: string;
    seatNumber: number;
    seatType: string;
}

interface EventSeatConfiguratorProps {
    theaterLayout: TheaterLayout;
    initialSeatConfig?: SeatConfig[];
    initialPricing?: Record<string, number>;
    onSave: (config: SeatConfig[], pricing: { seatType: string; price: number }[]) => void;
    onCancel: () => void;
}

const EventSeatConfigurator: React.FC<EventSeatConfiguratorProps> = ({
    theaterLayout, initialSeatConfig = [], initialPricing = {}, onSave, onCancel
}) => {
    const [currentCategory, setCurrentCategory] = useState(SEAT_TYPES.VIP);
    const [seatMap, setSeatMap] = useState<Record<string, string>>({});
    const [pricing, setPricing] = useState<Record<string, number>>({
        standard: initialPricing.standard || 0,
        vip: initialPricing.vip || 0,
        premium: initialPricing.premium || 0,
        wheelchair: initialPricing.wheelchair || 0
    });

    useEffect(() => {
        const initialMap: Record<string, string> = {};
        if (theaterLayout?.seatCategories) {
            Object.entries(theaterLayout.seatCategories).forEach(([key, type]) => {
                initialMap[key] = type;
            });
        }
        if (initialSeatConfig && initialSeatConfig.length > 0) {
            initialSeatConfig.forEach(cfg => {
                const key = `${cfg.section || 'main'}-${cfg.row}-${cfg.seatNumber}`;
                initialMap[key] = cfg.seatType;
            });
        }
        setSeatMap(initialMap);
    }, [theaterLayout, initialSeatConfig]);

    const isSeatRemoved = (section: string, row: string, seatNum: number) => {
        const key = `${section}-${row}-${seatNum}`;
        return theaterLayout?.removedSeats?.includes(key) || false;
    };

    const isSeatDisabled = (section: string, row: string, seatNum: number) => {
        const key = `${section}-${row}-${seatNum}`;
        return theaterLayout?.disabledSeats?.includes(key) || false;
    };

    const handleSeatClick = (section: string, rowLabel: string, seatNum: number) => {
        if (isSeatRemoved(section, rowLabel, seatNum) || isSeatDisabled(section, rowLabel, seatNum)) return;
        const key = `${section}-${rowLabel}-${seatNum}`;
        setSeatMap(prev => {
            const newMap = { ...prev };
            if (newMap[key] === currentCategory) delete newMap[key];
            else newMap[key] = currentCategory;
            return newMap;
        });
    };

    const handleRowClick = (section: string, rowLabel: string, seatsPerRow: number) => {
        setSeatMap(prev => {
            const newMap = { ...prev };
            let allHaveCategory = true;
            for (let i = 1; i <= seatsPerRow; i++) {
                if (isSeatRemoved(section, rowLabel, i) || isSeatDisabled(section, rowLabel, i)) continue;
                if (newMap[`${section}-${rowLabel}-${i}`] !== currentCategory) {
                    allHaveCategory = false;
                    break;
                }
            }
            for (let i = 1; i <= seatsPerRow; i++) {
                const key = `${section}-${rowLabel}-${i}`;
                if (isSeatRemoved(section, rowLabel, i) || isSeatDisabled(section, rowLabel, i)) continue;
                if (allHaveCategory) delete newMap[key];
                else newMap[key] = currentCategory;
            }
            return newMap;
        });
    };

    const handlePriceChange = (category: string, value: string) => {
        setPricing(prev => ({ ...prev, [category]: parseFloat(value) || 0 }));
    };

    const handleSave = () => {
        const configArray = Object.entries(seatMap).map(([key, type]) => {
            const parts = key.split('-');
            return { section: parts[0], row: parts[1], seatNumber: parseInt(parts[2]), seatType: type };
        });
        const pricingArray = Object.entries(pricing).map(([type, price]) => ({ seatType: type, price }));
        onSave(configArray, pricingArray);
    };

    // Convert theaterLayout to the format expected by TheaterDesigner
    const designerLayout = {
        stage: {
            position: (theaterLayout?.stage?.position || 'top') as 'top' | 'bottom',
            width: theaterLayout?.stage?.width ?? 80,
            height: theaterLayout?.stage?.height ?? 60
        },
        mainFloor: {
            rows: theaterLayout?.mainFloor?.rows || 10,
            seatsPerRow: theaterLayout?.mainFloor?.seatsPerRow || 12,
            aislePositions: theaterLayout?.mainFloor?.aislePositions || []
        },
        hasBalcony: theaterLayout?.hasBalcony || false,
        balcony: {
            rows: theaterLayout?.balcony?.rows || 0,
            seatsPerRow: theaterLayout?.balcony?.seatsPerRow || 0,
            aislePositions: theaterLayout?.balcony?.aislePositions || []
        },
        removedSeats: theaterLayout?.removedSeats || [],
        disabledSeats: theaterLayout?.disabledSeats || [],
        hCorridors: theaterLayout?.hCorridors || {},
        vCorridors: theaterLayout?.vCorridors || {},
        seatCategories: theaterLayout?.seatCategories || {},
        labels: theaterLayout?.labels || []
    };

    return (
        <div className="event-seat-configurator fullpage">
            <div className="configurator-header">
                <div className="header-left">
                    <h3>Configure Event Seating & Pricing</h3>
                    <p>Select categories, set prices, and click seats to customize.</p>
                </div>
                <div className="header-actions">
                    <button className="secondary-btn" onClick={onCancel}>
                        <FiX /> Cancel
                    </button>
                    <button className="primary-btn" onClick={handleSave}>
                        <FiCheck /> Save Configuration
                    </button>
                </div>
            </div>
            <div className="configurator-main">
                <div className="configurator-sidebar">
                    <div className="sidebar-section">
                        <h4>Paint Category</h4>
                        <p className="section-hint">Select a category, then click seats to apply</p>
                        <div className="category-list">
                            {Object.values(SEAT_TYPES).map(type => (
                                <button
                                    key={type}
                                    className={`category-select-btn type-${type} ${currentCategory === type ? 'active' : ''}`}
                                    onClick={() => setCurrentCategory(type)}
                                >
                                    <span className="cat-color"></span>
                                    <span className="cat-name">{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                                    {currentCategory === type && <FiCheck className="cat-check" />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-section pricing-section">
                        <h4><FiDollarSign /> Set Prices</h4>
                        <p className="section-hint">Define price for each seat type</p>
                        <div className="pricing-inputs">
                            {Object.values(SEAT_TYPES).map(type => (
                                <div key={type} className={`price-input-row type-${type}`}>
                                    <span className="price-cat-color"></span>
                                    <label>{type.charAt(0).toUpperCase() + type.slice(1)}</label>
                                    <div className="price-input-wrapper">
                                        <span className="currency">$</span>
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={pricing[type] || ''}
                                            onChange={(e) => handlePriceChange(type, e.target.value)}
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="sidebar-section legend-section">
                        <h4>Legend</h4>
                        <div className="legend-list">
                            <div className="legend-item"><div className="legend-color standard" /><span>Standard</span></div>
                            <div className="legend-item"><div className="legend-color vip" /><span>VIP</span></div>
                            <div className="legend-item"><div className="legend-color premium" /><span>Premium</span></div>
                            <div className="legend-item"><div className="legend-color wheelchair" /><span>Wheelchair</span></div>
                            <div className="legend-item"><div className="legend-color disabled" /><span>Removed</span></div>
                        </div>
                    </div>
                </div>
                <div className="configurator-canvas-area">
                    <TheaterDesigner
                        initialLayout={designerLayout as any}
                        isPreviewMode={true}
                        isCategoryMode={true}
                        seatCategoryMap={seatMap}
                        currentCategory={currentCategory}
                        onSeatClick={handleSeatClick}
                        onRowClick={handleRowClick}
                        showLabelAccents={true}
                        allowLabelDragging={true}
                    />
                </div>
            </div>
        </div>
    );
};

export default EventSeatConfigurator;
