import React, { useState, useCallback, useRef } from 'react';
import styles from '@/styles/clsManagement/clsManagement.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { ClsQueueViewer } from './ClsQueueViewer';
import { QueueStatusPanel } from './QueueStatusPanel';
import { SaturdayDeliveryPanel } from './SaturdayDeliveryPanel';
import { DatabaseManager } from './DatabaseManager';
import { Chatbot } from '@/components/chatbot/Chatbot';

type Tab = 'debugger' | 'queueStatus' | 'saturday' | 'database';

export const ClsManagementDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('debugger');
  
  // Store data from child components
  const tabDataRef = useRef<{
    debugger?: any;
    queueStatus?: any;
    saturday?: any;
    database?: any;
  }>({});

  // Callback for child components to register their data
  const registerTabData = useCallback((tab: Tab, data: any) => {
    tabDataRef.current[tab] = data;
  }, []);

  // Extract page data for chatbot
  const getPageData = useCallback(() => {
    const currentTabData = tabDataRef.current[activeTab];
    
    return {
      activeTab,
      tabNames: {
        debugger: 'CLS Debugger',
        queueStatus: 'Queue Status',
        saturday: 'Saturday Delivery',
        database: 'Database Manager',
      },
      // Include data from the currently active tab
      currentTabData: currentTabData || null,
      // Include data from all tabs (for context)
      allTabData: {
        debugger: tabDataRef.current.debugger || null,
        queueStatus: tabDataRef.current.queueStatus || null,
        saturday: tabDataRef.current.saturday || null,
        database: tabDataRef.current.database || null,
      },
    };
  }, [activeTab]);

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
          {activeTab === 'debugger' && <ClsQueueViewer onDataChange={(data) => registerTabData('debugger', data)} />}
          {activeTab === 'queueStatus' && <QueueStatusPanel onDataChange={(data) => registerTabData('queueStatus', data)} />}
          {activeTab === 'saturday' && <SaturdayDeliveryPanel onDataChange={(data) => registerTabData('saturday', data)} />}
          {activeTab === 'database' && <DatabaseManager onDataChange={(data) => registerTabData('database', data)} />}
        </div>
      </KibSectionHeading>
      <Chatbot pageType="cls-management" getPageData={getPageData} />
    </div>
  );
};

