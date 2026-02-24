import React, { useState } from 'react';
import Link from 'next/link';
import styles from '@/styles/global/header.module.scss';
import { KibButtonNew } from '@chewy/kib-controls-react';

const FREQUENCY_LABELS: Record<number, string> = {
  1: 'Rare',
  2: 'Occasional',
  3: 'Normal',
  4: 'Frequent',
  5: 'Swarm',
};

interface HeaderProps {
  ratsEnabled?: boolean;
  onToggleRats?: () => void;
  ratFrequency?: number;
  onRatFrequencyChange?: (value: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  ratsEnabled = true,
  onToggleRats,
  ratFrequency = 3,
  onRatFrequencyChange,
}) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          {/* Left side - Logo/Brand */}
          <div className={styles.brand}>
            <div className={styles.brandText}>
              <h1 className={styles.appTitle}>Dashboard</h1>
              <span className={styles.subtitle}>Monitoring & Analytics</span>
            </div>
          </div>

          {/* Center - Navigation */}
          <nav className={styles.navigation}>
            <Link href="/">
              <KibButtonNew size="small">
                Overview
              </KibButtonNew>
            </Link>
            <Link href="/cls-management">
              <KibButtonNew size="small">
                CLS Queue Management
              </KibButtonNew>
            </Link>
            <Link href="/srm-download">
              <KibButtonNew size="small">
                SRM Download
              </KibButtonNew>
            </Link>
            <Link href="/database-errors">
              <KibButtonNew size="small">
                Database Errors
              </KibButtonNew>
            </Link>
            <Link href="/release-manager">
              <KibButtonNew size="small">
                Release Manager
              </KibButtonNew>
            </Link>
            <Link href="/test-tools">
              <KibButtonNew size="small">
                Test Tools
              </KibButtonNew>
            </Link>
          </nav>

          {/* Right side - User actions */}
          <div className={styles.actions}>
            <KibButtonNew size="small" onClick={() => setSettingsOpen(true)}>
              Settings
            </KibButtonNew>
            <div className={styles.userProfile}>
              <span className={styles.userName}>JT</span>
            </div>
          </div>
        </div>
      </header>

      {/* Settings / Rat Patrol modal */}
      {settingsOpen && (
        <div className={styles.modalOverlay} onClick={() => setSettingsOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Settings</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSettingsOpen(false)}
                aria-label="Close settings"
              >
                X
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Rat Patrol controls */}
              <div className={styles.settingsSection}>
                <h3 className={styles.settingsSectionTitle}>Rat Patrol</h3>
                <div className={styles.ratToggleRow}>
                  <span className={styles.ratToggleLabel}>Enable Rats</span>
                  <button
                    className={`${styles.ratToggle} ${ratsEnabled ? styles.ratToggleOn : ''}`}
                    onClick={onToggleRats}
                    aria-label={ratsEnabled ? 'Disable rats' : 'Enable rats'}
                  >
                    <span className={styles.ratToggleKnob} />
                  </button>
                </div>
                {ratsEnabled && (
                  <div className={styles.ratFrequencyControl}>
                    <div className={styles.ratFrequencyHeader}>
                      <span className={styles.ratFrequencyLabel}>Frequency</span>
                      <span className={styles.ratFrequencyValue}>
                        {FREQUENCY_LABELS[ratFrequency] || 'Normal'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      step={1}
                      value={ratFrequency}
                      onChange={(e) => onRatFrequencyChange?.(Number(e.target.value))}
                      className={styles.ratSlider}
                    />
                    <div className={styles.ratSliderLabels}>
                      <span>Rare</span>
                      <span>Swarm</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
