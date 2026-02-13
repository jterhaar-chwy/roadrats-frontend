import React from 'react';
import styles from '@/styles/global/sidebar.module.scss';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';

export const Sidebar: React.FC = () => {
  return (
    <aside className={styles.sidebar}>
      {/* Quick Actions - F-shape: vertical scan area */}
      <div className={styles.section}>
        <KibSectionHeading 
          heading="Quick Actions" 
          className={styles.sectionHeading}
        >
          <div className={styles.actionList}>
            <KibButtonNew size="small" className={styles.actionButton}>
              New Query
            </KibButtonNew>
            <KibButtonNew size="small" className={styles.actionButton}>
              View Reports
            </KibButtonNew>
            <KibButtonNew size="small" className={styles.actionButton}>
              System Status
            </KibButtonNew>
          </div>
        </KibSectionHeading>
      </div>

      {/* Recent Activity Widget */}
      <div className={styles.section}>
        <KibSectionHeading 
          heading="Recent Activity" 
          className={styles.sectionHeading}
        >
          <div className={styles.activityList}>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <span className={styles.activityText}>Database query executed</span>
              <span className={styles.activityTime}>2m ago</span>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <span className={styles.activityText}>Report generated</span>
              <span className={styles.activityTime}>5m ago</span>
            </div>
            <div className={styles.activityItem}>
              <div className={styles.activityDot}></div>
              <span className={styles.activityText}>System check completed</span>
              <span className={styles.activityTime}>10m ago</span>
            </div>
          </div>
        </KibSectionHeading>
      </div>

      {/* Customizable Widget Area */}
      <div className={styles.section}>
        <KibSectionHeading 
          heading="Pinned Reports" 
          className={styles.sectionHeading}
        >
          <div className={styles.pinnedReports}>
            <div className={styles.reportCard}>
              <h4 className={styles.reportTitle}>Daily Stats</h4>
              <p className={styles.reportValue}>85%</p>
              <span className={styles.reportLabel}>Success Rate</span>
            </div>
            <div className={styles.reportCard}>
              <h4 className={styles.reportTitle}>Active Connections</h4>
              <p className={styles.reportValue}>24</p>
              <span className={styles.reportLabel}>Current</span>
            </div>
          </div>
        </KibSectionHeading>
      </div>

      {/* Status Indicators */}
      <div className={styles.section}>
        <KibSectionHeading 
          heading="System Status" 
          className={styles.sectionHeading}
        >
          <div className={styles.statusList}>
            <div className={styles.statusItem}>
              <div className={styles.statusIndicator + ' ' + styles.statusGreen}></div>
              <span>Database</span>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusIndicator + ' ' + styles.statusGreen}></div>
              <span>API Services</span>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusIndicator + ' ' + styles.statusYellow}></div>
              <span>Monitoring</span>
            </div>
          </div>
        </KibSectionHeading>
      </div>
    </aside>
  );
}; 