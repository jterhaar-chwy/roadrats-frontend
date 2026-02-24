import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styles from '@/styles/clsManagement/clsQueueViewer.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface EnrichedOrderResult {
  whId: string | null;
  orderNumber: string | null;
  itemNumber: string | null;
  errorText: string | null;
  importStatus: string | null;
  xmlMessage: string | null;
  xmlResponse: string | null;
  insertedDatetime: string | null;
  updatedDatetime: string | null;
  clsInsertDatetime: string | null;
  shipDate: string | null;
  arriveDate: string | null;
  shipDay: string | null;
  arriveDay: string | null;
  travelDays: string | null;
  daysBetween: number | null;
  serviceLevel: string | null;
  route: string | null;
  consigneeContact: string | null;
  consigneeAddress1: string | null;
  consigneeAddress2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

interface ErrorSummaryEntry {
  errorText: string;
  totalCount: number;
  warehouseBreakdown: Record<string, number>;
}

interface ErrorSummary {
  totalOrders: number;
  ordersWithErrors: number;
  warehouses: string[];
  errors: ErrorSummaryEntry[];
}

type QueryTab = 'rate' | 'rateHold';
type ModalTab = 'summary' | 'xmlRequest' | 'xmlResponse';

const cell = (v: string | null | number | undefined): string =>
  v != null && v !== '' ? String(v) : '—';

const getStatusClass = (status: string | null): string => {
  if (!status) return '';
  const s = status.toUpperCase();
  if (s === 'XML_PARSED') return styles.statusPending;
  if (s === 'IMPORTED' || s === 'COMPLETED') return styles.statusCompleted;
  if (s.includes('ERROR') || s.includes('FAIL')) return styles.statusFailed;
  return styles.statusProcessing;
};

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text).catch(() => {});
};

interface ClsQueueViewerProps {
  onDataChange?: (data: any) => void;
}

export const ClsQueueViewer: React.FC<ClsQueueViewerProps> = ({ onDataChange }) => {
  const [results, setResults] = useState<EnrichedOrderResult[]>([]);
  const [summary, setSummary] = useState<ErrorSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeQuery, setActiveQuery] = useState<QueryTab>('rate');
  const [filterText, setFilterText] = useState('');
  const [selectedRow, setSelectedRow] = useState<EnrichedOrderResult | null>(null);
  const [modalTab, setModalTab] = useState<ModalTab>('summary');
  const [showSummary, setShowSummary] = useState(false);

  const fetchResults = useCallback(async (tab: QueryTab) => {
    setIsLoading(true);
    setError(null);
    setSummary(null);
    const endpoint = tab === 'rate' ? '/api/io/rate-query' : '/api/io/rate-hold-query';
    const summaryEndpoint = tab === 'rate' ? '/api/io/rate-query/summary' : '/api/io/rate-hold-query/summary';
    try {
      const [dataRes, summaryRes] = await Promise.all([
        fetch(`${API_BASE}${endpoint}`),
        fetch(`${API_BASE}${summaryEndpoint}`),
      ]);
      if (!dataRes.ok) {
        const body = await dataRes.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${dataRes.status}`);
      }
      const data: EnrichedOrderResult[] = await dataRes.json();
      setResults(data);
      if (summaryRes.ok) {
        const s: ErrorSummary = await summaryRes.json();
        setSummary(s);
      }
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
    setSummary(null);
    setError(null);
    setFilterText('');
    setShowSummary(false);
  };

  const handleExportCsv = () => {
    const endpoint = activeQuery === 'rate' ? '/api/io/rate-query/export' : '/api/io/rate-hold-query/export';
    window.open(`${API_BASE}${endpoint}`, '_blank');
  };

  const filteredResults = useMemo(() => {
    if (!filterText.trim()) return results;
    const lower = filterText.toLowerCase();
    return results.filter((r) =>
      Object.values(r).some(
        (v) => v != null && String(v).toLowerCase().includes(lower)
      )
    );
  }, [results, filterText]);

  const uniqueStatuses = useMemo(
    () => Array.from(new Set(results.map((r) => r.importStatus).filter(Boolean))) as string[],
    [results]
  );

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        activeQuery,
        resultsCount: results.length,
        filteredResultsCount: filteredResults.length,
        summary: summary ? {
          totalOrders: summary.totalOrders,
          ordersWithErrors: summary.ordersWithErrors,
          warehouses: summary.warehouses,
          errorsCount: summary.errors?.length || 0,
          errors: summary.errors?.slice(0, 10).map(e => ({
            errorText: e.errorText,
            totalCount: e.totalCount,
          })),
        } : null,
        error,
        isLoading,
        sampleResults: results.slice(0, 10).map(r => ({
          orderNumber: r.orderNumber,
          whId: r.whId,
          importStatus: r.importStatus,
          errorText: r.errorText ? r.errorText.substring(0, 100) : null,
        })),
      });
    }
  }, [results, summary, error, isLoading, activeQuery, filteredResults.length, onDataChange]);

  return (
    <div className={styles.queueViewer}>
      {/* Header: query tabs + actions */}
      <div className={styles.viewerHeader}>
        <div className={styles.queryTabs}>
          <KibButtonNew
            size="small"
            onClick={() => handleTabChange('rate')}
            className={activeQuery === 'rate' ? styles.active : ''}
          >
            Query Rate Queue
          </KibButtonNew>
          <KibButtonNew
            size="small"
            onClick={() => handleTabChange('rateHold')}
            className={activeQuery === 'rateHold' ? styles.active : ''}
          >
            Query Rate Hold Queue
          </KibButtonNew>
        </div>
        <div className={styles.headerActions}>
          <KibButtonNew size="medium" onClick={() => fetchResults(activeQuery)} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Fetch Results'}
          </KibButtonNew>
          {results.length > 0 && (
            <>
              <KibButtonNew size="small" onClick={handleExportCsv}>
                Export CSV
              </KibButtonNew>
              <KibButtonNew size="small" onClick={() => setShowSummary((v) => !v)}>
                {showSummary ? 'Hide Summary' : 'Error Summary'}
              </KibButtonNew>
            </>
          )}
        </div>
      </div>

      {/* Filter */}
      {results.length > 0 && (
        <div className={styles.filterBar}>
          <label htmlFor="cls-filter">Filter:</label>
          <input
            id="cls-filter"
            type="text"
            placeholder="Search across all columns..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className={styles.filterInput}
          />
          {filterText && (
            <span className={styles.filterCount}>
              {filteredResults.length} of {results.length} rows
            </span>
          )}
        </div>
      )}

      {error && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Stats */}
      <div className={styles.queueStats}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
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

      {/* Error Summary Panel */}
      {showSummary && summary && (
        <div className={styles.summaryPanel}>
          <KibSectionHeading heading="Error Summary" className={styles.summaryHeading}>
            <div className={styles.summaryMeta}>
              <span>Total Orders: <strong>{summary.totalOrders}</strong></span>
              <span>With Errors: <strong>{summary.ordersWithErrors}</strong></span>
              <span>Warehouses: <strong>{summary.warehouses?.join(', ') || '—'}</strong></span>
            </div>
            {summary.errors && summary.errors.length > 0 ? (
              <div className={styles.summaryList}>
                {summary.errors.map((e, i) => (
                  <div key={i} className={styles.summaryItem}>
                    <div className={styles.summaryErrorText}>{e.errorText}</div>
                    <div className={styles.summaryCount}>Total: {e.totalCount}</div>
                    <div className={styles.summaryWarehouses}>
                      {Object.entries(e.warehouseBreakdown).map(([wh, count]) => (
                        <span key={wh} className={styles.whBadge}>
                          {wh}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noErrors}>No error texts found in the results.</p>
            )}
          </KibSectionHeading>
        </div>
      )}

      {/* Results Table */}
      <div className={styles.queueTable}>
        <KibSectionHeading
          heading={activeQuery === 'rate' ? 'Order Import Queue — Rate' : 'Order Import Queue — Rate Hold'}
          className={styles.tableHeading}
        >
          {filteredResults.length === 0 && !isLoading ? (
            <div className={styles.emptyState}>
              <p>{results.length === 0 ? 'No results to display.' : 'No rows match the current filter.'}</p>
              {results.length === 0 && (
                <p className={styles.emptyStateSubtext}>
                  Click &quot;Fetch Results&quot; to load data from the{' '}
                  {activeQuery === 'rate' ? 'rate query' : 'rate hold query'} endpoint.
                </p>
              )}
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Warehouse</th>
                    <th>Order Number</th>
                    <th>Item Number</th>
                    <th>Error Text</th>
                    <th>Import Status</th>
                    <th>Ship Date</th>
                    <th>Arrival Date</th>
                    <th>TNT</th>
                    <th>Travel Time</th>
                    <th>Service Level</th>
                    <th>City</th>
                    <th>State</th>
                    <th>Postal Code</th>
                    <th>Route</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredResults.map((row, idx) => (
                    <tr
                      key={`${row.orderNumber}-${row.itemNumber}-${idx}`}
                      onDoubleClick={() => { setSelectedRow(row); setModalTab('summary'); }}
                      className={styles.clickableRow}
                    >
                      <td>{cell(row.whId)}</td>
                      <td>{cell(row.orderNumber)}</td>
                      <td>{cell(row.itemNumber)}</td>
                      <td className={row.errorText ? styles.errorCell : ''}>
                        {row.errorText
                          ? row.errorText.substring(0, 100) + (row.errorText.length > 100 ? '…' : '')
                          : '—'}
                      </td>
                      <td>
                        <span className={`${styles.statusBadge} ${getStatusClass(row.importStatus)}`}>
                          {cell(row.importStatus)}
                        </span>
                      </td>
                      <td>{cell(row.shipDate)}</td>
                      <td>{cell(row.arriveDate)}</td>
                      <td>{cell(row.travelDays)}</td>
                      <td>{cell(row.daysBetween)}</td>
                      <td>{cell(row.serviceLevel)}</td>
                      <td>{cell(row.city)}</td>
                      <td>{cell(row.state)}</td>
                      <td>{cell(row.postalCode)}</td>
                      <td>{cell(row.route)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </KibSectionHeading>
      </div>

      {/* Detail Modal (double-click row) */}
      {selectedRow && (
        <div className={styles.modalOverlay} onClick={() => setSelectedRow(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Order Details: {selectedRow.orderNumber}</h3>
              <div className={styles.modalHeaderActions}>
                <KibButtonNew size="small" onClick={() => copyToClipboard(selectedRow.orderNumber ?? '')}>
                  Copy Order #
                </KibButtonNew>
                <KibButtonNew size="small" onClick={() => copyToClipboard(selectedRow.whId ?? '')}>
                  Copy WH
                </KibButtonNew>
                <KibButtonNew size="small" onClick={() => copyToClipboard(selectedRow.itemNumber ?? '')}>
                  Copy Item #
                </KibButtonNew>
                <KibButtonNew size="small" onClick={() => setSelectedRow(null)}>
                  Close
                </KibButtonNew>
              </div>
            </div>

            {/* Modal Tabs */}
            <div className={styles.modalTabs}>
              <button
                className={`${styles.modalTabBtn} ${modalTab === 'summary' ? styles.modalTabActive : ''}`}
                onClick={() => setModalTab('summary')}
              >
                Summary
              </button>
              <button
                className={`${styles.modalTabBtn} ${modalTab === 'xmlRequest' ? styles.modalTabActive : ''}`}
                onClick={() => setModalTab('xmlRequest')}
              >
                XML Request
              </button>
              <button
                className={`${styles.modalTabBtn} ${modalTab === 'xmlResponse' ? styles.modalTabActive : ''}`}
                onClick={() => setModalTab('xmlResponse')}
              >
                XML Response
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Summary Tab */}
              {modalTab === 'summary' && (
                <>
                  <div className={styles.detailColumns}>
                    <div className={styles.detailColumn}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Warehouse</span>
                        <span>{cell(selectedRow.whId)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Order Number</span>
                        <span>{cell(selectedRow.orderNumber)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Item Number</span>
                        <span>{cell(selectedRow.itemNumber)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Import Status</span>
                        <span className={`${styles.statusBadge} ${getStatusClass(selectedRow.importStatus)}`}>
                          {cell(selectedRow.importStatus)}
                        </span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Ship Date</span>
                        <span>{cell(selectedRow.shipDate)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Arrival Date</span>
                        <span>{cell(selectedRow.arriveDate)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>TNT</span>
                        <span>{cell(selectedRow.travelDays)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Travel Time</span>
                        <span>{cell(selectedRow.daysBetween)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Service Level</span>
                        <span>{cell(selectedRow.serviceLevel)}</span>
                      </div>
                    </div>
                    <div className={styles.detailColumn}>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Contact</span>
                        <span>{cell(selectedRow.consigneeContact)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Address 1</span>
                        <span>{cell(selectedRow.consigneeAddress1)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Address 2</span>
                        <span>{cell(selectedRow.consigneeAddress2)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>City</span>
                        <span>{cell(selectedRow.city)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>State</span>
                        <span>{cell(selectedRow.state)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Postal Code</span>
                        <span>{cell(selectedRow.postalCode)}</span>
                      </div>
                      <div className={styles.detailItem}>
                        <span className={styles.detailLabel}>Route</span>
                        <span>{cell(selectedRow.route)}</span>
                      </div>
                    </div>
                  </div>
                  {selectedRow.errorText && (
                    <div className={styles.xmlSection}>
                      <h4>Error Text</h4>
                      <pre className={styles.xmlContent}>{selectedRow.errorText}</pre>
                    </div>
                  )}
                </>
              )}

              {/* XML Request Tab */}
              {modalTab === 'xmlRequest' && (
                <div className={styles.xmlSection}>
                  <h4>XML Request (Message)</h4>
                  <pre className={styles.xmlContent}>
                    {selectedRow.xmlMessage || 'No XML message available'}
                  </pre>
                </div>
              )}

              {/* XML Response Tab */}
              {modalTab === 'xmlResponse' && (
                <div className={styles.xmlSection}>
                  <h4>XML Response</h4>
                  <pre className={styles.xmlContent}>
                    {selectedRow.xmlResponse || 'No XML response available'}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

