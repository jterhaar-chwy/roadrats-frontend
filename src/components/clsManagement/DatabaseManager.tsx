import React, { useState, useEffect } from 'react';
import styles from '@/styles/clsManagement/databaseManager.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';

interface DatabaseManagerProps {
  onDataChange?: (data: any) => void;
}

export const DatabaseManager: React.FC<DatabaseManagerProps> = ({ onDataChange }) => {
  const [selectedDatabase, setSelectedDatabase] = useState<'production' | 'staging'>('production');
  const [isConnected, setIsConnected] = useState(false);

  const handleConnect = async () => {
    // TODO: Replace with actual API call
    // await apiPost('/api/cls/database/connect', { database: selectedDatabase });
    setIsConnected(true);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
  };

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        selectedDatabase,
        isConnected,
      });
    }
  }, [selectedDatabase, isConnected, onDataChange]);

  return (
    <div className={styles.databaseManager}>
      <KibSectionHeading 
        heading="Database Management" 
        subheading="Manage data in WMSSQL-CLS and WMSSQL-CLS-STAGING databases"
      >
        <div className={styles.connectionSection}>
          <div className={styles.databaseSelector}>
            <h3>Select Database</h3>
            <div className={styles.selectorButtons}>
              <KibButtonNew 
                size="medium"
                onClick={() => setSelectedDatabase('production')}
                className={selectedDatabase === 'production' ? styles.active : ''}
              >
                WMSSQL-CLS (Production)
              </KibButtonNew>
              <KibButtonNew 
                size="medium"
                onClick={() => setSelectedDatabase('staging')}
                className={selectedDatabase === 'staging' ? styles.active : ''}
              >
                WMSSQL-CLS-STAGING
              </KibButtonNew>
            </div>
          </div>

          <div className={styles.connectionStatus}>
            <div className={styles.statusIndicator}>
              <div className={`${styles.statusDot} ${isConnected ? styles.connected : styles.disconnected}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <KibButtonNew 
              size="medium"
              onClick={isConnected ? handleDisconnect : handleConnect}
            >
              {isConnected ? 'Disconnect' : 'Connect'}
            </KibButtonNew>
          </div>
        </div>

        {isConnected && (
          <div className={styles.managementSection}>
            <KibSectionHeading heading="Database Operations" className={styles.operationsHeading}>
              <div className={styles.operationGrid}>
                <div className={styles.operationCard}>
                  <h4>View Tables</h4>
                  <p>Browse all tables in the selected database</p>
                  <KibButtonNew size="small">Browse Tables</KibButtonNew>
                </div>
                <div className={styles.operationCard}>
                  <h4>Query Data</h4>
                  <p>Execute custom SQL queries</p>
                  <KibButtonNew size="small">Open Query Editor</KibButtonNew>
                </div>
                <div className={styles.operationCard}>
                  <h4>Export Data</h4>
                  <p>Export table data to CSV/JSON</p>
                  <KibButtonNew size="small">Export</KibButtonNew>
                </div>
                <div className={styles.operationCard}>
                  <h4>Import Data</h4>
                  <p>Import data from files</p>
                  <KibButtonNew size="small">Import</KibButtonNew>
                </div>
              </div>
            </KibSectionHeading>
          </div>
        )}

        {!isConnected && (
          <div className={styles.disconnectedMessage}>
            <p>Please connect to a database to begin managing data.</p>
          </div>
        )}
      </KibSectionHeading>
    </div>
  );
};

