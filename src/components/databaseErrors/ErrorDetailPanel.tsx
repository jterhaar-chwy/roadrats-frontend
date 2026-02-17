import React from 'react';
import styles from '@/styles/databaseErrors/databaseErrors.module.scss';
import { DatabaseError } from './DatabaseErrorsDashboard';

interface ErrorDetailPanelProps {
  error: DatabaseError | null;
}

export const ErrorDetailPanel: React.FC<ErrorDetailPanelProps> = ({ error }) => {
  if (!error) {
    return (
      <div className={styles.detailPanel}>
        <div className={styles.detailHeader}>Details</div>
        <div className={styles.detailEmpty}>
          Select a row from the table above to view call stack and arguments.
        </div>
      </div>
    );
  }

  return (
    <div className={styles.detailPanel}>
      <div className={styles.detailHeader}>
        Details — {error.serverName} / {error.machineId} / {error.resourceName}
      </div>

      <div className={styles.detailSections}>
        <div className={styles.detailSection}>
          <h4 className={styles.detailSectionTitle}>Call Stack</h4>
          <pre className={styles.detailPre}>
            {error.callStack || '(empty)'}
          </pre>
        </div>

        <div className={styles.detailSection}>
          <h4 className={styles.detailSectionTitle}>Arguments</h4>
          <pre className={styles.detailPre}>
            {error.arguments || '(empty)'}
          </pre>
        </div>

        <div className={styles.detailSection}>
          <h4 className={styles.detailSectionTitle}>Full Details</h4>
          <pre className={styles.detailPre}>
            {error.details || '(empty)'}
          </pre>
        </div>
      </div>
    </div>
  );
};

