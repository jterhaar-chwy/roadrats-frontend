import React, { useState, useMemo } from 'react';
import styles from '@/styles/databaseErrors/databaseErrors.module.scss';
import { DatabaseError } from './DatabaseErrorsDashboard';

type SortField = 'loggedOnLocal' | 'serverName' | 'machineId' | 'userId' | 'resourceName' | 'details';
type SortDir = 'asc' | 'desc';

interface ErrorsTableProps {
  errors: DatabaseError[];
  loading: boolean;
  selectedError: DatabaseError | null;
  onSelectError: (error: DatabaseError) => void;
}

export const ErrorsTable: React.FC<ErrorsTableProps> = ({
  errors,
  loading,
  selectedError,
  onSelectError,
}) => {
  const [sortField, setSortField] = useState<SortField>('loggedOnLocal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const sortedErrors = useMemo(() => {
    return [...errors].sort((a, b) => {
      const aVal = (a[sortField] || '').toString();
      const bVal = (b[sortField] || '').toString();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [errors, sortField, sortDir]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return ' ↕';
    return sortDir === 'asc' ? ' ▲' : ' ▼';
  };

  const formatTime = (ts: string | null) => {
    if (!ts) return '—';
    try {
      const d = new Date(ts);
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const truncate = (text: string | null, maxLen: number) => {
    if (!text) return '—';
    return text.length > maxLen ? text.substring(0, maxLen) + '…' : text;
  };

  if (loading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.spinner} />
        <p>Querying servers...</p>
      </div>
    );
  }

  if (errors.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No data to display.</p>
        <p className={styles.emptyStateSubtext}>
          Click &quot;Query Database&quot; to fetch errors from the configured servers.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th onClick={() => handleSort('loggedOnLocal')} className={styles.sortable}>
              Time{sortIndicator('loggedOnLocal')}
            </th>
            <th onClick={() => handleSort('serverName')} className={styles.sortable}>
              Server{sortIndicator('serverName')}
            </th>
            <th onClick={() => handleSort('machineId')} className={styles.sortable}>
              Machine{sortIndicator('machineId')}
            </th>
            <th onClick={() => handleSort('userId')} className={styles.sortable}>
              User{sortIndicator('userId')}
            </th>
            <th onClick={() => handleSort('resourceName')} className={styles.sortable}>
              Resource{sortIndicator('resourceName')}
            </th>
            <th onClick={() => handleSort('details')} className={styles.sortable}>
              Details{sortIndicator('details')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedErrors.map((error, idx) => {
            const isSelected =
              selectedError &&
              selectedError.loggedOnLocal === error.loggedOnLocal &&
              selectedError.machineId === error.machineId &&
              selectedError.callStack === error.callStack;

            return (
              <tr
                key={idx}
                onClick={() => onSelectError(error)}
                className={`${styles.clickableRow} ${isSelected ? styles.selectedRow : ''}`}
              >
                <td className={styles.colTime}>{formatTime(error.loggedOnLocal)}</td>
                <td>
                  <span className={styles.serverBadge}>{error.serverName}</span>
                </td>
                <td>{error.machineId || '—'}</td>
                <td>{error.userId || '—'}</td>
                <td className={styles.colResource}>{error.resourceName || '—'}</td>
                <td className={styles.colDetails} title={error.details || ''}>
                  {truncate(error.details, 120)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
