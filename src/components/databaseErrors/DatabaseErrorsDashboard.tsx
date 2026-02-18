import React, { useState, useCallback, useMemo } from 'react';
import styles from '@/styles/databaseErrors/databaseErrors.module.scss';
import { ErrorsTable } from './ErrorsTable';
import { ErrorDetailPanel } from './ErrorDetailPanel';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { Chatbot } from '@/components/chatbot/Chatbot';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export interface DatabaseError {
  serverName: string;
  loggedOnLocal: string;
  machineId: string;
  userId: string;
  resourceName: string;
  details: string;
  callStack: string;
  arguments: string;
}

interface QueryResponse {
  totalErrors: number;
  days: number;
  servers: string[];
  queriedAt: string;
  errors: DatabaseError[];
}

export const DatabaseErrorsDashboard: React.FC = () => {
  const [days, setDays] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<DatabaseError[]>([]);
  const [selectedError, setSelectedError] = useState<DatabaseError | null>(null);
  const [statusMessage, setStatusMessage] = useState('Click "Query Database" to start');
  const [queryMeta, setQueryMeta] = useState<{ totalErrors: number; servers: string[]; queriedAt: string } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [serverFilter, setServerFilter] = useState('all');

  const queryDatabase = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setSelectedError(null);
    setFilterText('');
    setServerFilter('all');
    setStatusMessage('Querying servers...');

    try {
      const res = await fetch(`${API_BASE}/api/database-errors?days=${days}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }
      const data: QueryResponse = await res.json();
      setErrors(data.errors);
      setQueryMeta({
        totalErrors: data.totalErrors,
        servers: data.servers,
        queriedAt: data.queriedAt,
      });
      setStatusMessage(
        data.totalErrors > 0
          ? `Found ${data.totalErrors} error(s) across ${data.servers.length} server(s)`
          : 'No errors found'
      );
    } catch (err: any) {
      setFetchError(err.message || 'Unknown error');
      setStatusMessage('Query failed');
      setErrors([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const exportCsv = useCallback(async () => {
    if (errors.length === 0) return;
    try {
      const res = await fetch(`${API_BASE}/api/database-errors/export?days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-errors_${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setFetchError('Failed to export: ' + (err.message || 'Unknown error'));
    }
  }, [days, errors.length]);

  // Unique servers & machines from results
  const uniqueServers = useMemo(
    () => Array.from(new Set(errors.map((e) => e.serverName).filter(Boolean))),
    [errors]
  );
  const uniqueMachines = useMemo(
    () => Array.from(new Set(errors.map((e) => e.machineId).filter(Boolean))),
    [errors]
  );
  const uniqueResources = useMemo(
    () => Array.from(new Set(errors.map((e) => e.resourceName).filter(Boolean))),
    [errors]
  );

  // Filtered results
  const filteredErrors = useMemo(() => {
    let filtered = errors;

    // Server filter
    if (serverFilter !== 'all') {
      filtered = filtered.filter((e) => e.serverName === serverFilter);
    }

    // Text filter — search across all visible columns
    if (filterText.trim()) {
      const lower = filterText.toLowerCase();
      filtered = filtered.filter((e) =>
        Object.values(e).some(
          (v) => v != null && String(v).toLowerCase().includes(lower)
        )
      );
    }

    return filtered;
  }, [errors, filterText, serverFilter]);

  // Extract page data for chatbot (must be after filteredErrors, uniqueMachines, uniqueResources)
  // Limited to prevent token limit issues
  const getPageData = useCallback(() => {
    return {
      days,
      totalErrors: errors.length,
      filteredErrorsCount: filteredErrors.length,
      servers: queryMeta?.servers || [],
      uniqueMachinesCount: uniqueMachines.length,
      uniqueResourcesCount: uniqueResources.length,
      // Limit to first 30 errors with truncated fields
      errors: filteredErrors.slice(0, 30).map(e => ({
        serverName: e.serverName,
        machineId: e.machineId,
        resourceName: e.resourceName,
        userId: e.userId,
        loggedOnLocal: e.loggedOnLocal,
        // Exclude details, callStack, arguments to reduce size
      })),
      queryMeta: queryMeta ? {
        totalErrors: queryMeta.totalErrors,
        servers: queryMeta.servers,
        queriedAt: queryMeta.queriedAt,
      } : null,
      filters: {
        filterText,
        serverFilter,
      },
      selectedError: selectedError ? {
        serverName: selectedError.serverName,
        machineId: selectedError.machineId,
        resourceName: selectedError.resourceName,
      } : null,
    };
  }, [days, errors.length, filteredErrors, queryMeta, uniqueMachines, uniqueResources, 
      filterText, serverFilter, selectedError]);

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.viewerHeader}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Database Errors Monitor</h2>
          <p className={styles.subtitle}>
            Query <code>t_log_message</code> for <code>CANT_EXE_DB</code> errors across SQL Server instances
          </p>
        </div>
        <div className={styles.headerActions}>
          <div className={styles.controlGroup}>
            <label className={styles.controlLabel} htmlFor="daysInput">Days:</label>
            <input
              id="daysInput"
              type="number"
              min={1}
              max={7}
              value={days}
              onChange={(e) => setDays(Math.max(1, Math.min(7, Number(e.target.value) || 1)))}
              className={styles.daysInput}
            />
          </div>
          <KibButtonNew size="medium" onClick={queryDatabase} disabled={loading}>
            {loading ? 'Querying...' : 'Query Database'}
          </KibButtonNew>
          {errors.length > 0 && (
            <KibButtonNew size="small" onClick={exportCsv}>
              Export CSV
            </KibButtonNew>
          )}
        </div>
      </div>

      {/* Error banner */}
      {fetchError && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {fetchError}
        </div>
      )}

      {/* Stat cards */}
      <div className={styles.queueStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Errors</div>
          <div className={styles.statValue}>{errors.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Servers Queried</div>
          <div className={styles.statValue}>{queryMeta?.servers.length ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unique Machines</div>
          <div className={styles.statValue}>{uniqueMachines.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unique Resources</div>
          <div className={styles.statValue}>{uniqueResources.length}</div>
        </div>
        {uniqueServers.map((server) => (
          <div className={styles.statCard} key={server}>
            <div className={styles.statLabel}>{server}</div>
            <div className={styles.statValue}>
              {errors.filter((e) => e.serverName === server).length}
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      {errors.length > 0 && (
        <div className={styles.filterBar}>
          <label htmlFor="db-filter">Filter:</label>
          <input
            id="db-filter"
            type="text"
            placeholder="Search across all columns..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className={styles.filterInput}
          />
          <select
            value={serverFilter}
            onChange={(e) => setServerFilter(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="all">All Servers</option>
            {uniqueServers.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          {(filterText || serverFilter !== 'all') && (
            <span className={styles.filterCount}>
              {filteredErrors.length} of {errors.length} rows
            </span>
          )}
          {(filterText || serverFilter !== 'all') && (
            <button
              className={styles.filterClear}
              onClick={() => { setFilterText(''); setServerFilter('all'); }}
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Status message */}
      {!fetchError && (
        <div className={styles.statusBar}>
          <span className={styles.statusMessage}>{statusMessage}</span>
          {queryMeta && (
            <span className={styles.statusMeta}>
              Servers: {queryMeta.servers.join(', ')} &middot; Queried: {new Date(queryMeta.queriedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Table */}
      <div className={styles.queueTable}>
        <KibSectionHeading
          heading="Error Log"
          className={styles.tableHeading}
        >
          <ErrorsTable
            errors={filteredErrors}
            loading={loading}
            selectedError={selectedError}
            onSelectError={setSelectedError}
          />
        </KibSectionHeading>
      </div>

      {/* Detail panel */}
      <div className={styles.detailContainer}>
        <ErrorDetailPanel error={selectedError} />
      </div>
      <Chatbot pageType="database-errors" getPageData={getPageData} />
    </div>
  );
};
