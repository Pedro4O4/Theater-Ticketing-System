"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/services/api';
import AOS from 'aos';
import 'aos/dist/aos.css';
import CountUp from 'react-countup';
import { useInView } from 'react-intersection-observer';
import { FaTicketAlt, FaUsers, FaCalendarAlt, FaStar, FaTheaterMasks, FaTrophy, FaMusic, FaPalette } from 'react-icons/fa';
import '../app/globals.css';
import '@/components/homepage/Homepage.css';
import { Event } from '@/types/event';
import { useAuth } from '@/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import EventCard from '@/components/Event Components/EventCard';

const Homepage: React.FC = () => {
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { t } = useLanguage();

  const { ref: statsRef, inView: statsInView } = useInView({
    triggerOnce: true,
    threshold: 0.3
  });

  useEffect(() => {
    AOS.init({
      duration: 1000,
      once: true,
      easing: 'ease-out-cubic'
    });
  }, []);

  useEffect(() => {
    api.get<any>('/event/approved')
      .then(response => {
        const data = response.data.success ? response.data.data : response.data;
        if (data && Array.isArray(data)) {
          setFeaturedEvents(data);
        } else {
          setError('No events found');
          setFeaturedEvents([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching events:', err);
        setError('Failed to load events. Please try again later.');
        setFeaturedEvents([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="homepage-container">
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
            {!authLoading && !isAuthenticated && (
              <Link href="/register" className="btn-secondary-hero">{t('home.hero.start')}</Link>
            )}
          </div>
        </div>
      </div>

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

      <section className="features-section" data-aos="fade-up">
        <h2 className="section-title" data-aos="fade-down" data-aos-duration="1000">{t('home.features.title')}</h2>
        <div className="features-grid">
          <div className="feature-card" data-aos="fade-up" data-aos-delay="100" data-aos-duration="800">
            <div className="feature-icon"><FaTheaterMasks /></div>
            <h3>{t('home.features.premium')}</h3>
            <p>{t('home.features.premium.desc')}</p>
          </div>
          <div className="feature-card" data-aos="fade-up" data-aos-delay="200" data-aos-duration="800">
            <div className="feature-icon"><FaTrophy /></div>
            <h3>{t('home.features.prices')}</h3>
            <p>{t('home.features.prices.desc')}</p>
          </div>
          <div className="feature-card" data-aos="fade-up" data-aos-delay="300" data-aos-duration="800">
            <div className="feature-icon"><FaMusic /></div>
            <h3>{t('home.features.diverse')}</h3>
            <p>{t('home.features.diverse.desc')}</p>
          </div>
          <div className="feature-card" data-aos="fade-up" data-aos-delay="400" data-aos-duration="800">
            <div className="feature-icon"><FaPalette /></div>
            <h3>{t('home.features.booking')}</h3>
            <p>{t('home.features.booking.desc')}</p>
          </div>
        </div>
      </section>

      <section className="featured-section" data-aos="fade-up">
        <h2 className="section-title" data-aos="fade-down">{t('home.featured.title')}</h2>
        {loading ? (
          <div className="loading-indicator" style={{ textAlign: 'center', padding: '2rem' }}>{t('home.featured.loading')}</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : featuredEvents.length === 0 ? (
          <div className="no-events-message">{t('home.featured.empty')}</div>
        ) : (
          <div className="events-grid">
            {featuredEvents.map((event, index) => (
              <div key={event._id || (event as any).id} data-aos="fade-up" data-aos-delay={index * 100}>
                <EventCard event={event} index={index} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Homepage;

