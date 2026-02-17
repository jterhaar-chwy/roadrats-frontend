import React, { useState } from 'react';
import styles from '@/styles/clsManagement/clsManagement.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { ClsQueueViewer } from './ClsQueueViewer';
import { QueueStatusPanel } from './QueueStatusPanel';
import { SaturdayDeliveryPanel } from './SaturdayDeliveryPanel';
import { DatabaseManager } from './DatabaseManager';

type Tab = 'debugger' | 'queueStatus' | 'saturday' | 'database';

export const ClsManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('debugger');

  return (
    <div className={styles.clsManagement}>
      <KibSectionHeading 
        heading="CLS Route Management" 
        subheading="View and manage WMS CLS queue information and database data"
      >
        <div className={styles.tabNavigation}>
          <KibButtonNew 
            size="medium"
            onClick={() => setActiveTab('debugger')}
            className={activeTab === 'debugger' ? styles.activeTab : ''}
          >
            CLS Debugger
          </KibButtonNew>
          <KibButtonNew 
            size="medium"
            onClick={() => setActiveTab('queueStatus')}
            className={activeTab === 'queueStatus' ? styles.activeTab : ''}
          >
            Queue Status
          </KibButtonNew>
          <KibButtonNew 
            size="medium"
            onClick={() => setActiveTab('saturday')}
            className={activeTab === 'saturday' ? styles.activeTab : ''}
          >
            Saturday Delivery
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
          {activeTab === 'debugger' && <ClsQueueViewer />}
          {activeTab === 'queueStatus' && <QueueStatusPanel />}
          {activeTab === 'saturday' && <SaturdayDeliveryPanel />}
          {activeTab === 'database' && <DatabaseManager />}
        </div>
      </KibSectionHeading>
    </div>
  );
};

