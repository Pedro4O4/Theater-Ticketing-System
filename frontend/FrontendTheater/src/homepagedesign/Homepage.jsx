import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { FaTicketAlt, FaUsers, FaCalendarAlt, FaStar, FaTheaterMasks, FaTrophy, FaMusic, FaPalette } from 'react-icons/fa';
import '.././index.css';
import './Homepage.css';
import { getImageUrl } from '../utils/imageHelper';

const Homepage = () => {
    const [featuredEvents, setFeaturedEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showFullImage, setShowFullImage] = useState(false);
    const [currentImage, setCurrentImage] = useState(null);
    const navigate = useNavigate();

    // Refs for counting animation
    const { ref: statsRef, inView: statsInView } = useInView({
        triggerOnce: true,
        threshold: 0.3
    });

    const API_URL = 'http://localhost:3000';

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: true,
            easing: 'ease-out-cubic'
        });
    }, []);

    // Check if user is logged in
    const isLoggedIn = () => {
        return localStorage.getItem('token') !== null;
    };

    const handleEventClick = (event) => {
        if (isLoggedIn()) {
            navigate(`/events/${event.id}`);
        } else {
            setSelectedEvent(event);
            setShowLoginPrompt(true);
        }
    };

    const openFullImage = (event, e) => {
        e.stopPropagation();
        setCurrentImage(event);
        setShowFullImage(true);
    };

    useEffect(() => {
        axios.get(`${API_URL}/api/v1/event/approved`)
            .then(response => {
                if (response.data && Array.isArray(response.data)) {
                    const events = response.data.map(event => ({
                        id: event._id,
                        title: event.title,
                        date: new Date(event.date).toLocaleDateString(),
                        location: event.location,
                        image: getImageUrl(event.image) || '/placeholder-image.jpg',
                        ticketPrice: event.ticketPrice,
                        remainingTickets: event.remainingTickets
                    }));
                    setFeaturedEvents(events);
                } else {
                    setError('No events found');
                    setFeaturedEvents([]);
                }
                setLoading(false);
            })
            .catch(error => {
                console.error('Error fetching events:', error);
                setError('Failed to load events. Please try again later.');
                setFeaturedEvents([]);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return <div className="loading-indicator">Loading...</div>;
    }

    return (
        <div className="homepage-container">
            {/* Hero Section with the specified background image */}
            <div className="hero-section" style={{
                background: 'linear-gradient(rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.7)), url("https://th.bing.com/th/id/OIP.GcQyOsMVDtUUhTTMmTjY0wHaEJ?w=626&h=351&rs=1&pid=ImgDetMain")',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}>
                <div className="hero-content" data-aos="fade-up">
                    <h1 className="hero-title" data-aos="fade-down" data-aos-delay="200">Experience the Magic of Live Performance</h1>
                    <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="400">Discover extraordinary events that will leave you breathless</p>
                    <div className="hero-buttons" data-aos="zoom-in" data-aos-delay="600">
                        <Link to="/events" className="btn-primary-hero">Browse Events</Link>
                        {!isLoggedIn() && (
                            <Link to="/register" className="btn-secondary-hero">Get Started</Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Statistics Section */}
            <section className="stats-section" ref={statsRef} data-aos="fade-up">
                <div className="stats-container">
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="100">
                        <FaTicketAlt className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={50000} duration={2.5} separator="," /> : '0'}</h3>
                        <p>Tickets Sold</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="200">
                        <FaUsers className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={10000} duration={2.5} separator="," /> : '0'}+</h3>
                        <p>Happy Customers</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="300">
                        <FaCalendarAlt className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={500} duration={2.5} /> : '0'}+</h3>
                        <p>Events Hosted</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="400">
                        <FaStar className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={4.8} duration={2.5} decimals={1} /> : '0'}</h3>
                        <p>Average Rating</p>
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="features-section" data-aos="fade-up">
                <h2 className="section-title" data-aos="fade-down" data-aos-duration="1000">Why Choose EventTix?</h2>
                <div className="features-grid">
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaTheaterMasks />
                        </div>
                        <h3>Premium Events</h3>
                        <p>Access to the most exclusive and highly-rated events in your area</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="200" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaTrophy />
                        </div>
                        <h3>Best Prices</h3>
                        <p>Competitive pricing with no hidden fees. What you see is what you pay</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="300" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaMusic />
                        </div>
                        <h3>Diverse Selection</h3>
                        <p>From concerts to theater, sports to festivals - we have it all</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="400" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaPalette />
                        </div>
                        <h3>Easy Booking</h3>
                        <p>Simple, fast, and secure booking process in just a few clicks</p>
                    </div>
                </div>
            </section>

            {/* Featured Events Section */}
            <section className="featured-section" data-aos="fade-up">
                <h2 className="section-title" data-aos="fade-down">Featured Shows</h2>
                {error ? (
                    <div className="error-message">{error}</div>
                ) : featuredEvents.length === 0 ? (
                    <div className="no-events-message">No events available at the moment.</div>
                ) : (
                    <>
                        <div className="events-grid">
                            {featuredEvents.map((event, index) => (
                                <div key={event.id} className="event-card" data-aos="fade-up" data-aos-delay={index * 100}>
                                    <div className="event-image-container" onClick={(e) => openFullImage(event, e)}>
                                        <img
                                            src={event.image}
                                            alt={event.title}
                                            className="event-image"
                                        />
                                        <div className="image-overlay">
                                            <span className="view-full">Click to view full image</span>
                                        </div>
                                    </div>
                                    <div className="event-info">
                                        <h3 className="events-titles">{event.title}</h3>
                                        <div className="event-meta">
                                            <p className="event-date">
                                                <i className="far fa-calendar"></i> {event.date}
                                            </p>
                                            <p className="event-location">
                                                <i className="fas fa-map-marker-alt"></i> {event.location}
                                            </p>
                                        </div>
                                        <div className="event-price-tag">
                                            <span>{event.ticketPrice > 0 ? `$${event.ticketPrice}` : 'Free'}</span>
                                        </div>
                                        <button
                                            className="view-detail-btn"
                                            onClick={() => handleEventClick(event)}
                                        >
                                            {isLoggedIn() ? 'View Details' : 'Login to View'}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {/* Full Image Modal */}
            {showFullImage && (
                <div className="full-image-modal" onClick={() => setShowFullImage(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <img src={currentImage.image} alt={currentImage.title} />
                        <button className="close-modal" onClick={() => setShowFullImage(false)}>×</button>
                    </div>
                </div>
            )}

            {/* Login Prompt Modal */}
            {showLoginPrompt && (
                <div className="login-prompt-overlay" onClick={() => setShowLoginPrompt(false)}>
                    <div className="login-prompt-modal" onClick={e => e.stopPropagation()}>
                        <h3>Login Required</h3>
                        <p>Please log in to view event details for "{selectedEvent?.title}"</p>
                        <div className="login-prompt-buttons">
                            <Link to="/login" className="login-btn">Login</Link>
                            <Link to="/register" className="register-btn">Register</Link>
                            <button className="cancel-btn" onClick={() => setShowLoginPrompt(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Homepage;