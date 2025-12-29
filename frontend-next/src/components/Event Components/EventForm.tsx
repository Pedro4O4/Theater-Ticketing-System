"use client";
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import './EventForm.css';
import { getImageUrl } from '@/utils/imageHelper';
import EventSeatConfigurator from './EventSeatConfigurator';
import { FiLayout } from 'react-icons/fi';
import { Theater } from '@/types/theater';
import { Event } from '@/types/event';
import { toast } from 'react-toastify';

interface EventFormProps {
    initialData?: Partial<Event>;
    isEdit?: boolean;
    eventId?: string;
}

const EventForm: React.FC<EventFormProps> = ({ initialData, isEdit, eventId }) => {
    const router = useRouter();
    const { user } = useAuth();

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        description: initialData?.description || '',
        date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : '',
        location: initialData?.location || '',
        category: initialData?.category || '',
        ticketPrice: initialData?.ticketPrice || 0,
        totalTickets: initialData?.totalTickets || 0,
        imageFile: null as File | null,
        imagePreview: null as string | null,
        image: initialData?.image || '',
        useImageUrl: false,
        imageUrl: '',
        hasTheaterSeating: initialData?.hasTheaterSeating || false,
        theaterId: (initialData as any)?.theater?._id || (initialData as any)?.theater || '',
        seatPricing: {} as Record<string, number>
    });

    const [theaters, setTheaters] = useState<Theater[]>([]);
    const [selectedTheaterLayout, setSelectedTheaterLayout] = useState<any>(null);
    const [showSeatConfigurator, setShowSeatConfigurator] = useState(false);
    const [eventSeatConfig, setEventSeatConfig] = useState<any[]>(initialData?.seatConfig || []);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showFullImage, setShowFullImage] = useState(false);

    useEffect(() => {
        const fetchTheaters = async () => {
            try {
                const response = await api.get<any>('/theater?active=true');
                if (response.data.success) {
                    setTheaters(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching theaters:", err);
            }
        };
        fetchTheaters();

        if (initialData?.seatPricing) {
            const pricing: Record<string, number> = {};
            initialData.seatPricing.forEach((sp: any) => {
                pricing[sp.seatType] = sp.price;
            });
            setFormData(prev => ({ ...prev, seatPricing: pricing }));
        }

        if (formData.theaterId) {
            handleTheaterChange(formData.theaterId);
        }

        return () => {
            if (formData.imagePreview) URL.revokeObjectURL(formData.imagePreview);
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : (name === 'totalTickets' || name === 'ticketPrice' ? parseFloat(value) || 0 : value)
        }));

        if (name === 'theaterId' && value) {
            handleTheaterChange(value);
        }
    };

    const handleTheaterChange = async (theaterId: string) => {
        try {
            const response = await api.get<any>(`/theater/${theaterId}`);
            if (response.data.success) {
                const theater = response.data.data;
                setSelectedTheaterLayout(theater.layout);
                updatePricingCategories(theater.layout, []);
                if (!isEdit && theater.totalSeats) {
                    setFormData(prev => ({ ...prev, totalTickets: theater.totalSeats }));
                }
            }
        } catch (err) {
            console.error("Error fetching theater layout:", err);
        }
    };

    const updatePricingCategories = (layout: any, currentOverrides: any[]) => {
        const categories = new Set(['standard']);
        if (layout.seatCategories) {
            Object.values(layout.seatCategories).forEach((cat: any) => categories.add(cat));
        }
        if (currentOverrides) {
            currentOverrides.forEach(cfg => categories.add(cfg.seatType));
        }

        setFormData(prev => {
            const newPricing = { ...prev.seatPricing };
            categories.forEach(cat => {
                if (newPricing[cat] === undefined) {
                    newPricing[cat] = prev.ticketPrice || 0;
                }
            });
            return { ...prev, seatPricing: newPricing };
        });
    };

    const handleSeatConfigSave = (newConfig: any[], newPricing: any[]) => {
        setEventSeatConfig(newConfig);
        const pricingObj: Record<string, number> = {};
        newPricing.forEach(p => { pricingObj[p.seatType] = p.price; });
        setFormData(prev => ({ ...prev, seatPricing: pricingObj }));
        setShowSeatConfigurator(false);
    };

    const handlePriceChange = (category: string, price: string) => {
        setFormData(prev => ({
            ...prev,
            seatPricing: { ...prev.seatPricing, [category]: parseFloat(price) || 0 }
        }));
    };

    // Helper function to compress image before converting to base64
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Resize if image is too large (max 1200px width)
                    const maxWidth = 1200;
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    // Convert to base64 with compression (0.8 quality for JPEG)
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(compressedBase64);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);

            // Convert image file to base64 with compression if needed
            let imageData = formData.image;
            if (formData.useImageUrl && formData.imageUrl) {
                imageData = formData.imageUrl;
            } else if (formData.imageFile) {
                imageData = await compressImage(formData.imageFile);
            }

            const requestData: any = {
                title: formData.title,
                description: formData.description,
                date: formData.date,
                location: formData.location,
                category: formData.category,
                ticketPrice: formData.hasTheaterSeating ? 0 : formData.ticketPrice,
                totalTickets: formData.totalTickets,
                hasTheaterSeating: formData.hasTheaterSeating,
                image: imageData
            };

            if (formData.hasTheaterSeating && formData.theaterId) {
                requestData.theater = formData.theaterId;
                requestData.seatPricing = Object.entries(formData.seatPricing).map(([type, price]) => ({
                    seatType: type,
                    price: price
                }));
                if (eventSeatConfig && eventSeatConfig.length > 0) {
                    requestData.seatConfig = eventSeatConfig;
                }
            }

            let response;
            if (isEdit && eventId) {
                response = await api.put(`/event/${eventId}`, requestData);
            } else {
                response = await api.post('/event', requestData);
            }

            if (response.data.success) {
                toast.success(isEdit ? 'Event updated!' : 'Event created!');
                router.push('/my-events');
            }
        } catch (err: any) {
            setError('Failed to save event. ' + (err.response?.data?.message || err.message));
            toast.error(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    if (showSeatConfigurator && selectedTheaterLayout) {
        return (
            <EventSeatConfigurator
                theaterLayout={selectedTheaterLayout}
                initialSeatConfig={eventSeatConfig}
                initialPricing={formData.seatPricing}
                onSave={handleSeatConfigSave}
                onCancel={() => setShowSeatConfigurator(false)}
            />
        );
    }

    return (
        <div className="event-form-container">
            <h2>{isEdit ? 'Edit Event' : 'Create New Event'}</h2>
            {error && <div className="error-message">{error}</div>}

            <form onSubmit={handleSubmit} className="event-form">
                <div className="form-group">
                    <label htmlFor="title">Event Title*</label>
                    <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required placeholder="Enter event title" />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Description*</label>
                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} required rows={4} placeholder="Enter event description" />
                </div>

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label htmlFor="date">Date*</label>
                        <input type="date" id="date" name="date" value={formData.date} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="category">Category*</label>
                        <input type="text" id="category" name="category" value={formData.category} onChange={handleChange} required placeholder="e.g. Movie, Play, Concert" />
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="location">Location*</label>
                    <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} required placeholder="Enter event location" />
                </div>

                <div className="form-group checkbox-group">
                    <label>
                        <input type="checkbox" name="hasTheaterSeating" checked={formData.hasTheaterSeating} onChange={handleChange} />
                        Use Theater Seating
                    </label>
                </div>

                {formData.hasTheaterSeating && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="theater-selection-area">
                        <div className="form-group">
                            <label htmlFor="theaterId">Select Theater*</label>
                            <select id="theaterId" name="theaterId" value={formData.theaterId} onChange={handleChange} required={formData.hasTheaterSeating}>
                                <option value="">-- Choose a Theater --</option>
                                {theaters.map(theater => (
                                    <option key={theater._id} value={theater._id}>
                                        {theater.name} ({theater.totalSeats} seats)
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedTheaterLayout && (
                            <div className="form-group pricing-group">
                                <div className="pricing-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ marginBottom: 0 }}>Seat Tier Pricing*</label>
                                        <p className="help-text" style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>Set prices for each category.</p>
                                    </div>
                                    <button type="button" className="edit-seats-btn" onClick={() => setShowSeatConfigurator(true)}>
                                        <FiLayout /> Configure Layout
                                    </button>
                                </div>
                                <div className="pricing-grid">
                                    {Object.keys(formData.seatPricing).map(type => (
                                        <div key={type} className={`pricing-item type-${type}`}>
                                            <span className="type-label">{type.toUpperCase()}</span>
                                            <div className="price-input-wrapper">
                                                <span className="currency">$</span>
                                                <input
                                                    type="number"
                                                    value={formData.seatPricing[type]}
                                                    onChange={(e) => handlePriceChange(type, e.target.value)}
                                                    placeholder="Price"
                                                    min="0"
                                                    step="0.01"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group">
                        <label htmlFor="totalTickets">{formData.hasTheaterSeating ? 'Capacity (Auto)' : 'Available Tickets*'}</label>
                        <input type="number" id="totalTickets" name="totalTickets" value={formData.totalTickets} onChange={handleChange} required min="1" disabled={formData.hasTheaterSeating} />
                    </div>
                    {!formData.hasTheaterSeating && (
                        <div className="form-group">
                            <label htmlFor="ticketPrice">Base Ticket Price ($)*</label>
                            <input type="number" id="ticketPrice" name="ticketPrice" value={formData.ticketPrice} onChange={handleChange} required={!formData.hasTheaterSeating} step="0.01" min="0" />
                        </div>
                    )}
                </div>

                <div className="form-group image-section">
                    <label>Event Image</label>
                    <div className="image-preview-container">
                        {(formData.imagePreview || formData.image) && (
                            <div className="image-preview" onClick={() => setShowFullImage(true)}>
                                <img src={formData.imagePreview || getImageUrl(formData.image)} alt="Preview" />
                            </div>
                        )}
                    </div>

                    <div className="image-source-buttons">
                        <button type="button" className={`source-select-btn ${!formData.useImageUrl ? 'active' : ''}`} onClick={() => setFormData(prev => ({ ...prev, useImageUrl: false }))}>Upload</button>
                        <button type="button" className={`source-select-btn ${formData.useImageUrl ? 'active' : ''}`} onClick={() => setFormData(prev => ({ ...prev, useImageUrl: true }))}>URL</button>
                    </div>

                    <div className="image-input-container">
                        {formData.useImageUrl ? (
                            <input type="url" name="imageUrl" value={formData.imageUrl} onChange={(e) => setFormData(prev => ({ ...prev, imageUrl: e.target.value, image: e.target.value }))} placeholder="Enter image URL" className="form-input" />
                        ) : (
                            <input type="file" accept="image/*" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                    setFormData(prev => ({ ...prev, imageFile: file, imagePreview: URL.createObjectURL(file) }));
                                }
                            }} className="form-input" />
                        )}
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" onClick={() => router.push('/my-events')} className="cancel-button">Cancel</button>
                    <button type="submit" className="submit-button" disabled={loading}>
                        {loading ? 'Processing...' : (isEdit ? 'Update Event' : 'Create Event')}
                    </button>
                </div>
            </form>

            <AnimatePresence>
                {showFullImage && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="full-image-modal" onClick={() => setShowFullImage(false)}>
                        <div className="modal-content">
                            <img src={formData.imagePreview || getImageUrl(formData.image)} alt="Full Preview" />
                            <button className="close-modal">×</button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default EventForm;
