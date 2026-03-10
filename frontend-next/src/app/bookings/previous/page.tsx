"use client";
import UserBookingsPage from '@/components/Booking component/UserBookingsPage';
import { ProtectedRoute } from '@/auth/ProtectedRoute';

/**
 * PreviousBookingsPage Component
 * 
 * This page displays the user's past bookings using the UserBookingsPage component
 * with the isPrevious prop set to true. It is protected to ensure only logged-in
 * standard users can access it.
 */
const PreviousBookingsPage = () => {
    return (
        <ProtectedRoute requiredRole="Standard User">
            <UserBookingsPage isPrevious={true} />
        </ProtectedRoute>
    );
};

export default PreviousBookingsPage;
