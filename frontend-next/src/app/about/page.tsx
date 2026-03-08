'use client';
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AboutPage() {
    const { t } = useLanguage();

    return (
        <div className="container mx-auto px-4 py-12 text-white">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12 text-center">
                    <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        {t('about.title')}
                    </h1>
                    <div className="h-1 w-24 bg-purple-500 mx-auto rounded"></div>
                </header>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-xl border border-white/10">
                    <p className="text-lg mb-6 leading-relaxed" dangerouslySetInnerHTML={{ __html: t('about.intro') }} />

                    <p className="text-lg mb-6 leading-relaxed">
                        {t('about.desc')}
                    </p>

                    <h2 className="text-2xl font-semibold mb-4 text-purple-300">{t('about.missionTitle')}</h2>
                    <p className="text-lg leading-relaxed">
                        {t('about.mission')}
                    </p>
                </div>
            </div>
        </div>
    );
}
