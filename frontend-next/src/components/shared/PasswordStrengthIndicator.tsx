'use client';

import React, { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface StrengthResult {
  score: number; // 0-4
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
}

function evaluateStrength(password: string): StrengthResult {
  const checks = [
    { label: 'At least 8 characters', passed: password.length >= 8 },
    { label: 'Contains uppercase letter', passed: /[A-Z]/.test(password) },
    { label: 'Contains lowercase letter', passed: /[a-z]/.test(password) },
    { label: 'Contains a number', passed: /[0-9]/.test(password) },
    { label: 'Contains special character', passed: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.passed).length;

  let label: string;
  let color: string;

  if (score <= 1) {
    label = 'Very Weak';
    color = '#EF4444';
  } else if (score === 2) {
    label = 'Weak';
    color = '#F97316';
  } else if (score === 3) {
    label = 'Fair';
    color = '#F59E0B';
  } else if (score === 4) {
    label = 'Strong';
    color = '#10B981';
  } else {
    label = 'Very Strong';
    color = '#059669';
  }

  return { score, label, color, checks };
}

export default function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  const strength = useMemo(() => evaluateStrength(password), [password]);

  if (!password) return null;

  return (
    <div style={{ marginTop: '0.5rem' }}>
      {/* Strength bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '0.4rem' }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: '4px',
              borderRadius: '2px',
              background: i <= strength.score
                ? strength.color
                : 'rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
            }}
          />
        ))}
      </div>

      {/* Label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            color: strength.color,
            transition: 'color 0.3s ease',
          }}
        >
          {strength.label}
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {strength.score}/5
        </span>
      </div>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {strength.checks.map((check) => (
          <div
            key={check.label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.72rem',
              color: check.passed ? 'var(--success)' : 'var(--text-muted)',
              transition: 'color 0.3s ease',
            }}
          >
            <span style={{ fontSize: '0.8rem' }}>
              {check.passed ? '✓' : '○'}
            </span>
            {check.label}
          </div>
        ))}
      </div>
    </div>
  );
}
