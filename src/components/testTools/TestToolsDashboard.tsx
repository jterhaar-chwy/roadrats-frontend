import React, { useState } from 'react';
import styles from '@/styles/testTools/testTools.module.scss';
import { OrderLookup } from './OrderLookup';
import { ShipOrder } from './ShipOrder';
import { ItemImport } from './ItemImport';

type Tab = 'lookup' | 'ship' | 'items';

const tabs: { key: Tab; label: string }[] = [
  { key: 'lookup', label: 'Order / Container Lookup' },
  { key: 'ship', label: 'Order Actions' },
  { key: 'items', label: 'Item Imports' },
];

export const TestToolsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('lookup');

  return (
    <div className={styles.dashboard}>
      <div className={styles.viewerHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Test Tools</h2>
          <p className={styles.subtitle}>Non-prod order management and diagnostics</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            className={`${styles.tab} ${activeTab === key ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'lookup' && <OrderLookup />}
        {activeTab === 'ship' && <ShipOrder />}
        {activeTab === 'items' && <ItemImport />}
      </div>
    </div>
  );
};
