import { Routes, Route, Navigate } from "react-router-dom";
import CustomToast from './components/shared/CustomToast';
import 'react-toastify/dist/ReactToastify.css';
import Homepage from './homepagedesign/Homepage.jsx';
import { AuthProvider } from "./auth/AuthContext";
import { useState, useEffect } from "react";
import AuthPage from "./components/AuthPage";
import Navbar from "./components/shared/Navbar";
import Footer from "./components/shared/Footer";
import Loader from "./components/shared/Loader";
import ForgotPasswordForm from "./components/ForgotPasswordForm.jsx";
import AdminUsersPage from "./components/AdminComponent/AdminUsersPage.jsx";
import AdminEventsPage from "./components/Event Components/AdminEventsPage.jsx";
import { ProtectedRoute } from "./auth/ProtectedRoute";
import ProfilePage from './components/UserComponent/ProfilePage';
import EventList from "./components/Event Components/EventList.jsx";
import EventForm from "./components/Event Components/EventForm.jsx";
import EventAnalytics from "./components/Event Components/EventAnalytics.jsx";
import MyEventsPage from "./components/Event Components/MyEventPage.jsx";
import EditEventPage from "./components/Event Components/EditEventPage.jsx";
import EventDetailsPage from "./components/Event Components/EventDetailPage.jsx";
import UpdateProfilePage from "./components/UserComponent/UpdateProfilePage.jsx";
import UserBookingPage from "./components/Booking Component/UserBookingPage";
import BookingDetails from "./components/Booking Component/BookingDetails";
import BookingTicketForm from "./components/Booking Component/BookingTicketForm.jsx";
import './index.css'

function App() {
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate initial app loading
        const timer = setTimeout(() => {
            setLoading(false);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return <Loader />;
    }

    return (

        <AuthProvider>
            <div className="app-container">
                <Navbar />
                <div className="navbar-spacer"></div>
                <div className="main-content">
                    <Routes>
                        {/* Auth routes */}
                        <Route path="/login" element={<AuthPage />} />
                        <Route path="/register" element={<AuthPage />} />
                        <Route path="/auth" element={<AuthPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordForm />} />

                            <Route index element={<Homepage />} />
                            <Route path="home" element={<Homepage />} />
                            {/* Redirect root to events */}
                            <Route index element={<Navigate to="/events" replace />} />
                            <Route path="events" element={<EventList />} />

                            {/* IMPORTANT: More specific routes first */}
                            <Route path="my-events/new" element={
                                <ProtectedRoute requiredRole="Organizer">
                                    <EventForm />
                                </ProtectedRoute>
                            } />

                            <Route path="my-events/:id/edit" element={
                                <ProtectedRoute requiredRole="Organizer">
                                    <EditEventPage />
                                </ProtectedRoute>
                            } />

                            <Route path="my-events/analytics" element={
                                <ProtectedRoute requiredRole="Organizer">
                                    <EventAnalytics />
                                </ProtectedRoute>
                            } />

                            {/* General route AFTER more specific ones */}
                            <Route path="events/:id" element={
                                <ProtectedRoute requiredRole={["System Admin", "Organizer", "Standard User"]}>
                                    <EventDetailsPage />
                                </ProtectedRoute>
                            } />
                            <Route path="profile" element={
                                <ProtectedRoute requiredRole={["System Admin", "Organizer", "Standard User"]}>
                                    <ProfilePage />
                                </ProtectedRoute>
                            } />
                            <Route path="profile/edit" element={
                                <ProtectedRoute requiredRole={["System Admin", "Organizer", "Standard User"]}>
                                    <UpdateProfilePage />
                                </ProtectedRoute>
                            } />


                            <Route path="events" element={
                                <ProtectedRoute requiredRole={["System Admin", "Organizer", "Standard User"]}>
                                    <EventList />
                                </ProtectedRoute>
                            } />

                            <Route path="my-events" element={
                                <ProtectedRoute requiredRole="Organizer">
                                    <MyEventsPage />
                                </ProtectedRoute>
                            } />

                            {/* Admin routes */}
                            <Route path="admin/users" element={
                                <ProtectedRoute requiredRole="System Admin">
                                    <AdminUsersPage />
                                </ProtectedRoute>
                            } />

                            <Route path="admin/events" element={
                                <ProtectedRoute requiredRole="System Admin">
                                    <AdminEventsPage />
                                </ProtectedRoute>
                            } />

                            <Route path="bookings" element={
                                <ProtectedRoute requiredRole={["Standard User"]}>
                                    <UserBookingPage />
                                </ProtectedRoute>
                            } />

                            <Route path="bookings/:id" element={
                                <ProtectedRoute requiredRole={["Standard User"]}>
                                    <BookingDetails />
                                </ProtectedRoute>
                            } />
                            <Route path="/bookings/new/:eventId" element={
                                <ProtectedRoute requiredRole={["Standard User"]}>
                                    <BookingTicketForm />
                                </ProtectedRoute>
                            } />
                            <Route path="bookings/new" element={
                                <ProtectedRoute requiredRole={["Standard User"]}>
                                    <BookingDetails />
                                </ProtectedRoute>
                            } />




                        <Route path="*" element={<Navigate to="/login" replace />} />
                    </Routes>
                </div>
                <Footer />
                <CustomToast
                    position="top-right"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="dark classic"
                />
            </div>
        </AuthProvider>
    );
}

export default App;