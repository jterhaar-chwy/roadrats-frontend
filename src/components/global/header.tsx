import React from 'react';
import Link from 'next/link';
import styles from '@/styles/global/header.module.scss';
import { KibButtonNew } from '@chewy/kib-controls-react';

interface HeaderProps {
  onToggleSidebar?: () => void;
  sidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar, sidebarOpen }) => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Left side - Logo/Brand */}
        <div className={styles.brand}>
          <button
            className={styles.menuToggle}
            onClick={onToggleSidebar}
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            title={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            <span className={`${styles.hamburger} ${sidebarOpen ? styles.open : ''}`}>
              <span></span>
              <span></span>
              <span></span>
            </span>
          </button>
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
              CLS Route Management
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
        </nav>

        {/* Right side - User actions */}
        <div className={styles.actions}>
          <KibButtonNew size="small">
            Settings
          </KibButtonNew>
          <div className={styles.userProfile}>
            <span className={styles.userName}>JT</span>
          </div>
        </div>
      </div>
    </header>
  );
};
