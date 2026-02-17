
import React, { ReactNode, useState } from 'react';
import styles from '@/styles/global/appLayout.module.scss';
import { KibApplicationManager } from '@chewy/kib-application-react';
import { Header } from './header';
import { Sidebar } from './sidebar';
import { ScurryRat } from './ScurryRat';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ratsEnabled, setRatsEnabled] = useState(true);
  const [ratFrequency, setRatFrequency] = useState(3); // 1=rare, 5=swarm

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);

  return (
    <KibApplicationManager>
      <div className={styles.appLayout}>
        {/* F-Shape: Top horizontal bar */}
        <Header onToggleSidebar={toggleSidebar} sidebarOpen={sidebarOpen} />
        
        <div className={`${styles.mainContent} ${sidebarOpen ? '' : styles.sidebarCollapsed}`}>
          {/* F-Shape: Left vertical sidebar */}
          <div className={`${styles.sidebarWrapper} ${sidebarOpen ? '' : styles.hidden}`}>
            <Sidebar
              ratsEnabled={ratsEnabled}
              onToggleRats={() => setRatsEnabled((prev) => !prev)}
              ratFrequency={ratFrequency}
              onRatFrequencyChange={setRatFrequency}
            />
          </div>
          
          {/* F-Shape: Main content area */}
          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>
      {ratsEnabled && <ScurryRat frequency={ratFrequency} />}
    </KibApplicationManager>
  );
}; 
