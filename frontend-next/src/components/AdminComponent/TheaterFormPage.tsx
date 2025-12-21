'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiArrowLeft, FiSave, FiGrid, FiAlertCircle } from 'react-icons/fi';
import api from '@/services/api';
import TheaterDesigner from '../Theater/TheaterDesigner';
import './TheaterFormPage.css';

interface StageConfig {
    position: 'top' | 'bottom';
    width?: number;
    height?: number;
}

interface FloorConfig {
    rows: number;
    seatsPerRow: number;
    aislePositions?: number[];
}

interface TheaterLabel {
    id: number;
    text: string;
    icon?: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
}

interface TheaterLayout {
    mainFloor?: FloorConfig;
    balcony?: FloorConfig;
    hasBalcony?: boolean;
    stage?: StageConfig;
    removedSeats?: string[];
    disabledSeats?: string[];
    hCorridors?: Record<string, number>;
    vCorridors?: Record<string, number>;
    seatCategories?: Record<string, string>;
    labels?: TheaterLabel[];
}

interface DesignerData {
    layout: TheaterLayout;
    removedSeats?: string[];
    disabledSeats?: string[];
    hCorridors?: Record<string, number>;
    vCorridors?: Record<string, number>;
    labels?: TheaterLabel[];
    seatConfig?: any[];
    totalSeats?: number;
}

interface TheaterFormPageProps {
    id?: string;
}

const TheaterFormPage = ({ id }: TheaterFormPageProps) => {
    const router = useRouter();
    const isEditMode = Boolean(id);

    const [name, setName] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [initialLayout, setInitialLayout] = useState<TheaterLayout | null>(null);
    const [loading, setLoading] = useState<boolean>(isEditMode);
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isEditMode && id) {
            fetchTheater();
        }
    }, [id, isEditMode]);

    const fetchTheater = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/theater/${id}`);
            if (response.data.success) {
                const theater = response.data.data;
                setName(theater.name);
                setDescription(theater.description || '');
                setInitialLayout(theater.layout);
            }
        } catch (err: any) {
            console.error('Error fetching theater:', err);
            setError('Failed to load theater');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (designerData: DesignerData) => {
        if (!name.trim()) {
            setError('Theater name is required');
            return;
        }

        try {
            setSaving(true);
            setError(null);

            const payload = {
                name: name.trim(),
                description: description.trim(),
                layout: {
                    ...designerData.layout,
                    removedSeats: designerData.removedSeats,
                    disabledSeats: designerData.disabledSeats,
                    hCorridors: designerData.hCorridors,
                    vCorridors: designerData.vCorridors,
                    labels: designerData.labels
                },
                seatConfig: designerData.seatConfig
            };

            if (isEditMode) {
                await api.put(`/theater/${id}`, payload);
            } else {
                await api.post('/theater', payload);
            }

            router.push('/admin/theaters');
        } catch (err: any) {
            console.error('Error saving theater:', err);
            setError(err.response?.data?.message || 'Failed to save theater');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="theater-form-page">
                <div className="loading-state">
                    <div className="loading-spinner" />
                    <p>Loading theater...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="theater-form-page">
            <motion.div
                className="form-header"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <button
                    className="back-btn"
                    onClick={() => router.push('/admin/theaters')}
                >
                    <FiArrowLeft />
                    <span>Back</span>
                </button>

                <div className="header-center">
                    <FiGrid className="header-icon" />
                    <h1>{isEditMode ? 'Edit Theater' : 'Create New Theater'}</h1>
                </div>

                <div className="header-actions">
                    {saving && <span className="saving-indicator">Saving...</span>}
                </div>
            </motion.div>

            {error && (
                <motion.div
                    className="error-banner"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                >
                    <FiAlertCircle />
                    <span>{error}</span>
                    <button onClick={() => setError(null)}>×</button>
                </motion.div>
            )}

            <motion.div
                className="form-info-section"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
            >
                <div className="form-group">
                    <label htmlFor="theater-name">Theater Name *</label>
                    <input
                        id="theater-name"
                        type="text"
                        value={name}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                        placeholder="e.g., Grand Theater, Main Hall"
                        maxLength={100}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="theater-description">Description</label>
                    <textarea
                        id="theater-description"
                        value={description}
                        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                        placeholder="Optional description of the theater..."
                        maxLength={500}
                        rows={2}
                    />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
            >
                <TheaterDesigner
                    initialLayout={initialLayout as any}
                    onSave={handleSave}
                    showLabelAccents={true}
                />
            </motion.div>
        </div>
    );
};

export default TheaterFormPage;
