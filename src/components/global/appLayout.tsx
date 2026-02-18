
import React, { ReactNode, useState } from 'react';
import styles from '@/styles/global/appLayout.module.scss';
import { KibApplicationManager } from '@chewy/kib-application-react';
import { Header } from './header';
// Sidebar kept for future use — import { Sidebar } from './sidebar';
import { ScurryRat } from './ScurryRat';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [ratsEnabled, setRatsEnabled] = useState(true);
  const [ratFrequency, setRatFrequency] = useState(3); // 1=rare, 5=swarm

  return (
    <KibApplicationManager>
      <div className={styles.appLayout}>
        <Header
          ratsEnabled={ratsEnabled}
          onToggleRats={() => setRatsEnabled((prev) => !prev)}
          ratFrequency={ratFrequency}
          onRatFrequencyChange={setRatFrequency}
        />
        
        <div className={styles.mainContent}>
          <main className={styles.contentArea}>
            {children}
          </main>
        </div>
      </div>
      {ratsEnabled && <ScurryRat frequency={ratFrequency} />}
    </KibApplicationManager>
  );
}; 
