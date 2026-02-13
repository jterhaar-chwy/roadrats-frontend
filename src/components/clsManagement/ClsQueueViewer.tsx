import React, { useState } from 'react';
import styles from '@/styles/clsManagement/clsQueueViewer.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';

interface QueueItem {
  id: string;
  routeId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  priority: number;
  createdAt: string;
  updatedAt: string;
  data?: unknown;
}

export const ClsQueueViewer: React.FC = () => {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDatabase, setSelectedDatabase] = useState<'production' | 'staging'>('production');

  const handleRefresh = async () => {
    setIsLoading(true);
    // TODO: Replace with actual API call
    // const data = await apiGet<QueueItem[]>('/api/cls/queue');
    // setQueueItems(data);
    
    // Mock data for now
    setTimeout(() => {
      setQueueItems([]);
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className={styles.queueViewer}>
      <div className={styles.viewerHeader}>
        <div className={styles.databaseSelector}>
          <KibButtonNew 
            size="small"
            onClick={() => setSelectedDatabase('production')}
            className={selectedDatabase === 'production' ? styles.active : ''}
          >
            WMSSQL-CLS (Production)
          </KibButtonNew>
          <KibButtonNew 
            size="small"
            onClick={() => setSelectedDatabase('staging')}
            className={selectedDatabase === 'staging' ? styles.active : ''}
          >
            WMSSQL-CLS-STAGING
          </KibButtonNew>
        </div>
        <KibButtonNew size="medium" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh Queue'}
        </KibButtonNew>
      </div>

      <div className={styles.queueStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Items</div>
          <div className={styles.statValue}>{queueItems.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Pending</div>
          <div className={styles.statValue}>
            {queueItems.filter(item => item.status === 'pending').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Processing</div>
          <div className={styles.statValue}>
            {queueItems.filter(item => item.status === 'processing').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed</div>
          <div className={styles.statValue}>
            {queueItems.filter(item => item.status === 'completed').length}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Failed</div>
          <div className={styles.statValue}>
            {queueItems.filter(item => item.status === 'failed').length}
          </div>
        </div>
      </div>

      <div className={styles.queueTable}>
        <KibSectionHeading heading="Queue Items" className={styles.tableHeading}>
          {queueItems.length === 0 ? (
            <div className={styles.emptyState}>
              <p>No queue items found.</p>
              <p className={styles.emptyStateSubtext}>
                {selectedDatabase === 'production' 
                  ? 'Connect to WMSSQL-CLS database to view queue items.'
                  : 'Connect to WMSSQL-CLS-STAGING database to view queue items.'}
              </p>
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Route ID</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Created At</th>
                  <th>Updated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {queueItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.routeId}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${styles[`status${item.status.charAt(0).toUpperCase() + item.status.slice(1)}`]}`}>
                        {item.status}
                      </span>
                    </td>
                    <td>{item.priority}</td>
                    <td>{new Date(item.createdAt).toLocaleString()}</td>
                    <td>{new Date(item.updatedAt).toLocaleString()}</td>
                    <td>
                      <KibButtonNew size="small">View Details</KibButtonNew>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </KibSectionHeading>
      </div>
    </div>
  );
};

