import React, { useState, useCallback } from 'react';
import styles from '@/styles/clsManagement/clsQueueViewer.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';

const API_BASE = 'http://localhost:8080';

interface OrderImportResult {
  whId: string | null;
  orderNumber: string | null;
  itemNumber: string | null;
  xmlMessage: string | null;
  xmlResponse: string | null;
  errorText: string | null;
  importStatus: string | null;
  insertedDatetime: string | null;
  updatedDatetime: string | null;
  clsInsertDatetime: string | null;
}

type QueryTab = 'rate' | 'rateHold';

const formatDatetime = (value: string | null): string => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getStatusClass = (status: string | null): string => {
  if (!status) return '';
  const s = status.toUpperCase();
  if (s === 'XML_PARSED') return styles.statusPending;
  if (s === 'IMPORTED' || s === 'COMPLETED') return styles.statusCompleted;
  if (s.includes('ERROR') || s.includes('FAIL')) return styles.statusFailed;
  return styles.statusProcessing;
};

export const ClsQueueViewer: React.FC = () => {
  const [results, setResults] = useState<OrderImportResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<QueryTab>('rate');
  const [selectedRow, setSelectedRow] = useState<OrderImportResult | null>(null);

  const fetchResults = useCallback(async (tab: QueryTab) => {
    setIsLoading(true);
    setError(null);
    const endpoint = tab === 'rate' ? '/api/io/rate-query' : '/api/io/rate-hold-query';
    try {
      const response = await fetch(`${API_BASE}${endpoint}`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${response.status}`);
      }
      const data: OrderImportResult[] = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleTabChange = (tab: QueryTab) => {
    setActiveQuery(tab);
    setResults([]);
    setError(null);
  };

  const handleRefresh = () => {
    fetchResults(activeQuery);
  };

  const uniqueStatuses = Array.from(
    new Set(results.map((r) => r.importStatus).filter(Boolean))
  ) as string[];

  return (
    <div className={styles.queueViewer}>
      <div className={styles.viewerHeader}>
        <div className={styles.queryTabs}>
          <KibButtonNew
            size="small"
            onClick={() => handleTabChange('rate')}
            className={activeQuery === 'rate' ? styles.active : ''}
          >
            Rate Query
          </KibButtonNew>
          <KibButtonNew
            size="small"
            onClick={() => handleTabChange('rateHold')}
            className={activeQuery === 'rateHold' ? styles.active : ''}
          >
            Rate Hold Query
          </KibButtonNew>
        </div>
        <KibButtonNew size="medium" onClick={handleRefresh} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Fetch Results'}
        </KibButtonNew>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className={styles.queueStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Rows</div>
          <div className={styles.statValue}>{results.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unique Orders</div>
          <div className={styles.statValue}>
            {new Set(results.map((r) => r.orderNumber).filter(Boolean)).size}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>With Errors</div>
          <div className={styles.statValue}>
            {results.filter((r) => r.errorText).length}
          </div>
        </div>
        {uniqueStatuses.map((status) => (
          <div className={styles.statCard} key={status}>
            <div className={styles.statLabel}>{status}</div>
            <div className={styles.statValue}>
              {results.filter((r) => r.importStatus === status).length}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.queueTable}>
        <KibSectionHeading
          heading={activeQuery === 'rate' ? 'Order Import Queue — Rate' : 'Order Import Queue — Rate Hold'}
          className={styles.tableHeading}
        >
          {results.length === 0 && !isLoading ? (
            <div className={styles.emptyState}>
              <p>No results to display.</p>
              <p className={styles.emptyStateSubtext}>
                Click &quot;Fetch Results&quot; to load data from the{' '}
                {activeQuery === 'rate' ? 'rate query' : 'rate hold query'} endpoint.
              </p>
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>WH ID</th>
                    <th>Order #</th>
                    <th>Item #</th>
                    <th>Import Status</th>
                    <th>Error</th>
                    <th>Inserted</th>
                    <th>Updated</th>
                    <th>CLS Insert</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={`${row.orderNumber}-${row.itemNumber}-${idx}`}>
                      <td>{row.whId ?? '—'}</td>
                      <td>{row.orderNumber ?? '—'}</td>
                      <td>{row.itemNumber ?? '—'}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(row.importStatus)}`}>
                          {row.importStatus ?? '—'}
                        </span>
                      </td>
                      <td className={row.errorText ? styles.errorCell : ''}>
                        {row.errorText ? row.errorText.substring(0, 80) + (row.errorText.length > 80 ? '…' : '') : '—'}
                      </td>
                      <td>{formatDatetime(row.insertedDatetime)}</td>
                      <td>{formatDatetime(row.updatedDatetime)}</td>
                      <td>{formatDatetime(row.clsInsertDatetime)}</td>
                      <td>
                        <KibButtonNew size="small" onClick={() => setSelectedRow(row)}>
                          View XML
                        </KibButtonNew>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KibSectionHeading>
      </div>

      {selectedRow && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRow(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Order {selectedRow.orderNumber} — Details</h3>
              <KibButtonNew size="small" onClick={() => setSelectedRow(null)}>
                Close
              </KibButtonNew>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>WH ID</span>
                  <span>{selectedRow.whId ?? '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Order #</span>
                  <span>{selectedRow.orderNumber ?? '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Item #</span>
                  <span>{selectedRow.itemNumber ?? '—'}</span>
                </div>
                <div className={styles.detailItem}>
                  <span className={styles.detailLabel}>Import Status</span>
                  <span className={`${styles.statusBadge} ${getStatusClass(selectedRow.importStatus)}`}>
                    {selectedRow.importStatus ?? '—'}
                  </span>
                </div>
              </div>

              {selectedRow.errorText && (
                <div className={styles.xmlSection}>
                  <h4>Error Text</h4>
                  <pre className={styles.xmlContent}>{selectedRow.errorText}</pre>
                </div>
              )}

              <div className={styles.xmlSection}>
                <h4>XML Message</h4>
                <pre className={styles.xmlContent}>
                  {selectedRow.xmlMessage || 'No XML message available'}
                </pre>
              </div>

              <div className={styles.xmlSection}>
                <h4>XML Response</h4>
                <pre className={styles.xmlContent}>
                  {selectedRow.xmlResponse || 'No XML response available'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

