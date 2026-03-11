"use client";
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/auth/AuthContext';
import { useLanguage, Language } from '@/contexts/LanguageContext';

import './Navbar.css';

const Navbar: React.FC = () => {
    const { user, isAuthenticated, isAdmin, isOrganizer, isScanner, logout } = useAuth();
    const { language, setLanguage, t } = useLanguage();
    const router = useRouter();
    const pathname = usePathname();
    const [showLogoutDialog, setShowLogoutDialog] = useState(false);

    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [scrolled, setScrolled] = useState(false);
    const [showLangMenu, setShowLangMenu] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const langRef = useRef<HTMLDivElement>(null);
    const navMenuRef = useRef<HTMLDivElement>(null);

    // Sync user's saved language preference from backend
    useEffect(() => {
        const userLang = (user as any)?.language as Language | undefined;
        if (userLang && (userLang === 'en' || userLang === 'ar') && userLang !== language) {
            setLanguage(userLang);
        }
    }, [user]);

    useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                setScrolled(true);
            } else {
                setScrolled(false);
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close lang menu and dropdowns on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (langRef.current && !langRef.current.contains(e.target as Node)) {
                setShowLangMenu(false);
            }
            if (navMenuRef.current && !navMenuRef.current.contains(e.target as Node)) {
                setOpenDropdown(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleLogoutClick = () => {
        setShowLogoutDialog(true);
    };

    const confirmLogout = async () => {
        setIsLoggingOut(true);
        try {
            await logout();
            setShowLogoutDialog(false);
            router.push('/login');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setIsLoggingOut(false);
        }
    };

    const cancelLogout = () => {
        setShowLogoutDialog(false);
    };

    // Hide navbar for scanner routes
    if (pathname?.startsWith('/scanner')) {
        return null;
    }

    return (
        <>
            <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
                <div className="navbar-container">
                    <Link href="/" className="navbar-logo">
                        <span className="logo-emoji">🎟️</span> Event Tickets
                    </Link>

                    <div className="nav-menu" ref={navMenuRef}>
                        <Link href="/" className="nav-item">{t('nav.home')}</Link>

                        {isAuthenticated ? (
                            <>
                                {isScanner && (
                                    <Link href="/scanner" className="nav-item">
                                        <i className="fas fa-qrcode"></i> Scanner
                                    </Link>
                                )}

                                {!isAdmin && !isOrganizer && !isScanner && (
                                    <div className={`nav-dropdown ${openDropdown === 'user' ? 'dropdown-open' : ''}`}
                                         onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}>
                                        <span className="nav-item">{t('nav.user')} <i className="fas fa-caret-down"></i></span>
                                        <div className="dropdown-content">
                                            <Link href="/events">{t('nav.explore')}</Link>
                                            <Link href="/bookings">{t('nav.bookings')}</Link>
                                        </div>
                                    </div>
                                )}

                                {isOrganizer && (
                                    <div className={`nav-dropdown ${openDropdown === 'organizer' ? 'dropdown-open' : ''}`}
                                         onClick={() => setOpenDropdown(openDropdown === 'organizer' ? null : 'organizer')}>
                                        <span className="nav-item">{t('nav.organizer')} <i className="fas fa-caret-down"></i></span>
                                        <div className="dropdown-content">
                                            <Link href="/my-events">{t('nav.myEvents')}</Link>
                                            <Link href="/my-events/new">{t('nav.createEvent')}</Link>
                                            <Link href="/my-events/analytics">{t('nav.analytics')}</Link>
                                        </div>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div className={`nav-dropdown ${openDropdown === 'admin' ? 'dropdown-open' : ''}`}
                                         onClick={() => setOpenDropdown(openDropdown === 'admin' ? null : 'admin')}>
                                        <span className="nav-item">{t('nav.admin')} <i className="fas fa-caret-down"></i></span>
                                        <div className="dropdown-content">
                                            <Link href="/admin/events">{t('nav.manageEvents')}</Link>
                                            <Link href="/admin/users">{t('nav.manageUsers')}</Link>
                                            <Link href="/admin/theaters">{t('nav.manageTheaters')}</Link>
                                        </div>
                                    </div>
                                )}

                                {!isScanner && (
                                    <Link href="/profile" className="nav-item profile-nav">
                                        {(user as any)?.profilePicture ? (
                                            <img src={(user as any).profilePicture} alt="Profile" className="nav-avatar" />
                                        ) : (
                                            <div className="nav-avatar-placeholder">
                                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                        )}
                                        <span>{t('nav.profile')}</span>
                                    </Link>
                                )}
                                <button className="logout-btn" onClick={handleLogoutClick}>{t('nav.logout')}</button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="nav-item">{t('nav.login')}</Link>
                                <Link href="/register" className="nav-item">{t('nav.register')}</Link>
                            </>
                        )}

                        {/* ── Language toggle ── */}
                        <div className="lang-toggle" ref={langRef}>
                            <button
                                className="lang-btn"
                                onClick={() => setShowLangMenu(v => !v)}
                                aria-label="Switch language"
                            >
                                🌐 {language === 'ar' ? 'ع' : 'EN'}
                            </button>
                            {showLangMenu && (
                                <div className="lang-dropdown">
                                    <button
                                        className={`lang-option ${language === 'en' ? 'active' : ''}`}
                                        onClick={() => { setLanguage('en'); setShowLangMenu(false); }}
                                    >
                                        <span className="lang-flag">🇬🇧</span>
                                        {t('lang.en')}
                                        {language === 'en' && ' ✓'}
                                    </button>
                                    <button
                                        className={`lang-option ${language === 'ar' ? 'active' : ''}`}
                                        onClick={() => { setLanguage('ar'); setShowLangMenu(false); }}
                                    >
                                        <span className="lang-flag">🇸🇦</span>
                                        {t('lang.ar')}
                                        {language === 'ar' && ' ✓'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </nav>

            {showLogoutDialog && (
                <div className="logout-dialog-overlay">
                    <div className="logout-dialog">
                        <h3>{t('logout.title')}</h3>
                        <p>{t('logout.confirm')}</p>
                        <div className="logout-dialog-buttons">
                            <button
                                className="logout-confirm-btn"
                                onClick={confirmLogout}
                                disabled={isLoggingOut}
                            >
                                {isLoggingOut ? t('logout.loading') : t('logout.yes')}
                            </button>
                            <button
                                className="logout-cancel-btn"
                                onClick={cancelLogout}
                                disabled={isLoggingOut}
                            >
                                {t('logout.no')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default Navbar;
