import React, { useState } from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { ComponentGroup, LinkedIssueWarning } from './ReleaseManagerDashboard';

interface ComponentGroupPanelProps {
  title: string;
  groups: ComponentGroup[];
  colorClass: string;
}

export const ComponentGroupPanel: React.FC<ComponentGroupPanelProps> = ({ title, groups, colorClass }) => {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (name: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const notInChgWarnings = (warnings: LinkedIssueWarning[]) =>
    warnings.filter(w => !w.inChg);

  return (
    <div className={`${styles.componentPanel} ${styles[colorClass] || ''}`}>
      <h3 className={styles.panelTitle}>{title}</h3>
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.componentName);
        const missingLinks = notInChgWarnings(group.linkedIssueWarnings);

        return (
          <div key={group.componentName} className={styles.componentGroup}>
            <div
              className={styles.componentHeader}
              onClick={() => toggleGroup(group.componentName)}
            >
              <span className={styles.expandIcon}>{isExpanded ? '\u25BC' : '\u25B6'}</span>
              <span className={styles.componentName}>{group.componentName}</span>
              <span className={styles.ticketCount}>{group.tickets.length} ticket(s)</span>
              {missingLinks.length > 0 && (
                <span className={styles.warningBadge}>{missingLinks.length} link warning(s)</span>
              )}
            </div>

            {isExpanded && (
              <div className={styles.componentBody}>
                {group.tickets.map((ticket, idx) => (
                  <div key={idx} className={styles.ticketRow}>
                    <a href={ticket.url} target="_blank" rel="noopener noreferrer" className={styles.jiraLink}>
                      {ticket.jira}
                    </a>
                    <span className={styles.ticketStatus}>{ticket.status}</span>
                    <span className={styles.ticketTeam}>{ticket.devTeam || '-'}</span>
                    <span className={styles.ticketTitle} title={ticket.title}>{ticket.title}</span>
                  </div>
                ))}

                {/* Linked issue warnings */}
                {missingLinks.length > 0 && (
                  <div className={styles.warningSection}>
                    <h5>Linked Issues NOT in CHG:</h5>
                    {missingLinks.map((w, idx) => (
                      <div key={idx} className={styles.warningItem}>
                        <span className={styles.warningSource}>{w.sourceJira}</span>
                        <span className={styles.warningRelation}>{w.relationship}</span>
                        <span className={styles.warningTarget}>{w.linkedJira}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

