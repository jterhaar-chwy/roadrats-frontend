import React, { useState, useMemo } from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { JiraTicket } from './ReleaseManagerDashboard';

type SortField = 'jira' | 'assignee' | 'devTeam' | 'status' | 'title' | 'architect' | 'ddl' | 'web';
type SortDir = 'asc' | 'desc';

interface TicketTableProps {
  tickets: JiraTicket[];
  chgKeys: Set<string>;
}

const cell = (v: string | null | undefined): string =>
  v != null && v !== '' ? String(v) : '\u2014';

export const TicketTable: React.FC<TicketTableProps> = ({ tickets, chgKeys }) => {
  const [sortField, setSortField] = useState<SortField>('jira');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterText, setFilterText] = useState('');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const filteredTickets = useMemo(() => {
    if (!filterText.trim()) return tickets;
    const lower = filterText.toLowerCase();
    return tickets.filter(t =>
      Object.values(t).some(v =>
        v != null && String(v).toLowerCase().includes(lower)
      )
    );
  }, [tickets, filterText]);

  const sortedTickets = useMemo(() => {
    return [...filteredTickets].sort((a, b) => {
      const aVal = ((a as any)[sortField] || '').toString();
      const bVal = ((b as any)[sortField] || '').toString();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredTickets, sortField, sortDir]);

  const sortIndicator = (field: SortField) => {
    if (sortField === field) return sortDir === 'asc' ? ' \u25B2' : ' \u25BC';
    return ' \u2195';
  };

  return (
    <div>
      <div className={styles.filterBar}>
        <label htmlFor="ticket-filter">Filter:</label>
        <input
          id="ticket-filter"
          type="text"
          placeholder="Search across all columns..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className={styles.filterInput}
        />
        <span className={styles.filterCount}>{filteredTickets.length} of {tickets.length} tickets</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.ticketTable}>
          <thead>
            <tr>
              <th onClick={() => handleSort('jira')} className={styles.sortable}>Key{sortIndicator('jira')}</th>
              <th onClick={() => handleSort('assignee')} className={styles.sortable}>Assignee{sortIndicator('assignee')}</th>
              <th onClick={() => handleSort('devTeam')} className={styles.sortable}>Team{sortIndicator('devTeam')}</th>
              <th onClick={() => handleSort('status')} className={styles.sortable}>Status{sortIndicator('status')}</th>
              <th onClick={() => handleSort('title')} className={styles.sortable}>Title{sortIndicator('title')}</th>
              <th onClick={() => handleSort('architect')} className={styles.sortable}>Architect{sortIndicator('architect')}</th>
              <th onClick={() => handleSort('ddl')} className={styles.sortable}>DDL{sortIndicator('ddl')}</th>
              <th onClick={() => handleSort('web')} className={styles.sortable}>Web{sortIndicator('web')}</th>
              <th>Links</th>
            </tr>
          </thead>
          <tbody>
            {sortedTickets.map((ticket) => {
              const isExpanded = expandedRow === ticket.jira;
              const linkedEntries = ticket.linkedIssues ? Object.entries(ticket.linkedIssues) : [];
              const hasMissingLinks = linkedEntries.some(([, keys]) =>
                keys.some(k => !chgKeys.has(k))
              );

              return (
                <React.Fragment key={ticket.jira}>
                  <tr
                    className={`${styles.tableRow} ${isExpanded ? styles.selectedRow : ''} ${hasMissingLinks ? styles.warningRow : ''}`}
                    onClick={() => setExpandedRow(isExpanded ? null : ticket.jira)}
                  >
                    <td>
                      <a href={ticket.url} target="_blank" rel="noopener noreferrer" className={styles.jiraLink}
                         onClick={(e) => e.stopPropagation()}>
                        {ticket.jira}
                      </a>
                    </td>
                    <td>{cell(ticket.assignee)}</td>
                    <td>{cell(ticket.devTeam)}</td>
                    <td><span className={styles.statusBadge}>{cell(ticket.status)}</span></td>
                    <td className={styles.colTitle} title={ticket.title}>{cell(ticket.title)}</td>
                    <td>{cell(ticket.architect)}</td>
                    <td>{cell(ticket.ddl)}</td>
                    <td>{cell(ticket.web)}</td>
                    <td>{linkedEntries.length > 0 ? `${linkedEntries.reduce((s, [,v]) => s + v.length, 0)} link(s)` : '\u2014'}</td>
                  </tr>

                  {/* Expanded detail row */}
                  {isExpanded && (
                    <tr className={styles.expandedRow}>
                      <td colSpan={9}>
                        <div className={styles.expandedContent}>
                          <div className={styles.expandedSection}>
                            <strong>Downtime:</strong> {ticket.downtimeRequired || 'Not specified'}
                          </div>
                          <div className={styles.expandedSection}>
                            <strong>Labels:</strong> {ticket.labels || 'None'}
                          </div>
                          <div className={styles.expandedSection}>
                            <strong>DML:</strong> {cell(ticket.dml)} |{' '}
                            <strong>Gateway:</strong> {cell(ticket.chewyWmsGateway)} |{' '}
                            <strong>Fitnesse:</strong> {cell(ticket.fitnesse)} |{' '}
                            <strong>Non-Standard:</strong> {cell(ticket.nonStandard)}
                          </div>
                          {linkedEntries.length > 0 && (
                            <div className={styles.expandedSection}>
                              <strong>Linked Issues:</strong>
                              {linkedEntries.map(([rel, keys]) => (
                                <div key={rel} className={styles.linkedGroup}>
                                  <em>{rel}:</em>{' '}
                                  {keys.map(k => (
                                    <span
                                      key={k}
                                      className={chgKeys.has(k) ? styles.linkInChg : styles.linkNotInChg}
                                    >
                                      {k}{chgKeys.has(k) ? '' : ' (NOT IN CHG)'}
                                    </span>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                          {ticket.description && (
                            <div className={styles.expandedSection}>
                              <strong>Description:</strong>
                              <pre className={styles.preBlock}>{ticket.description}</pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

