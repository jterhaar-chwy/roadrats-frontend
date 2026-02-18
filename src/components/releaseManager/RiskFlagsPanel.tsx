import React from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { RiskFlag } from './ReleaseManagerDashboard';

interface RiskFlagsPanelProps {
  riskFlags: RiskFlag[];
}

export const RiskFlagsPanel: React.FC<RiskFlagsPanelProps> = ({ riskFlags }) => {
  const severityClass = (severity: string) => {
    switch (severity) {
      case 'high': return styles.riskHigh;
      case 'medium': return styles.riskMedium;
      case 'low': return styles.riskLow;
      default: return '';
    }
  };

  return (
    <div className={styles.riskPanel}>
      <h3 className={styles.riskTitle}>Risk Assessment</h3>
      <div className={styles.riskList}>
        {riskFlags.map((flag, idx) => (
          <div key={idx} className={`${styles.riskItem} ${severityClass(flag.severity)}`}>
            <span className={styles.riskSeverity}>{flag.severity.toUpperCase()}</span>
            <span className={styles.riskCategory}>{flag.category}</span>
            <span className={styles.riskMessage}>{flag.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

