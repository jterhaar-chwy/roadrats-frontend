
import React, { ReactNode } from 'react';
import styles from '@/styles/global/appLayout.module.scss';
import { KibApplicationManager } from '@chewy/kib-application-react';
import { Header } from './header';
import { Sidebar } from './sidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <KibApplicationManager>
      <div className={styles.appLayout}>
        {/* F-Shape: Top horizontal bar */}
        <Header />
        
        <div className={styles.mainContent}>
          {/* F-Shape: Left vertical sidebar */}
          <Sidebar />
          
          {/* F-Shape: Main content area */}
          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>
    </KibApplicationManager>
  );
}; 
