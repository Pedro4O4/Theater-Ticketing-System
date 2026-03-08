'use client';
import { useEffect } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Language } from '@/contexts/LanguageContext';

/**
 * Bridge component that syncs the authenticated user's preferred language
 * (stored in the backend) into the LanguageContext on login.
 * Must be rendered inside both AuthProvider and LanguageProvider.
 */
export default function LanguageSyncer() {
    const { user } = useAuth();
    const { language, setLanguage } = useLanguage();

    useEffect(() => {
        const userLang = (user as any)?.language as Language | undefined;
        if (userLang && (userLang === 'en' || userLang === 'ar') && userLang !== language) {
            setLanguage(userLang);
        }
    }, [user]);

    return null;
}
