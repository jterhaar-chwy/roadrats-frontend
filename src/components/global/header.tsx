import React from 'react';
import Link from 'next/link';
import styles from '@/styles/global/header.module.scss';
import { KibButtonNew } from '@chewy/kib-controls-react';

export const Header: React.FC = () => {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* Left side - Logo/Brand */}
        <div className={styles.brand}>
          <h1 className={styles.appTitle}>Dashboard</h1>
          <span className={styles.subtitle}>Monitoring & Analytics</span>
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
