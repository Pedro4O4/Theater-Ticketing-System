'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage, Language } from '@/contexts/LanguageContext';

export default function ChooseLanguagePage() {
    const { setLanguage, t } = useLanguage();
    const [selected, setSelected] = useState<Language>('en');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleContinue = async () => {
        setLoading(true);
        await setLanguage(selected);
        router.push('/login');
    };

    const cards: { lang: Language; flag: string; nameKey: string; sampleKey: string; gradient: string; borderColor: string }[] = [
        {
            lang: 'en',
            flag: '🇬🇧',
            nameKey: 'chooseLang.en.name',
            sampleKey: 'chooseLang.en.sample',
            gradient: 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
            borderColor: '#667eea',
        },
        {
            lang: 'ar',
            flag: '🇸🇦',
            nameKey: 'chooseLang.ar.name',
            sampleKey: 'chooseLang.ar.sample',
            gradient: 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
            borderColor: '#f5576c',
        },
    ];

    return (
        <div
            style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg-primary)',
                backgroundImage: `
                    radial-gradient(circle at 20% 30%, rgba(102,126,234,0.15) 0%, transparent 50%),
                    radial-gradient(circle at 80% 70%, rgba(245,87,108,0.12) 0%, transparent 50%)`,
                padding: '24px',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Subtle animated grid */}
            <div
                style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: `
                        linear-gradient(rgba(121,40,202,0.04) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(121,40,202,0.04) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                    pointerEvents: 'none',
                }}
            />

            <div
                style={{
                    position: 'relative',
                    background: 'var(--bg-glass, rgba(255,255,255,0.05))',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(121,40,202,0.3)',
                    borderRadius: '24px',
                    padding: '52px 48px 44px',
                    maxWidth: '560px',
                    width: '100%',
                    boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
                    textAlign: 'center',
                }}
            >
                {/* Icon + heading */}
                <div style={{ fontSize: '44px', marginBottom: '12px' }}>🌐</div>
                <h1
                    style={{
                        margin: '0 0 8px',
                        fontSize: '28px',
                        fontWeight: 800,
                        color: '#fff',
                        letterSpacing: '-0.5px',
                    }}
                >
                    {t('chooseLang.title')}
                </h1>
                <p style={{ margin: '0 0 36px', color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
                    {t('chooseLang.subtitle')}
                </p>

                {/* Language cards */}
                <div style={{ display: 'flex', gap: '20px', marginBottom: '36px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    {cards.map(({ lang, flag, nameKey, sampleKey, gradient, borderColor }) => {
                        const isSelected = selected === lang;
                        return (
                            <button
                                key={lang}
                                onClick={() => setSelected(lang)}
                                style={{
                                    flex: '1 1 180px',
                                    minWidth: '160px',
                                    cursor: 'pointer',
                                    background: isSelected
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(255,255,255,0.04)',
                                    border: `2px solid ${isSelected ? borderColor : 'rgba(255,255,255,0.1)'}`,
                                    borderRadius: '18px',
                                    padding: '28px 20px 24px',
                                    transition: 'all 0.25s ease',
                                    boxShadow: isSelected
                                        ? `0 0 0 4px ${borderColor}33, 0 8px 24px rgba(0,0,0,0.3)`
                                        : 'none',
                                    transform: isSelected ? 'translateY(-4px)' : 'none',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    textAlign: 'center',
                                }}
                            >
                                {/* Gradient top bar */}
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: 0, left: 0, right: 0,
                                        height: '4px',
                                        background: isSelected ? gradient : 'transparent',
                                        borderRadius: '18px 18px 0 0',
                                        transition: 'background 0.25s',
                                    }}
                                />
                                {/* Check badge */}
                                {isSelected && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '12px', right: '12px',
                                            width: '22px', height: '22px',
                                            borderRadius: '50%',
                                            background: gradient,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: '12px',
                                            color: '#fff',
                                            fontWeight: 700,
                                        }}
                                    >
                                        ✓
                                    </div>
                                )}
                                <div style={{ fontSize: '42px', marginBottom: '12px', lineHeight: 1 }}>{flag}</div>
                                <div
                                    style={{
                                        fontSize: '20px',
                                        fontWeight: 800,
                                        color: isSelected ? '#fff' : 'rgba(255,255,255,0.7)',
                                        marginBottom: '6px',
                                        transition: 'color 0.2s',
                                        fontFamily: lang === 'ar' ? "'Segoe UI', Tahoma, Arial, sans-serif" : undefined,
                                    }}
                                >
                                    {t(nameKey)}
                                </div>
                                <div
                                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                                    style={{
                                        fontSize: '12px',
                                        color: 'rgba(255,255,255,0.4)',
                                        marginTop: '4px',
                                        fontFamily: lang === 'ar' ? "'Segoe UI', Tahoma, Arial, sans-serif" : undefined,
                                    }}
                                >
                                    {t(sampleKey)}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Continue button */}
                <button
                    onClick={handleContinue}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '15px',
                        borderRadius: '12px',
                        background: selected === 'en'
                            ? 'linear-gradient(135deg,#667eea 0%,#764ba2 100%)'
                            : 'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '16px',
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.7 : 1,
                        transition: 'all 0.25s ease',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        letterSpacing: '0.5px',
                    }}
                >
                    {loading ? '...' : t('chooseLang.continue')} {!loading && (selected === 'ar' ? '←' : '→')}
                </button>
            </div>
        </div>
    );
}
