'use client';

// TheaterDesigner.tsx - Enhanced with vertical + horizontal corridors, seat removal, drag-drop
import React, { useState, useCallback, useMemo, useEffect, MouseEvent, ChangeEvent, DragEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FiGrid, FiMaximize2, FiMinimize2, FiSave, FiPlus, FiMinus,
    FiLayers, FiSettings, FiChevronsUp, FiChevronsDown,
    FiTrash2, FiMove, FiSlash, FiX, FiCheck, FiRotateCcw, FiRotateCw, FiMaximize
} from 'react-icons/fi';
import { useAuth } from '@/auth/AuthContext';
import './TheaterDesigner.css';

// Type definitions
interface StageConfig {
    position: 'top' | 'bottom';
    width: number;
    height: number;
}

interface FloorConfig {
    rows: number;
    seatsPerRow: number;
    aislePositions: number[];
}

interface TheaterLayout {
    stage: StageConfig;
    mainFloor: FloorConfig;
    hasBalcony: boolean;
    balcony: FloorConfig;
    removedSeats?: string[];
    disabledSeats?: string[];
    hCorridors?: Record<string, number>;
    vCorridors?: Record<string, number>;
    seatCategories?: Record<string, string>;
    labels?: TheaterLabel[];
}

interface TheaterLabel {
    id: number;
    text: string;
    icon?: string;
    position: { x: number; y: number };
    width?: number;
    height?: number;
    isNew?: boolean;
    isPixelBased?: boolean;
    section?: 'main' | 'balcony';
}

interface LabelPreset {
    text: string;
    icon: string;
}

interface SeatConfig {
    section: string;
    row: string;
    seatNumber: number;
    seatType: string;
    isActive: boolean;
}

interface SaveData {
    layout: TheaterLayout;
    seatConfig: SeatConfig[];
    removedSeats: string[];
    disabledSeats: string[];
    hCorridors: Record<string, number>;
    vCorridors: Record<string, number>;
    labels: TheaterLabel[];
    totalSeats: number;
}

interface ResizeInfo {
    id: number;
    type: 'width' | 'height';
}

interface TheaterDesignerProps {
    initialLayout?: TheaterLayout | null;
    onSave?: (data: SaveData) => void;
    isPreviewMode?: boolean;
    // Category selection mode props (for EventSeatConfigurator)
    isCategoryMode?: boolean;
    seatCategoryMap?: Record<string, string>;  // Map of seatKey -> category
    currentCategory?: string;
    onSeatClick?: (section: string, row: string, seatNum: number) => void;
    onRowClick?: (section: string, row: string, seatsPerRow: number) => void;
    showLabelAccents?: boolean;
    allowLabelDragging?: boolean;
}

// Tool modes for admin
const TOOLS = {
    SELECT: 'select',
    REMOVE: 'remove',
    DISABLE: 'disable',         // Disable seat slots permanently (no + sign)
    CORRIDOR_H: 'corridor_h',   // Horizontal corridor (between rows)
    CORRIDOR_V: 'corridor_v',   // Vertical corridor (between columns)
    LABEL: 'label',              // Add/edit labels
    RESTORE: 'restore'           // Restore removed seats
} as const;

type ToolType = typeof TOOLS[keyof typeof TOOLS];

const SEAT_TYPES = {
    STANDARD: 'standard',
    VIP: 'vip',
    PREMIUM: 'premium',
    WHEELCHAIR: 'wheelchair'
} as const;

type SeatType = typeof SEAT_TYPES[keyof typeof SEAT_TYPES];

// Preset label types
const LABEL_PRESETS: LabelPreset[] = [
    { text: 'ENTRY', icon: '🚪' },
    { text: 'EXIT', icon: '🚪' },
    { text: 'SOUND', icon: '🔊' },
    { text: 'LIGHTS', icon: '💡' },
    { text: 'CAMERA', icon: '📷' },
    { text: 'VIP AREA', icon: '⭐' },
    { text: 'RESTROOM', icon: '🚻' },
    { text: 'WHEELCHAIR', icon: '♿' },
    { text: 'CUSTOM', icon: '📝' }
];

const TheaterDesigner = ({
    initialLayout = null,
    onSave,
    isPreviewMode = false,
    isCategoryMode = false,
    seatCategoryMap = {},
    currentCategory = 'standard',
    onSeatClick,
    onRowClick,
    showLabelAccents = false,
    allowLabelDragging = false
}: TheaterDesignerProps) => {
    // Default layout
    const defaultLayout: TheaterLayout = {
        stage: { position: 'top', width: 80, height: 15 },
        mainFloor: { rows: 10, seatsPerRow: 12, aislePositions: [] },
        hasBalcony: false,
        balcony: { rows: 3, seatsPerRow: 10, aislePositions: [] }
    };

    // Layout state
    const [layout, setLayout] = useState<TheaterLayout>(initialLayout || defaultLayout);

    // Removed and disabled seats
    const [removedSeats, setRemovedSeats] = useState<Set<string>>(new Set(initialLayout?.removedSeats || []));
    const [disabledSeats, setDisabledSeats] = useState<Set<string>>(new Set(initialLayout?.disabledSeats || []));
    const [hCorridors, setHCorridors] = useState<Record<string, number>>(initialLayout?.hCorridors || {});
    const [vCorridors, setVCorridors] = useState<Record<string, number>>(initialLayout?.vCorridors || {});
    const [seatCategories, setSeatCategories] = useState<Record<string, string>>(initialLayout?.seatCategories || {});


    const { user } = useAuth();

    // UI state
    const [selectedSeats, setSelectedSeats] = useState<Set<string>>(new Set());
    const [currentTool, setCurrentTool] = useState<ToolType>(TOOLS.SELECT);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [activeSection, setActiveSection] = useState<'main' | 'balcony'>('main');



    // Drag state
    const [draggedSeat, setDraggedSeat] = useState<string | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

    // Labels state
    const [labels, setLabels] = useState<TheaterLabel[]>(initialLayout?.labels || []);
    const [showLabelModal, setShowLabelModal] = useState<boolean>(false);
    const [editingLabel, setEditingLabel] = useState<TheaterLabel | null>(null);
    const [newLabelText, setNewLabelText] = useState<string>('');
    const [selectedLabelPreset, setSelectedLabelPreset] = useState<LabelPreset | null>(null);
    const [draggingLabel, setDraggingLabel] = useState<number | null>(null);
    const [resizingLabel, setResizingLabel] = useState<ResizeInfo | null>(null);
    const wasDragging = React.useRef<boolean>(false);
    const canvasRef = React.useRef<HTMLDivElement | null>(null);
    const hasInitialSync = React.useRef<boolean>(false);

    // History state for undo/redo
    const [history, setHistory] = useState<any[]>([]);
    const [redoStack, setRedoStack] = useState<any[]>([]);

    const createSnapshot = useCallback(() => {
        return {
            layout: JSON.parse(JSON.stringify(layout)),
            removedSeats: new Set(removedSeats),
            disabledSeats: new Set(disabledSeats),
            hCorridors: { ...hCorridors },
            vCorridors: { ...vCorridors },
            seatCategories: { ...seatCategories },
            labels: JSON.parse(JSON.stringify(labels))
        };
    }, [layout, removedSeats, disabledSeats, hCorridors, vCorridors, seatCategories, labels]);

    // Convert old percentage labels to pixel-based ones if detected on load
    useEffect(() => {
        if (!canvasRef.current || labels.length === 0) return;

        // Logical dimensions are needed for percentage-to-pixel conversion
        const rect = canvasRef.current.getBoundingClientRect();
        if (rect.width === 0) return; // Not ready yet

        const logicalWidth = rect.width / zoomLevel;
        const logicalHeight = rect.height / zoomLevel;

        const needsMigration = labels.some(l => !l.isPixelBased);

        if (needsMigration) {
            setLabels(prev => prev.map(l => {
                if (l.isPixelBased) return l;

                // Old logic: x (0-100), y (0-100)
                // New logic: x (pixels from center), y (pixels from top)
                const xPx = (l.position.x / 100) * logicalWidth;
                const yPx = (l.position.y / 100) * logicalHeight;
                const xOffset = xPx - (logicalWidth / 2);

                return {
                    ...l,
                    position: { x: Math.round(xOffset), y: Math.round(yPx) },
                    isPixelBased: true
                };
            }));
            // We don't saveToHistory here to avoid immediate undo stack pollution on load
        }
    }, [labels.length, zoomLevel]); // Only trigger when labels are added/loaded or zoom changes (for initial rect)

    const saveToHistory = useCallback(() => {
        setHistory(prev => [...prev.slice(-49), createSnapshot()]); // Keep last 50 actions
        setRedoStack([]);
    }, [createSnapshot]);

    const handleAutoFit = useCallback(() => {
        if (!canvasRef.current) return;

        const container = canvasRef.current.parentElement;
        if (!container) return;

        // Reset scale temporarily to measure untransformed size
        const originalTransform = canvasRef.current.style.transform;
        canvasRef.current.style.transform = 'scale(1)';

        const canvasWidth = canvasRef.current.offsetWidth;
        const containerWidth = container.clientWidth - 80; // Accounting for 40px padding on each side

        canvasRef.current.style.transform = originalTransform;

        if (canvasWidth === 0) return;

        const scaleX = containerWidth / canvasWidth;
        // Limit zoom to be between 0.3 and 1.0 for auto-fit
        const newZoom = Math.max(0.3, Math.min(1, scaleX));
        setZoomLevel(Number(newZoom.toFixed(2)));
    }, []);

    useEffect(() => {
        if (!hasInitialSync.current && layout.mainFloor.rows > 0) {
            // Small delay to ensure measurements are accurate
            const timer = setTimeout(handleAutoFit, 300);
            hasInitialSync.current = true;
            return () => clearTimeout(timer);
        }
    }, [handleAutoFit, layout.mainFloor.rows]);

    const undo = useCallback(() => {
        if (history.length === 0) return;

        const currentSnapshot = createSnapshot();
        const prevSnapshot = history[history.length - 1];

        setRedoStack(prev => [...prev, currentSnapshot]);
        setHistory(prev => prev.slice(0, -1));

        // Restore state
        setLayout(prevSnapshot.layout);
        setRemovedSeats(prevSnapshot.removedSeats);
        setDisabledSeats(prevSnapshot.disabledSeats);
        setHCorridors(prevSnapshot.hCorridors);
        setVCorridors(prevSnapshot.vCorridors);
        setSeatCategories(prevSnapshot.seatCategories);
        setLabels(prevSnapshot.labels);
    }, [history, createSnapshot]);

    const redo = useCallback(() => {
        if (redoStack.length === 0) return;

        const currentSnapshot = createSnapshot();
        const nextSnapshot = redoStack[redoStack.length - 1];

        setHistory(prev => [...prev, currentSnapshot]);
        setRedoStack(prev => prev.slice(0, -1));

        // Restore state
        setLayout(nextSnapshot.layout);
        setRemovedSeats(nextSnapshot.removedSeats);
        setDisabledSeats(nextSnapshot.disabledSeats);
        setHCorridors(nextSnapshot.hCorridors);
        setVCorridors(nextSnapshot.vCorridors);
        setSeatCategories(nextSnapshot.seatCategories);
        setLabels(nextSnapshot.labels);
    }, [redoStack, createSnapshot]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isPreviewMode) return;

            // Undo: Ctrl+Z
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                e.preventDefault();
                undo();
            }
            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
                e.preventDefault();
                redo();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, isPreviewMode]);

    // Sync state if initialLayout changes (only once or on deep change)
    useEffect(() => {
        if (initialLayout && !hasInitialSync.current) {
            setLayout(initialLayout);
            setRemovedSeats(new Set(initialLayout.removedSeats || []));
            setDisabledSeats(new Set(initialLayout.disabledSeats || []));
            setHCorridors(initialLayout.hCorridors || {});
            setVCorridors(initialLayout.vCorridors || {});
            setSeatCategories(initialLayout.seatCategories || {});
            setLabels(initialLayout.labels || []);
            hasInitialSync.current = true;
        }
    }, [initialLayout]);

    // Label movement logic at window level for robustness
    useEffect(() => {
        if (!draggingLabel && !resizingLabel) return;

        const handleMouseMove = (e: globalThis.MouseEvent) => {
            if (!canvasRef.current) return;

            const rect = canvasRef.current.getBoundingClientRect();
            // Crucial: rect contains the scaled pixels, so we divide by zoomLevel to get logical pixels
            const logicalWidth = rect.width / zoomLevel;
            const logicalHeight = rect.height / zoomLevel;

            const mouseX = (e.clientX - rect.left) / zoomLevel;
            const mouseY = (e.clientY - rect.top) / zoomLevel;

            if (draggingLabel) {
                wasDragging.current = true;
                const xOffset = mouseX - (logicalWidth / 2);
                const yOffset = mouseY;

                setLabels(prev => prev.map(l =>
                    l.id === draggingLabel
                        ? { ...l, position: { x: Math.round(xOffset), y: Math.round(yOffset) }, isPixelBased: true }
                        : l
                ));
            }

            if (resizingLabel) {
                wasDragging.current = true;
                setLabels(prev => prev.map(l => {
                    if (l.id !== resizingLabel.id) return l;

                    const labelCenterX = (logicalWidth / 2) + l.position.x;
                    const labelCenterY = l.position.y;

                    if (resizingLabel.type === 'width') {
                        const dist = Math.abs(mouseX - labelCenterX);
                        return { ...l, width: Math.max(60, dist * 2) };
                    } else if (resizingLabel.type === 'height') {
                        const dist = Math.abs(mouseY - labelCenterY);
                        return { ...l, height: Math.max(24, dist * 2) };
                    }
                    return l;
                }));
            }
        };

        const handleMouseUp = () => {
            if (draggingLabel || resizingLabel) {
                // Keep wasDragging true for a short moment so onClick can see it
                setTimeout(() => { wasDragging.current = false; }, 50);
            }
            setDraggingLabel(null);
            setResizingLabel(null);
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('mouseup', handleMouseUp);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [draggingLabel, resizingLabel, zoomLevel]); // REMOVED labels from dependency!

    // Generate row labels (A, B, C, ...)
    const generateRowLabels = useCallback((count: number, prefix: string = ''): string[] => {
        return Array.from({ length: count }, (_, i) =>
            prefix + String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '')
        );
    }, []);

    // Get display order for rows based on stage position
    // Row 'A' should ALWAYS be the one closest to the stage.
    // If Stage is TOP: Rows are rendered A, B, C... (A is at index 0, at top)
    // If Stage is BOTTOM: Rows are rendered P, O, N... (A is at the bottom, closest to stage)
    const mainRowLabels = useMemo(() => {
        const labels = generateRowLabels(layout.mainFloor.rows);
        const isStageAtBottom = layout.stage.position?.toLowerCase() === 'bottom';
        return isStageAtBottom ? [...labels].reverse() : labels;
    }, [layout.mainFloor.rows, layout.stage.position, generateRowLabels]);

    const balconyRowLabels = useMemo(() => {
        const labels = generateRowLabels(layout.balcony.rows, 'BALC-');
        const isStageAtBottom = layout.stage.position?.toLowerCase() === 'bottom';
        return isStageAtBottom ? [...labels].reverse() : labels;
    }, [layout.balcony.rows, layout.stage.position, generateRowLabels]);

    // Handle seat click based on current tool
    const handleSeatClick = useCallback((row: string, seatNum: number, section: string, e: React.MouseEvent) => {
        if (isPreviewMode) return;

        const seatKey = `${section}-${row}-${seatNum}`;

        switch (currentTool) {
            case TOOLS.REMOVE:
                // Only allow removing if not disabled
                if (!disabledSeats.has(seatKey) && !removedSeats.has(seatKey)) {
                    saveToHistory();
                    setRemovedSeats(prev => {
                        const next = new Set(prev);
                        next.add(seatKey);
                        return next;
                    });
                }
                break;

            case TOOLS.DISABLE:
                // Toggle disabled state (permanently no seat, no + sign)
                saveToHistory();
                setDisabledSeats(prev => {
                    const next = new Set(prev);
                    if (next.has(seatKey)) {
                        next.delete(seatKey);
                    } else {
                        next.add(seatKey);
                        // Also remove from removed seats if it was there
                        setRemovedSeats(r => {
                            const nr = new Set(r);
                            nr.delete(seatKey);
                            return nr;
                        });
                    }
                    return next;
                });
                break;



            case TOOLS.SELECT:
            default:
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
                break;
        }
    }, [isPreviewMode, currentTool]);

    // Bulk remove selected seats
    const removeSelectedSeats = useCallback(() => {
        saveToHistory();
        setRemovedSeats(prev => new Set([...prev, ...selectedSeats]));
        setSelectedSeats(new Set());
    }, [selectedSeats, saveToHistory]);

    // Restore selected seats
    const restoreSelectedSeats = useCallback(() => {
        saveToHistory();
        setRemovedSeats(prev => {
            const next = new Set(prev);
            selectedSeats.forEach(key => next.delete(key));
            return next;
        });
        setSelectedSeats(new Set());
    }, [selectedSeats, saveToHistory]);

    // Toggle horizontal corridor (between rows)
    const toggleHCorridor = useCallback((section: string, rowIndex: number, e: { altKey?: boolean } | null = null) => {
        const corridorKey = `${section}-h-${rowIndex}`;
        const isRemoveAction = currentTool === TOOLS.REMOVE || (e?.altKey);

        saveToHistory();
        setHCorridors(prev => {
            const next = { ...prev };
            const currentCount = next[corridorKey] || 0;

            if (isRemoveAction) {
                if (currentCount > 0) {
                    next[corridorKey] = currentCount - 1;
                    if (next[corridorKey] === 0) delete next[corridorKey];
                }
            } else {
                next[corridorKey] = currentCount + 1;
            }
            return next;
        });
    }, [currentTool, saveToHistory]);

    // Toggle vertical corridor (between columns)
    const toggleVCorridor = useCallback((section: string, colIndex: number, e: { altKey?: boolean } | null = null) => {
        const corridorKey = `${section}-v-${colIndex}`;
        const isRemoveAction = currentTool === TOOLS.REMOVE || (e?.altKey);

        saveToHistory();
        setVCorridors(prev => {
            const next = { ...prev };

            // Correction for colIndex 0 key consistency
            const key = corridorKey; // Use the generated key directly
            const count = next[key] || 0;

            if (isRemoveAction) {
                if (count > 0) {
                    next[key] = count - 1;
                    if (next[key] === 0) delete next[key];
                }
            } else {
                next[key] = count + 1;
            }
            return next;
        });
    }, [currentTool]);

    // Check if row has a horizontal corridor after it
    const hasHCorridorAfter = useCallback((section: string, rowIndex: number): boolean => {
        return (hCorridors[`${section}-h-${rowIndex}`] || 0) > 0;
    }, [hCorridors]);

    // Check if column has a vertical corridor after it
    const hasVCorridorAfter = useCallback((section: string, colIndex: number): boolean => {
        return (vCorridors[`${section}-v-${colIndex}`] || 0) > 0;
    }, [vCorridors]);

    // Get count for corridors
    const getHCorridorCount = useCallback((section: string, rowIndex: number): number => {
        return hCorridors[`${section}-h-${rowIndex}`] || 0;
    }, [hCorridors]);

    const getVCorridorCount = useCallback((section: string, colIndex: number): number => {
        return vCorridors[`${section}-v-${colIndex}`] || 0;
    }, [vCorridors]);

    // Handle layout changes
    const updateMainFloor = useCallback((key: keyof FloorConfig, value: number | number[]) => {
        saveToHistory();
        setLayout(prev => ({
            ...prev,
            mainFloor: { ...prev.mainFloor, [key]: value }
        }));
    }, [saveToHistory]);

    const updateBalcony = useCallback((key: keyof FloorConfig, value: number | number[]) => {
        saveToHistory();
        setLayout(prev => ({
            ...prev,
            balcony: { ...prev.balcony, [key]: value }
        }));
    }, [saveToHistory]);

    const updateStage = useCallback((key: keyof StageConfig, value: string | number) => {
        saveToHistory();
        setLayout(prev => ({
            ...prev,
            stage: { ...prev.stage, [key]: value }
        }));
    }, [saveToHistory]);

    // Drag and drop handlers
    const handleDragStart = useCallback((e: MouseEvent | TouchEvent | PointerEvent, seatKey: string) => {
        if (currentTool !== TOOLS.SELECT) return;
        setDraggedSeat(seatKey);
        // Framer Motion handles the drag visually
    }, [currentTool]);

    const handleDragOver = useCallback((e: React.DragEvent, seatKey: string) => {
        e.preventDefault();
        if (draggedSeat && seatKey !== draggedSeat && removedSeats.has(seatKey)) {
            setDragOverTarget(seatKey);
        }
    }, [draggedSeat, removedSeats]);

    const handleDrop = useCallback((e: React.DragEvent, targetKey: string) => {
        e.preventDefault();
        if (draggedSeat && targetKey !== draggedSeat && removedSeats.has(targetKey)) {
            saveToHistory();
            setRemovedSeats(prev => {
                const next = new Set(prev);
                next.add(draggedSeat);
                next.delete(targetKey);
                return next;
            });
        }
        setDraggedSeat(null);
        setDragOverTarget(null);
    }, [draggedSeat, removedSeats, saveToHistory]);

    const handleDragEnd = useCallback(() => {
        setDraggedSeat(null);
        setDragOverTarget(null);
    }, []);

    // Calculate total active seats
    const totalSeats = useMemo(() => {
        let mainSeats = layout.mainFloor.rows * layout.mainFloor.seatsPerRow;
        let balconySeats = layout.hasBalcony
            ? layout.balcony.rows * layout.balcony.seatsPerRow
            : 0;
        const totalPossible = mainSeats + balconySeats;
        const removed = removedSeats.size;
        const disabled = disabledSeats.size;
        return totalPossible - removed - disabled;
    }, [layout, removedSeats, disabledSeats]);

    // Handle save
    const handleSave = useCallback(() => {
        const seatConfigArray: SeatConfig[] = [];

        mainRowLabels.forEach((rowLabel) => {
            for (let s = 1; s <= layout.mainFloor.seatsPerRow; s++) {
                const seatKey = `main-${rowLabel}-${s}`;
                if (!removedSeats.has(seatKey)) {
                    seatConfigArray.push({
                        section: 'main',
                        row: rowLabel,
                        seatNumber: s,
                        seatType: seatCategories[seatKey] || 'standard',
                        isActive: !disabledSeats.has(seatKey)
                    });
                }
            }
        });

        if (layout.hasBalcony) {
            balconyRowLabels.forEach((rowLabel) => {
                for (let s = 1; s <= layout.balcony.seatsPerRow; s++) {
                    const seatKey = `balcony-${rowLabel}-${s}`;
                    if (!removedSeats.has(seatKey)) {
                        seatConfigArray.push({
                            section: 'balcony',
                            row: rowLabel,
                            seatNumber: s,
                            seatType: seatCategories[seatKey] || 'standard',
                            isActive: !disabledSeats.has(seatKey)
                        });
                    }
                }
            });
        }

        onSave?.({
            layout: {
                ...layout,
                seatCategories // Include this so it can be reloaded later
            },
            seatConfig: seatConfigArray,
            removedSeats: Array.from(removedSeats),
            disabledSeats: Array.from(disabledSeats),
            hCorridors,
            vCorridors,
            labels: labels,
            totalSeats
        });
    }, [layout, removedSeats, disabledSeats, hCorridors, vCorridors, labels, totalSeats, onSave, mainRowLabels, balconyRowLabels, seatCategories]);

    // Label management
    const addLabel = useCallback((position: { x: number; y: number }) => {
        setEditingLabel({
            id: Date.now(),
            text: '',
            position: position,
            isNew: true,
            section: activeSection // Assign to current section when creating
        });
        setNewLabelText('');
        setSelectedLabelPreset(null);
        setShowLabelModal(true);
    }, []);

    const saveLabel = useCallback(() => {
        if (!editingLabel) return;

        const labelText = selectedLabelPreset?.text === 'CUSTOM'
            ? newLabelText
            : (selectedLabelPreset?.text || newLabelText);

        if (!labelText.trim()) return;

        saveToHistory();
        const labelData: TheaterLabel = {
            id: editingLabel.id,
            text: labelText.trim(),
            icon: selectedLabelPreset?.icon || '📍',
            position: editingLabel.position,
            section: editingLabel.section || activeSection // Use existing section or current active section
        };

        if (editingLabel.isNew) {
            setLabels(prev => [...prev, labelData]);
        } else {
            setLabels(prev => prev.map(l => l.id === editingLabel.id ? { ...labelData, section: l.section || activeSection } : l));
        }

        setShowLabelModal(false);
        setEditingLabel(null);
        setNewLabelText('');
        setSelectedLabelPreset(null);
    }, [editingLabel, newLabelText, selectedLabelPreset, saveToHistory, activeSection]);

    const deleteLabel = useCallback((labelId: number) => {
        saveToHistory();
        setLabels(prev => prev.filter(l => l.id !== labelId));
        setShowLabelModal(false);
        setEditingLabel(null);
    }, [saveToHistory]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (currentTool !== TOOLS.LABEL) return;

        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        saveToHistory();
        addLabel({ x, y });
    }, [currentTool, addLabel, saveToHistory]);

    const handleLabelClick = useCallback((label: TheaterLabel, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingLabel(label);
        setNewLabelText(label.text);
        setSelectedLabelPreset(LABEL_PRESETS.find(p => p.text === label.text) || null);
        setShowLabelModal(true);
    }, []);

    // Render single seat with optional vertical corridor after it
    const renderSeat = (row: string, seatNum: number, section: string, seatsPerRow: number): React.ReactNode => {
        const seatKey = `${section}-${row}-${seatNum}`;
        const isDisabled = disabledSeats.has(seatKey);
        const isRemoved = removedSeats.has(seatKey);
        const isSelected = selectedSeats.has(seatKey);
        const isDragOver = dragOverTarget === seatKey;

        let seatElement;

        if (isDisabled) {
            // Disabled slot - no chair can be placed here, no + sign
            seatElement = (
                <div
                    key={seatKey}
                    className={`seat-slot disabled ${currentTool === TOOLS.DISABLE ? 'can-enable' : ''}`}
                    onClick={(e) => handleSeatClick(row, seatNum, section, e)}
                    title={currentTool === TOOLS.DISABLE ? `Click to enable this slot` : `Disabled - no seat here`}
                >
                    <FiX className="disabled-icon" />
                </div>
            );
        } else if (isRemoved) {
            // Removed seat - can be restored with + sign
            seatElement = (
                <div
                    key={seatKey}
                    className={`seat-slot empty clickable ${isDragOver ? 'drag-over' : ''}`}
                    onDragOver={(e) => handleDragOver(e, seatKey)}
                    onDrop={(e) => handleDrop(e, seatKey)}
                    onClick={() => {
                        // Restore seat ONLY when Restore tool is active
                        if (currentTool === TOOLS.RESTORE) {
                            saveToHistory();
                            setRemovedSeats(prev => {
                                const next = new Set(prev);
                                next.delete(seatKey);
                                return next;
                            });
                        }
                    }}
                    title={`Click to create/restore seat ${row}${seatNum}`}
                >
                    {currentTool === TOOLS.RESTORE && (
                        <div className="plus-sign-forced">
                            <FiPlus />
                        </div>
                    )}
                </div>
            );
        } else {
            // Normal seat - use seatCategoryMap in category mode, otherwise internal seatCategories
            const category = isCategoryMode
                ? (seatCategoryMap[seatKey] || SEAT_TYPES.STANDARD)
                : (seatCategories[seatKey] || SEAT_TYPES.STANDARD);

            const handleClick = (e: React.MouseEvent) => {
                if (isCategoryMode && onSeatClick) {
                    onSeatClick(section, row, seatNum);
                } else {
                    handleSeatClick(row, seatNum, section, e);
                }
            };

            seatElement = (
                <motion.div
                    key={seatKey}
                    className={`seat ${category} ${isSelected ? 'selected' : ''} ${currentTool === TOOLS.REMOVE ? 'remove-mode' : ''} ${currentTool === TOOLS.DISABLE ? 'disable-mode' : ''} ${isCategoryMode ? 'category-mode' : ''}`}
                    onClick={handleClick}
                    draggable={!isCategoryMode && currentTool === TOOLS.SELECT}
                    onDragStart={(e) => handleDragStart(e as unknown as MouseEvent | TouchEvent | PointerEvent, seatKey)}
                    onDragEnd={handleDragEnd}
                    whileTap={{ scale: 0.95 }}
                    title={`${row}${seatNum} - ${category.toUpperCase()} ${isCategoryMode ? `Click to set ${currentCategory}` : (currentTool === TOOLS.REMOVE ? 'Click to remove' : currentTool === TOOLS.DISABLE ? 'Click to disable' : '')}`}
                >
                    <span className="seat-number">{seatNum}</span>
                </motion.div>
            );
        }

        const vCount = getVCorridorCount(section, seatNum);

        // Render multiple vertical corridor spaces if count > 0
        const vCorridorSpaces = Array.from({ length: vCount }).map((_, i) => (
            <div
                key={`vcor-${seatKey}-${i}`}
                className={`v-corridor-space ${currentTool === TOOLS.REMOVE ? 'remove-mode' : ''}`}
                onClick={(e) => {
                    if (currentTool === TOOLS.REMOVE) {
                        e.stopPropagation();
                        toggleVCorridor(section, seatNum, e);
                    }
                }}
                title={currentTool === TOOLS.REMOVE ? "Click to remove corridor segment" : "Corridor"}
            />
        ));

        // If vertical corridor tool is active, show toggle buttons between seats or after last seat
        const vCorridorToggle = !isPreviewMode && currentTool === TOOLS.CORRIDOR_V && seatNum <= seatsPerRow ? (
            <button
                key={`vcor-btn-${seatKey}`}
                className={`v-corridor-toggle ${vCount > 0 ? 'active' : ''}`}
                onClick={(e) => toggleVCorridor(section, seatNum, e)}
                onContextMenu={(e) => { e.preventDefault(); toggleVCorridor(section, seatNum, { altKey: true }); }}
                title={`Add/Remove corridor (Current: ${vCount}). Click to add, Alt+Click to remove.`}
            >
                {vCount > 0 ? vCount : '|'}
            </button>
        ) : null;

        return (
            <React.Fragment key={`seat-wrapper-${seatKey}`}>
                {seatElement}
                {vCorridorSpaces}
                {vCorridorToggle}
            </React.Fragment>
        );
    };

    // Helper to render horizontal corridor slots (before or after rows)
    const renderHCorridorSlot = (section: string, rowIndex: number): React.ReactNode => {
        const count = getHCorridorCount(section, rowIndex);
        const isToolActive = currentTool === TOOLS.CORRIDOR_H;

        return (
            <React.Fragment key={`h-slot-${section}-${rowIndex}`}>
                {!isPreviewMode && isToolActive && (
                    <div className="h-corridor-slot-toggle">
                        <button
                            className={`h-corridor-toggle ${count > 0 ? 'active' : ''}`}
                            onClick={(e) => toggleHCorridor(section, rowIndex, e)}
                            onContextMenu={(e) => { e.preventDefault(); toggleHCorridor(section, rowIndex, { altKey: true }); }}
                            title={`Click to add corridor segment, Alt+Click to remove. Current: ${count}`}
                        >
                            {count > 0 ? `═ ${count}` : '═══'}
                        </button>
                    </div>
                )}
                {Array.from({ length: count }).map((_, i) => (
                    <div
                        key={`h-corr-${section}-${rowIndex}-${i}`}
                        className={`h-corridor-space ${currentTool === TOOLS.REMOVE ? 'remove-mode' : ''}`}
                        onClick={(e) => {
                            if (currentTool === TOOLS.REMOVE) {
                                e.stopPropagation();
                                toggleHCorridor(section, rowIndex, e);
                            }
                        }}
                        title={currentTool === TOOLS.REMOVE ? "Click to remove corridor segment" : "Corridor"}
                    >
                        <span className="corridor-label">CORRIDOR</span>
                    </div>
                ))}
            </React.Fragment>
        );
    };

    // Render row with horizontal corridor option
    const renderRow = (rowLabel: string, rowIndex: number, seatsPerRow: number, section: string, totalRows: number): React.ReactNode => {
        const seats: React.ReactNode[] = [];

        // Vertical corridor BEFORE first seat (col 0)
        const vCount0 = getVCorridorCount(section, 0);
        const vSpaces0 = Array.from({ length: vCount0 }).map((_, i) => (
            <div
                key={`vcor-${section}-${rowIndex}-pre-${i}`}
                className={`v-corridor-space ${currentTool === TOOLS.REMOVE ? 'remove-mode' : ''}`}
                onClick={(e) => {
                    if (currentTool === TOOLS.REMOVE) {
                        e.stopPropagation();
                        toggleVCorridor(section, 0, e);
                    }
                }}
                title={currentTool === TOOLS.REMOVE ? "Click to remove corridor segment" : "Corridor"}
            />
        ));
        const vToggle0 = !isPreviewMode && currentTool === TOOLS.CORRIDOR_V ? (
            <button
                key={`vcor-btn-${section}-${rowIndex}-pre`}
                className={`v-corridor-toggle ${vCount0 > 0 ? 'active' : ''}`}
                onClick={(e) => toggleVCorridor(section, 0, e)}
                onContextMenu={(e) => { e.preventDefault(); toggleVCorridor(section, 0, { altKey: true }); }}
                title={`Add/Remove corridor before first seat (Current: ${vCount0})`}
            >
                {vCount0 > 0 ? vCount0 : '|'}
            </button>
        ) : null;

        seats.push(
            <React.Fragment key={`v-pre-${section}-${rowIndex}`}>
                {vSpaces0}
                {vToggle0}
            </React.Fragment>
        );

        for (let s = 1; s <= seatsPerRow; s++) {
            seats.push(renderSeat(rowLabel, s, section, seatsPerRow));
        }

        return (
            <React.Fragment key={`${section}-${rowLabel}`}>
                <div className="seat-row">
                    {isCategoryMode && onRowClick ? (
                        <button
                            className="row-label row-label-btn"
                            onClick={() => onRowClick(section, rowLabel, seatsPerRow)}
                            title={`Click to set entire row ${rowLabel} to ${currentCategory}`}
                        >
                            {rowLabel}
                        </button>
                    ) : (
                        <div className="row-label">{rowLabel}</div>
                    )}
                    <div className="seats-container">
                        {seats}
                    </div>
                    {isCategoryMode && onRowClick ? (
                        <button
                            className="row-label row-label-btn"
                            onClick={() => onRowClick(section, rowLabel, seatsPerRow)}
                            title={`Click to set entire row ${rowLabel} to ${currentCategory}`}
                        >
                            {rowLabel}
                        </button>
                    ) : (
                        <div className="row-label">{rowLabel}</div>
                    )}
                </div>
                {renderHCorridorSlot(section, rowIndex)}
            </React.Fragment>
        );
    };

    return (
        <div className="theater-designer">
            {/* Toolbar */}
            {!isPreviewMode && (
                <motion.div
                    className="designer-toolbar"
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                >
                    <div className="toolbar-section">
                        <button
                            className={`toolbar-btn ${showSettings ? 'active' : ''}`}
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <FiSettings />
                            <span>Settings</span>
                        </button>
                        <button
                            className="toolbar-btn"
                            onClick={() => {
                                saveToHistory();
                                setLayout(prev => ({ ...prev, hasBalcony: !prev.hasBalcony }));
                            }}
                        >
                            <FiLayers />
                            <span>{layout.hasBalcony ? 'Remove Balcony' : 'Add Balcony'}</span>
                        </button>
                    </div>

                    <div className="toolbar-section history-controls">
                        <button
                            className="toolbar-btn undo-btn"
                            onClick={undo}
                            disabled={history.length === 0}
                            title="Undo (Ctrl+Z)"
                        >
                            <FiRotateCcw />
                        </button>
                        <button
                            className="toolbar-btn redo-btn"
                            onClick={redo}
                            disabled={redoStack.length === 0}
                            title="Redo (Ctrl+Y)"
                        >
                            <FiRotateCw />
                        </button>
                    </div>

                    <div className="toolbar-section tool-selector">
                        <span className="toolbar-label">Tool:</span>
                        <button
                            className={`tool-btn ${currentTool === TOOLS.SELECT ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.SELECT)}
                            title="Select & Move seats"
                        >
                            <FiMove /> Select
                        </button>
                        <button
                            className={`tool-btn danger ${currentTool === TOOLS.REMOVE ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.REMOVE)}
                            title="Remove seats"
                        >
                            <FiTrash2 /> Remove
                        </button>
                        <button
                            className={`tool-btn danger ${currentTool === TOOLS.DISABLE ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.DISABLE)}
                            title="Disable seat slots permanently (no chair can be placed)"
                        >
                            <FiX /> Disable
                        </button>
                        <button
                            className={`tool-btn ${currentTool === TOOLS.CORRIDOR_H ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.CORRIDOR_H)}
                            title="Add horizontal corridors (between rows)"
                        >
                            ═ H-Corridor
                        </button>
                        <button
                            className={`tool-btn ${currentTool === TOOLS.CORRIDOR_V ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.CORRIDOR_V)}
                            title="Add vertical corridors (between columns)"
                        >
                            ║ V-Corridor
                        </button>
                        <button
                            className={`tool-btn ${currentTool === TOOLS.LABEL ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.LABEL)}
                            title="Add labels (Entry, Sound, Lights, etc.)"
                        >
                            📍 Label
                        </button>
                        <button
                            className={`tool-btn success ${currentTool === TOOLS.RESTORE ? 'active' : ''}`}
                            onClick={() => setCurrentTool(TOOLS.RESTORE)}
                            title="Restore removed chairs (Click on + slots)"
                        >
                            <FiPlus /> Restore
                        </button>
                    </div>



                    <div className="toolbar-section">
                        {selectedSeats.size > 0 && (
                            <>
                                <button className="toolbar-btn danger" onClick={removeSelectedSeats}>
                                    <FiTrash2 />
                                    Remove ({selectedSeats.size})
                                </button>
                                <button className="toolbar-btn" onClick={restoreSelectedSeats}>
                                    <FiPlus />
                                    Restore
                                </button>
                            </>
                        )}
                        <button className="toolbar-btn success" onClick={handleSave}>
                            <FiSave />
                            <span>Save</span>
                        </button>
                    </div>

                    <div className="toolbar-section zoom-controls">
                        <button onClick={() => setZoomLevel(z => Math.max(0.5, z - 0.1))} title="Zoom Out">
                            <FiMinimize2 />
                        </button>
                        <span className="zoom-value" onClick={handleAutoFit} title="Click to Auto-Fit">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button onClick={() => setZoomLevel(z => Math.min(2, z + 0.1))} title="Zoom In">
                            <FiMaximize2 />
                        </button>
                        <button
                            className="tool-btn mini-tool"
                            onClick={handleAutoFit}
                            title="Fit to View"
                        >
                            <FiMaximize />
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Settings Panel */}
            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="settings-panel"
                        initial={{ x: -300, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -300, opacity: 0 }}
                    >
                        <div className="settings-header">
                            <h3>Theater Settings</h3>
                            <button
                                className="close-settings-btn"
                                onClick={() => setShowSettings(false)}
                                title="Close settings"
                            >
                                <FiX />
                            </button>
                        </div>

                        <div className="settings-group">
                            <h4>Stage</h4>
                            <label>
                                Position
                                <select
                                    value={layout.stage.position}
                                    onChange={(e) => updateStage('position', e.target.value)}
                                >
                                    <option value="top">Top</option>
                                    <option value="bottom">Bottom</option>
                                </select>
                            </label>
                            <label>
                                Width: {layout.stage.width}%
                                <input
                                    type="range"
                                    min="20" max="100"
                                    value={layout.stage.width}
                                    onChange={(e) => updateStage('width', parseInt(e.target.value))}
                                />
                            </label>
                        </div>

                        <div className="settings-group">
                            <h4>Main Floor</h4>
                            <label>
                                Rows
                                <div className="number-input">
                                    <button onClick={() => updateMainFloor('rows', Math.max(1, layout.mainFloor.rows - 1))}>
                                        <FiMinus />
                                    </button>
                                    <span>{layout.mainFloor.rows}</span>
                                    <button onClick={() => updateMainFloor('rows', Math.min(50, layout.mainFloor.rows + 1))}>
                                        <FiPlus />
                                    </button>
                                </div>
                            </label>
                            <label>
                                Seats per Row
                                <div className="number-input">
                                    <button onClick={() => updateMainFloor('seatsPerRow', Math.max(1, layout.mainFloor.seatsPerRow - 1))}>
                                        <FiMinus />
                                    </button>
                                    <span>{layout.mainFloor.seatsPerRow}</span>
                                    <button onClick={() => updateMainFloor('seatsPerRow', Math.min(50, layout.mainFloor.seatsPerRow + 1))}>
                                        <FiPlus />
                                    </button>
                                </div>
                            </label>
                        </div>

                        {layout.hasBalcony && (
                            <div className="settings-group">
                                <h4>Balcony</h4>
                                <label>
                                    Rows
                                    <div className="number-input">
                                        <button onClick={() => updateBalcony('rows', Math.max(1, layout.balcony.rows - 1))}>
                                            <FiMinus />
                                        </button>
                                        <span>{layout.balcony.rows}</span>
                                        <button onClick={() => updateBalcony('rows', Math.min(20, layout.balcony.rows + 1))}>
                                            <FiPlus />
                                        </button>
                                    </div>
                                </label>
                                <label>
                                    Seats per Row
                                    <div className="number-input">
                                        <button onClick={() => updateBalcony('seatsPerRow', Math.max(1, layout.balcony.seatsPerRow - 1))}>
                                            <FiMinus />
                                        </button>
                                        <span>{layout.balcony.seatsPerRow}</span>
                                        <button onClick={() => updateBalcony('seatsPerRow', Math.min(50, layout.balcony.seatsPerRow + 1))}>
                                            <FiPlus />
                                        </button>
                                    </div>
                                </label>
                            </div>
                        )}

                        <div className="settings-summary">
                            <FiGrid />
                            <span>Active Seats: <strong>{totalSeats}</strong></span>
                        </div>

                        {removedSeats.size > 0 && (
                            <div className="settings-info">
                                <span>{removedSeats.size} seats removed</span>
                            </div>
                        )}

                        {Object.keys(hCorridors).length > 0 || Object.keys(vCorridors).length > 0 ? (
                            <div className="settings-info">
                                <span>
                                    {Object.keys(hCorridors).length > 0 && `${Object.values(hCorridors).reduce((a, b) => a + b, 0)} H-corridor segments`}
                                    {Object.keys(hCorridors).length > 0 && Object.keys(vCorridors).length > 0 && ', '}
                                    {Object.keys(vCorridors).length > 0 && `${Object.values(vCorridors).reduce((a, b) => a + b, 0)} V-corridor segments`}
                                </span>
                            </div>
                        ) : null}

                        {/* Done Button */}
                        <button
                            className="done-settings-btn"
                            onClick={() => setShowSettings(false)}
                        >
                            <FiCheck /> Done with Settings
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Theater Frame */}
            <div className="theater-frame">
                {/* Section Switcher Header */}
                <div className="theater-frame-header">
                    <button
                        className={`section-switcher-btn ${activeSection === 'main' ? 'active' : ''}`}
                        onClick={() => setActiveSection('main')}
                    >
                        <FiGrid />
                        <span>MAIN FLOOR</span>
                    </button>
                    {layout.hasBalcony && (
                        <button
                            className={`section-switcher-btn ${activeSection === 'balcony' ? 'active' : ''}`}
                            onClick={() => setActiveSection('balcony')}
                        >
                            <FiChevronsUp />
                            <span>BALCONY</span>
                        </button>
                    )}
                </div>

                <div className="theater-canvas-container">
                    {/* Theater Canvas */}
                    <div
                        ref={canvasRef}
                        className={`theater-canvas ${currentTool === TOOLS.LABEL ? 'label-mode' : ''} ${draggingLabel ? 'dragging-label' : ''}`}
                        style={{ transform: `scale(${zoomLevel})` }}
                        onClick={handleCanvasClick}
                        onMouseUp={() => {
                            setDraggingLabel(null);
                            setResizingLabel(null);
                        }}
                    >
                        {/* Stage at top */}
                        {layout.stage.position === 'top' && (
                            <motion.div
                                className="stage stage-top"
                                style={{ width: `${layout.stage.width}%` }}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <FiChevronsUp className="stage-icon" />
                                <span>STAGE</span>
                            </motion.div>
                        )}

                        {/* Render only the active section */}
                        <AnimatePresence mode="wait">
                            {activeSection === 'main' && (
                                <motion.div
                                    key="main-section"
                                    className="section main-section"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="seats-grid">
                                        {renderHCorridorSlot('main', -1)}
                                        {mainRowLabels.map((rowLabel, idx) =>
                                            renderRow(
                                                rowLabel,
                                                idx,
                                                layout.mainFloor.seatsPerRow,
                                                'main',
                                                layout.mainFloor.rows
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeSection === 'balcony' && layout.hasBalcony && (
                                <motion.div
                                    key="balcony-section"
                                    className="section balcony-section"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <div className="seats-grid">
                                        {renderHCorridorSlot('balcony', -1)}
                                        {balconyRowLabels.map((rowLabel, idx) =>
                                            renderRow(
                                                rowLabel,
                                                idx,
                                                layout.balcony.seatsPerRow,
                                                'balcony',
                                                layout.balcony.rows
                                            )
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Stage at bottom */}
                        {layout.stage.position === 'bottom' && (
                            <motion.div
                                className="stage stage-bottom"
                                style={{ width: `${layout.stage.width}%` }}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                <span>STAGE</span>
                                <FiChevronsDown className="stage-icon" />
                            </motion.div>
                        )}

                        {/* Dedicated Labels Overlay - MUST BE INSIDE CANVAS for correct scaling */}
                        <div className="labels-overlay">
                            {labels.filter(label => (label.section || 'main') === activeSection).map(label => {
                                const isEntry = label.text?.toUpperCase().includes('ENTRY');
                                const isExit = label.text?.toUpperCase().includes('EXIT');

                                return (
                                    <motion.div
                                        key={label.id}
                                        className={`theater-label ${showLabelAccents ? 'has-accent' : ''} ${draggingLabel === label.id ? 'dragging' : ''} ${(currentTool === TOOLS.LABEL || allowLabelDragging) ? 'interactive' : ''} ${currentTool === TOOLS.REMOVE ? 'remove-mode' : ''} ${showLabelAccents && isEntry ? 'label-entry' : ''} ${showLabelAccents && isExit ? 'label-exit' : ''}`}
                                        style={{
                                            left: label.isPixelBased
                                                ? `calc(50% + ${label.position.x}px)`
                                                : `${label.position.x}%`,
                                            top: label.isPixelBased
                                                ? `${label.position.y}px`
                                                : `${label.position.y}%`,
                                            width: label.width || 'auto',
                                            height: label.height || 'auto',
                                            minWidth: label.width ? undefined : 'auto'
                                        }}
                                        initial={{ scale: 0 }}
                                        animate={{ scale: draggingLabel === label.id ? 1.05 : 1 }}
                                        whileHover={{ scale: draggingLabel ? 1 : 1.05 }}
                                        onMouseDown={(e) => {
                                            // Normal editing mode
                                            if (!isCategoryMode && !isPreviewMode) {
                                                if (e.button === 0 && currentTool !== TOOLS.REMOVE) {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    if (!draggingLabel) saveToHistory();
                                                    wasDragging.current = false;
                                                    setDraggingLabel(label.id);
                                                }
                                            }
                                            // Handle interaction mode (even in category/preview mode)
                                            else if (allowLabelDragging && e.button === 0) {
                                                e.stopPropagation();
                                                e.preventDefault();
                                                wasDragging.current = false;
                                                setDraggingLabel(label.id);
                                            }
                                        }}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (currentTool === TOOLS.REMOVE && !isCategoryMode && !isPreviewMode) {
                                                deleteLabel(label.id);
                                            }
                                        }}
                                    >
                                        {label.icon && <span className="label-icon">{label.icon}</span>}
                                        <span className="label-text">{label.text}</span>

                                        {/* Resize Handles - Show on hover via CSS, disable in remove mode and category/preview mode */}
                                        {((currentTool !== TOOLS.REMOVE && !isCategoryMode && !isPreviewMode) || allowLabelDragging) && (
                                            <>
                                                <div
                                                    className="label-resize-handle label-resize-width"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        if (!isPreviewMode) saveToHistory();
                                                        setResizingLabel({ id: label.id, type: 'width' });
                                                    }}
                                                    title="Resize Width"
                                                />
                                                <div
                                                    className="label-resize-handle label-resize-height"
                                                    onMouseDown={(e) => {
                                                        e.stopPropagation();
                                                        if (!isPreviewMode) saveToHistory();
                                                        setResizingLabel({ id: label.id, type: 'height' });
                                                    }}
                                                    title="Resize Height"
                                                />
                                            </>
                                        )}

                                        {draggingLabel === label.id && (
                                            <div className="label-drag-handle">
                                                <FiMove />
                                            </div>
                                        )}
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Label Modal */}
                <AnimatePresence>
                    {showLabelModal && (
                        <motion.div
                            className="label-modal-overlay"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowLabelModal(false)}
                        >
                            <motion.div
                                className="label-modal"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="label-modal-header">
                                    <h3>{editingLabel?.isNew ? 'Add Label' : 'Edit Label'}</h3>
                                    <button
                                        className="close-modal-btn"
                                        onClick={() => setShowLabelModal(false)}
                                    >
                                        <FiX />
                                    </button>
                                </div>

                                <div className="label-presets">
                                    <p>Select a preset:</p>
                                    <div className="preset-grid">
                                        {LABEL_PRESETS.map(preset => (
                                            <button
                                                key={preset.text}
                                                className={`preset-btn ${selectedLabelPreset?.text === preset.text ? 'active' : ''}`}
                                                onClick={() => {
                                                    setSelectedLabelPreset(preset);
                                                    if (preset.text !== 'CUSTOM') {
                                                        setNewLabelText(preset.text);
                                                    }
                                                }}
                                            >
                                                <span className="preset-icon">{preset.icon}</span>
                                                <span className="preset-text">{preset.text}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedLabelPreset?.text === 'CUSTOM' && (
                                    <div className="custom-label-input">
                                        <label>Custom Text:</label>
                                        <input
                                            type="text"
                                            value={newLabelText}
                                            onChange={(e) => setNewLabelText(e.target.value)}
                                            placeholder="Enter label text..."
                                            autoFocus
                                        />
                                    </div>
                                )}

                                <div className="label-modal-actions">
                                    {!editingLabel?.isNew && (
                                        <button
                                            className="delete-label-btn"
                                            onClick={() => editingLabel && deleteLabel(editingLabel.id)}
                                        >
                                            <FiTrash2 /> Delete
                                        </button>
                                    )}
                                    <button
                                        className="cancel-btn"
                                        onClick={() => setShowLabelModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="save-label-btn"
                                        onClick={saveLabel}
                                        disabled={!selectedLabelPreset && !newLabelText.trim()}
                                    >
                                        <FiCheck /> Save
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Legend */}
                <div className="designer-legend">
                    <div className="legend-item">
                        <div className="legend-color standard" />
                        <span>Standard</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color vip" />
                        <span>VIP</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color premium" />
                        <span>Premium</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color wheelchair" />
                        <span>Wheelchair</span>
                    </div>
                    <div className="legend-item">
                        <div className="empty-slot-legend">
                            <div className="plus-sign-forced mini">
                                <FiPlus />
                            </div>
                        </div>
                        <span>Empty Slot (Click to Create)</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color selected" />
                        <span>Selected</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color h-corridor" />
                        <span>H-Corridor</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color v-corridor" />
                        <span>V-Corridor</span>
                    </div>
                    <div className="legend-item">
                        <span className="legend-icon">📍</span>
                        <span>Label</span>
                    </div>
                </div>

                {/* Instructions */}
                {!isPreviewMode && (
                    <div className="designer-instructions">
                        <p>
                            <strong>Select:</strong> Click seats, drag to move.
                            <strong> Remove:</strong> Click chairs to remove. Click <strong>(+)</strong> slots to create/restore.
                            <strong> H-Corridor:</strong> Click row button for walkway.
                            <strong> V-Corridor:</strong> Click for vertical aisles. Alt+Click to remove.
                            <strong> Label:</strong> Click on canvas to add labels.
                        </p>
                        <p className="info-text">
                            <em>Tip: Use <strong>Alt+Click</strong> on any corridor toggle to reduce its segments quickly. You can now add corridors before the first row/column and after the last!</em>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheaterDesigner;
