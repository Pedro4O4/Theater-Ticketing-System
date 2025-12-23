"use client";
import React, { useState, useEffect, useMemo } from 'react';
import api from '@/services/api';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCalendar, FiUsers, FiGrid, FiSearch, FiX, FiCheck, FiXCircle, FiClock, FiEye, FiRefreshCw, FiAlertCircle, FiTrendingUp } from 'react-icons/fi';
import { toast } from 'react-toastify';
import EventCard from '@/components/Event Components/EventCard';
import { ProtectedRoute } from '@/auth/ProtectedRoute';
import { Event } from '@/types/event';
import '@/components/Event Components/AdminEventsPage.css';

const AdminEventsPage = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeFilter, setActiveFilter] = useState<'pending' | 'approved' | 'declined'>('pending');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await api.get<any>(`/event/all`);
            const data = response.data.success ? response.data.data : response.data;
            setEvents(Array.isArray(data) ? data : []);
        } catch (err: any) {
            setError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredEvents = useMemo(() => {
        let filtered = events.filter(event => (event.status as any) === activeFilter);
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(event => event.title?.toLowerCase().includes(query) || event.location?.toLowerCase().includes(query));
        }
        return filtered;
    }, [events, activeFilter, searchQuery]);

    const stats = useMemo(() => ({
        pending: events.filter(e => e.status === 'pending').length,
        approved: events.filter(e => e.status === 'approved').length,
        declined: events.filter(e => e.status === 'declined').length,
        total: events.length
    }), [events]);

    const handleStatusChange = async (eventId: string, newStatus: string) => {
        try {
            await api.put(`/event/${eventId}/`, { status: newStatus });
            setEvents(events.map(event => event._id === eventId ? { ...event, status: newStatus as any } : event));
            toast.success(`Event ${newStatus === 'approved' ? 'approved' : 'declined'} successfully`);
        } catch (err: any) {
            const errorMessage = err.response?.data?.message || err.message;
            toast.error(errorMessage);
            setError(errorMessage);
        }
    };

    return (
        <ProtectedRoute requiredRole="System Admin">
            <div className="admin-events-page">
                <div className="admin-page-header">
                    <div className="header-left"><FiCalendar /><div><h1>Event Admin</h1><p>Manage submissions</p></div></div>
                    <div className="header-actions">
                        <Link href="/admin/users" className="nav-btn"><FiUsers /> Users</Link>
                        <Link href="/admin/theaters" className="nav-btn"><FiGrid /> Theaters</Link>
                        <button className="refresh-btn" onClick={fetchEvents} disabled={loading}><FiRefreshCw className={loading ? 'spinning' : ''} /></button>
                    </div>
                </div>
                <div className="stats-grid">
                    <div className="stat-card total"><FiTrendingUp /><span>{stats.total} Total</span></div>
                    <div className={`stat-card pending ${activeFilter === 'pending' ? 'active' : ''}`} onClick={() => setActiveFilter('pending')}><FiClock /><span>{stats.pending} Pending</span></div>
                    <div className={`stat-card approved ${activeFilter === 'approved' ? 'active' : ''}`} onClick={() => setActiveFilter('approved')}><FiCheck /><span>{stats.approved} Approved</span></div>
                    <div className={`stat-card declined ${activeFilter === 'declined' ? 'active' : ''}`} onClick={() => setActiveFilter('declined')}><FiXCircle /><span>{stats.declined} Declined</span></div>
                </div>
                <div className="controls-section">
                    <div className="search-box"><FiSearch /><input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div>
                </div>
                {loading ? <div className="loading">Loading...</div> : (
                    <div className="events-grid">
                        {filteredEvents.map(event => (
                            <div key={event._id} className="event-admin-card">
                                <EventCard event={event} />
                                <div className="event-admin-actions">
                                    <Link href={`/events/${event._id}`} className="action-btn view"><FiEye /> Details</Link>
                                    {activeFilter === 'pending' && (<><button className="action-btn approve" onClick={() => handleStatusChange(event._id, 'approved')}><FiCheck /> Approve</button><button className="action-btn decline" onClick={() => handleStatusChange(event._id, 'declined')}><FiXCircle /> Decline</button></>)}
                                    {activeFilter === 'approved' && <button className="action-btn decline" onClick={() => handleStatusChange(event._id, 'declined')}><FiXCircle /> Revoke</button>}
                                    {activeFilter === 'declined' && <button className="action-btn approve" onClick={() => handleStatusChange(event._id, 'approved')}><FiCheck /> Approve</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
};

export default AdminEventsPage;
