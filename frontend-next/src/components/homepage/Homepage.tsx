'use client';

import { useState, useEffect, MouseEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { FaTicketAlt, FaUsers, FaCalendarAlt, FaStar, FaTheaterMasks, FaTrophy, FaMusic, FaPalette } from 'react-icons/fa';
import api from '@/services/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { getImageUrl } from '@/utils/imageHelper';
import '@/app/globals.css';
import './Homepage.css';

interface EventData {
    id: string;
    title: string;
    date: string;
    location: string;
    image: string;
    ticketPrice: number;
    remainingTickets: number;
}

const Homepage = () => {
    const [featuredEvents, setFeaturedEvents] = useState<EventData[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [showLoginPrompt, setShowLoginPrompt] = useState<boolean>(false);
    const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
    const [showFullImage, setShowFullImage] = useState<boolean>(false);
    const [currentImage, setCurrentImage] = useState<EventData | null>(null);
    const router = useRouter();
    const { t } = useLanguage();

    // Refs for counting animation
    const { ref: statsRef, inView: statsInView } = useInView({
        triggerOnce: true,
        threshold: 0.3
    });

    // Initialize AOS
    useEffect(() => {
        AOS.init({
            duration: 1000,
            once: true,
            easing: 'ease-out-cubic'
        });
    }, []);

    // Check if user is logged in
    const isLoggedIn = (): boolean => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('isAuthenticated') === 'true';
    };

    const handleEventClick = (event: EventData) => {
        if (isLoggedIn()) {
            router.push(`/events/${event.id}`);
        } else {
            setSelectedEvent(event);
            setShowLoginPrompt(true);
        }
    };

    const openFullImage = (event: EventData, e: MouseEvent<HTMLDivElement>) => {
        e.stopPropagation();
        setCurrentImage(event);
        setShowFullImage(true);
    };

    useEffect(() => {
        api.get('/event/approved')
            .then(response => {
                const eventsData = response.data?.data || response.data;
                if (eventsData && Array.isArray(eventsData)) {
                    const events: EventData[] = eventsData.map((event: any) => ({
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
                    <h1 className="hero-title" data-aos="fade-down" data-aos-delay="200">{t('home.hero.title')}</h1>
                    <p className="hero-subtitle" data-aos="fade-up" data-aos-delay="400">{t('home.hero.subtitle')}</p>
                    <div className="hero-buttons" data-aos="zoom-in" data-aos-delay="600">
                        <Link href="/events" className="btn-primary-hero">{t('home.hero.browse')}</Link>
                        {!isLoggedIn() && (
                            <Link href="/register" className="btn-secondary-hero">{t('home.hero.start')}</Link>
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
                        <p>{t('home.stats.tickets')}</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="200">
                        <FaUsers className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={10000} duration={2.5} separator="," /> : '0'}+</h3>
                        <p>{t('home.stats.customers')}</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="300">
                        <FaCalendarAlt className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={500} duration={2.5} /> : '0'}+</h3>
                        <p>{t('home.stats.events')}</p>
                    </div>
                    <div className="stat-item" data-aos="flip-left" data-aos-delay="400">
                        <FaStar className="stat-icon" />
                        <h3>{statsInView ? <CountUp end={4.8} duration={2.5} decimals={1} /> : '0'}</h3>
                        <p>{t('home.stats.rating')}</p>
                    </div>
                </div>
            </section>

            {/* Why Choose Us Section */}
            <section className="features-section" data-aos="fade-up">
                <h2 className="section-title" data-aos="fade-down" data-aos-duration="1000">{t('home.features.title')}</h2>
                <div className="features-grid">
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaTheaterMasks />
                        </div>
                        <h3>{t('home.features.premium')}</h3>
                        <p>{t('home.features.premium.desc')}</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="200" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaTrophy />
                        </div>
                        <h3>{t('home.features.prices')}</h3>
                        <p>{t('home.features.prices.desc')}</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="300" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaMusic />
                        </div>
                        <h3>{t('home.features.diverse')}</h3>
                        <p>{t('home.features.diverse.desc')}</p>
                    </div>
                    <div className="feature-card" data-aos="fade-up" data-aos-delay="400" data-aos-duration="800">
                        <div className="feature-icon">
                            <FaPalette />
                        </div>
                        <h3>{t('home.features.booking')}</h3>
                        <p>{t('home.features.booking.desc')}</p>
                    </div>
                </div>
            </section>

            {/* Featured Events Section */}
            <section className="featured-section" data-aos="fade-up">
                <h2 className="section-title" data-aos="fade-down">{t('home.featured.title')}</h2>
                {error ? (
                    <div className="error-message">{error}</div>
                ) : featuredEvents.length === 0 ? (
                    <div className="no-events-message">{t('home.featured.empty')}</div>
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
                                            <span className="view-full">{t('home.featured.viewFull')}</span>
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
                                            <span>{event.ticketPrice > 0 ? `${event.ticketPrice} EGP` : 'Free'}</span>
                                        </div>
                                        <button
                                            className="view-detail-btn"
                                            onClick={() => handleEventClick(event)}
                                        >
                                            {isLoggedIn() ? t('home.featured.viewDetails') : t('home.featured.loginToView')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </section>

            {/* Full Image Modal */}
            {showFullImage && currentImage && (
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
                        <h3>{t('home.loginPrompt.title')}</h3>
                        <p>{t('home.loginPrompt.message')} &quot;{selectedEvent?.title}&quot;</p>
                        <div className="login-prompt-buttons">
                            <Link href="/login" className="login-btn">{t('home.loginPrompt.login')}</Link>
                            <Link href="/register" className="register-btn">{t('home.loginPrompt.register')}</Link>
                            <button className="cancel-btn" onClick={() => setShowLoginPrompt(false)}>{t('home.loginPrompt.cancel')}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Homepage;
