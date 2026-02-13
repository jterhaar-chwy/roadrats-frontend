import React, { useState } from 'react';
import styles from '@/styles/clsManagement/clsManagement.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { ClsQueueViewer } from './ClsQueueViewer';
import { DatabaseManager } from './DatabaseManager';

export const ClsManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'queue' | 'database'>('queue');

  return (
    <div className={styles.clsManagement}>
      <KibSectionHeading 
        heading="CLS Route Management" 
        subheading="View and manage WMS CLS queue information and database data"
      >
        <div className={styles.tabNavigation}>
          <KibButtonNew 
            size="medium"
            onClick={() => setActiveTab('queue')}
            className={activeTab === 'queue' ? styles.activeTab : ''}
          >
            CLS Queue Viewer
          </KibButtonNew>
          <KibButtonNew 
            size="medium"
            onClick={() => setActiveTab('database')}
            className={activeTab === 'database' ? styles.activeTab : ''}
          >
            Database Manager
          </KibButtonNew>
        </div>

        <div className={styles.tabContent}>
          {activeTab === 'queue' && <ClsQueueViewer />}
          {activeTab === 'database' && <DatabaseManager />}
        </div>
      </KibSectionHeading>
    </div>
  );
};

