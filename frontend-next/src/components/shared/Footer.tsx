'use client';
import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import './Footer.css';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();
    const { t } = useLanguage();

    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-section">
                    <h3>Event Tickets</h3>
                    <p>{t('footer.tagline')}</p>
                </div>

                <div className="footer-section">
                    <h3>{t('footer.quickLinks')}</h3>
                    <ul>
                        <li><Link href="/events">{t('footer.link.events')}</Link></li>
                        <li><Link href="/about">{t('footer.link.about')}</Link></li>
                    </ul>
                </div>

                <div className="footer-section">
                    <h3>{t('footer.followUs')}</h3>
                    <div className="social-links">
                        <a href="https://www.facebook.com/profile.php?id=100066715155700" target="_blank" rel="noopener noreferrer">Facebook</a>
                        <a href="https://www.instagram.com/taralally_theater/" target="_blank" rel="noopener noreferrer">Instagram</a>
                    </div>
                </div>

                <div className="footer-section">
                    <h3>{t('footer.contactUs')}</h3>
                    <div className="contact-info">
                        <a href="mailto:Youthmeeting@gmail.com">Youthmeeting@gmail.com</a>
                    </div>
                </div>
            </div>

            <div className="footer-bottom">
                <p>&copy; {currentYear} Event Tickets. {t('footer.rights')}</p>
            </div>
        </footer>
    );
};

export default Footer;
