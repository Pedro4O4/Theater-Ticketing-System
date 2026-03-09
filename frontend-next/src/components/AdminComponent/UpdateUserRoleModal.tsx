"use client";
import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { User, UserRole } from '@/types/auth';
import './UpdateUserRoleModal.css';

interface UpdateUserRoleModalProps {
    isOpen: boolean;
    user: User | null;
    onClose: () => void;
    onUpdate: (userId: string, updatedData: Partial<User>) => void;
}

const UpdateUserRoleModal: React.FC<UpdateUserRoleModalProps> = ({ isOpen, user, onClose, onUpdate }) => {
    const [role, setRole] = useState<UserRole>('Standard User');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            setRole(user.role || 'Standard User');
        }
        setError(null);
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        const userId = user._id;
        setIsSubmitting(true);
        setError(null);

        try {
            await api.put(`/user/${userId}/role`, { role });
            onUpdate(userId, { role });
            onClose();
        } catch (err: any) {
            console.error("Error updating user role:", err);
            setError(err.response?.data?.message || "Failed to update user role");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="admin-modal-overlay">
            <div className="admin-modal">
                <h2>Update User Role</h2>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <p>User: {user?.name} ({user?.email})</p>
                        <label htmlFor="role">Role</label>
                        <select
                            id="role"
                            name="role"
                            value={role}
                            onChange={(e) => setRole(e.target.value as UserRole)}
                            required
                            disabled={isSubmitting}
                        >
                            <option value="System Admin">System Admin</option>
                            <option value="Organizer">Organizer</option>
                            <option value="Standard User">Standard User</option>
                            <option value="Scanner">Scanner</option>
                        </select>
                    </div>

                    {error && <div className="error-message">{error}</div>}

                    <div className="button-container">
                        <button type="submit" className="admin-button" disabled={isSubmitting}>
                            {isSubmitting ? 'Updating...' : 'Update Role'}
                        </button>
                        <button type="button" className="admin-button" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateUserRoleModal;
