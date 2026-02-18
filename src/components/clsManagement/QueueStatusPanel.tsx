import React, { useState, useCallback, useEffect } from 'react';
import styles from '@/styles/clsManagement/queueStatusPanel.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';

const API_BASE = 'http://localhost:8080';

interface QueueStatusItem {
  type: string | null;
  whId: string | null;
  orderNumber: string | null;
  zip: string | null;
  route: string | null;
  errorText: string | null;
}

interface XmlLogEntry {
  whId: string | null;
  orderNumber: string | null;
  requestType: string | null;
  requestSproc: string | null;
  xmlMessage: string | null;
  xmlResponse: string | null;
  errorText: string | null;
  insertDatetime: string | null;
}

interface QueueStatusResponse {
  queryTimeMs: number;
  totalStuck: number;
  counts: Record<string, number>;
  queues: Record<string, QueueStatusItem[]>;
}

const QUEUE_LABELS: Record<string, string> = {
  rate: 'Rate Queue',
  '2nd rate': '2nd Rate Queue',
  rerate: 'Rerate Queue',
  manifest: 'Manifest Queue',
  remanifest: 'Remanifest Queue',
  release: 'Release Queue',
};

type LogModalTab = 'summary' | 'xmlRequest' | 'xmlResponse';

interface QueueStatusPanelProps {
  onDataChange?: (data: any) => void;
}

export const QueueStatusPanel: React.FC<QueueStatusPanelProps> = ({ onDataChange }) => {
  const [data, setData] = useState<QueueStatusResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedQueue, setExpandedQueue] = useState<string | null>(null);
  const [xmlLogs, setXmlLogs] = useState<XmlLogEntry[]>([]);
  const [xmlLogsLoading, setXmlLogsLoading] = useState(false);
  const [xmlLogsError, setXmlLogsError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<{ orderNumber: string; whId: string } | null>(null);
  const [activeLogIndex, setActiveLogIndex] = useState(0);
  const [logModalTab, setLogModalTab] = useState<LogModalTab>('summary');

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/io/queue-status`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${res.status}`);
      }
      const json: QueueStatusResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const toggleQueue = (key: string) => {
    setExpandedQueue((prev) => (prev === key ? null : key));
  };

  const copyOrderNumbers = (items: QueueStatusItem[]) => {
    const text = items.map((i) => i.orderNumber).filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
  };

  const fetchXmlLogs = useCallback(async (orderNumber: string, whId: string) => {
    setSelectedOrder({ orderNumber, whId });
    setXmlLogsLoading(true);
    setXmlLogsError(null);
    setXmlLogs([]);
    setActiveLogIndex(0);
    setLogModalTab('summary');
    try {
      const res = await fetch(
        `${API_BASE}/api/io/xml-logs?orderNumber=${encodeURIComponent(orderNumber)}&whId=${encodeURIComponent(whId)}`
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${res.status}`);
      }
      const json: XmlLogEntry[] = await res.json();
      setXmlLogs(json);
    } catch (err) {
      setXmlLogsError(err instanceof Error ? err.message : 'Failed to fetch XML logs');
    } finally {
      setXmlLogsLoading(false);
    }
  }, []);

  const closeLogModal = () => {
    setSelectedOrder(null);
    setXmlLogs([]);
    setXmlLogsError(null);
  };

  const copyToClipboard = (text: string | null) => {
    if (text) navigator.clipboard.writeText(text).catch(() => {});
  };

  const formatXml = (xml: string | null): string => {
    if (!xml) return '';
    try {
      let formatted = '';
      let indent = 0;
      xml.replace(/>\s*</g, '><').split(/(<[^>]+>)/g).forEach((node) => {
        if (!node.trim()) return;
        if (node.match(/^<\//)) indent = Math.max(indent - 1, 0);
        formatted += '  '.repeat(indent) + node.trim() + '\n';
        if (node.match(/^<[^/!?]/) && !node.match(/\/>$/)) indent++;
      });
      return formatted.trim();
    } catch {
      return xml;
    }
  };

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        totalStuck: data?.totalStuck || 0,
        queryTimeMs: data?.queryTimeMs,
        counts: data?.counts || {},
        queuesCount: Object.keys(data?.queues || {}).length,
        sampleQueues: data ? Object.entries(data.queues).slice(0, 3).map(([key, items]) => ({
          queueName: QUEUE_LABELS[key] || key,
          queueType: key,
          count: items.length,
          sampleItems: items.slice(0, 5).map(i => ({
            orderNumber: i.orderNumber,
            whId: i.whId,
            route: i.route,
            errorText: i.errorText ? i.errorText.substring(0, 100) : null,
          })),
        })) : [],
        error,
        isLoading,
      });
    }
  }, [data, error, isLoading, onDataChange]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.description}>
          Shows orders stuck in CLS queues (attempts &gt; 2). These orders may need manual intervention.
        </p>
        <KibButtonNew size="medium" onClick={fetchStatus} disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Check Queue Status'}
        </KibButtonNew>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <div className={styles.summaryBar}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Total Stuck Orders</span>
              <span className={`${styles.summaryValue} ${data.totalStuck > 0 ? styles.warn : ''}`}>
                {data.totalStuck}
              </span>
            </div>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>Query Time</span>
              <span className={styles.summaryValue}>{data.queryTimeMs}ms</span>
            </div>
          </div>

          <div className={styles.queueGrid}>
            {Object.entries(data.counts).map(([key, count]) => {
              const items = data.queues[key] || [];
              const isExpanded = expandedQueue === key;
              return (
                <div key={key} className={`${styles.queueCard} ${count > 0 ? styles.hasStuck : ''}`}>
                  <div className={styles.queueCardHeader} onClick={() => count > 0 && toggleQueue(key)}>
                    <div>
                      <div className={styles.queueName}>{QUEUE_LABELS[key] || key}</div>
                      <div className={styles.queueType}>{key}</div>
                    </div>
                    <div className={`${styles.queueCount} ${count > 0 ? styles.countWarn : styles.countOk}`}>
                      {count}
                    </div>
                  </div>
                  {isExpanded && items.length > 0 && (
                    <div className={styles.queueDetails}>
                      <div className={styles.queueDetailsHeader}>
                        <span>{items.length} stuck order{items.length !== 1 ? 's' : ''}</span>
                        <KibButtonNew size="small" onClick={() => copyOrderNumbers(items)}>
                          Copy All
                        </KibButtonNew>
                      </div>
                      <table className={styles.queueTable}>
                        <thead>
                          <tr>
                            <th>WH ID</th>
                            <th>Order Number</th>
                            <th>Zip</th>
                            <th>Route</th>
                            <th>Error Text</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map((item, idx) => (
                            <tr
                              key={idx}
                              className={styles.clickableRow}
                              onClick={() => {
                                if (item.orderNumber && item.whId) {
                                  fetchXmlLogs(item.orderNumber, item.whId);
                                }
                              }}
                            >
                              <td>{item.whId ?? '—'}</td>
                              <td>{item.orderNumber ?? '—'}</td>
                              <td>{item.zip ?? '—'}</td>
                              <td>{item.route ?? '—'}</td>
                              <td className={item.errorText ? styles.errorCell : ''}>
                                {item.errorText
                                  ? item.errorText.substring(0, 80) + (item.errorText.length > 80 ? '…' : '')
                                  : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {!data && !isLoading && !error && (
        <div className={styles.emptyState}>
          <p>Click &quot;Check Queue Status&quot; to view stuck orders across all 6 CLS queues.</p>
        </div>
      )}

      {selectedOrder && (
        <div className={styles.modalOverlay} onClick={closeLogModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <h3 className={styles.modalTitle}>XML Logs</h3>
                <span className={styles.modalSubtitle}>
                  Order: {selectedOrder.orderNumber} &middot; WH: {selectedOrder.whId}
                </span>
              </div>
              <button className={styles.modalClose} onClick={closeLogModal}>&times;</button>
            </div>

            {xmlLogsLoading && <div className={styles.modalLoading}>Loading XML logs...</div>}

            {xmlLogsError && (
              <div className={styles.errorBanner}>
                <strong>Error:</strong> {xmlLogsError}
              </div>
            )}

            {!xmlLogsLoading && !xmlLogsError && xmlLogs.length === 0 && (
              <div className={styles.modalEmpty}>No XML log entries found for this order.</div>
            )}

            {!xmlLogsLoading && xmlLogs.length > 0 && (
              <>
                {xmlLogs.length > 1 && (
                  <div className={styles.logEntryTabs}>
                    {xmlLogs.map((log, idx) => (
                      <button
                        key={idx}
                        className={`${styles.logEntryTab} ${activeLogIndex === idx ? styles.logEntryTabActive : ''}`}
                        onClick={() => { setActiveLogIndex(idx); setLogModalTab('summary'); }}
                      >
                        {log.requestType || `Entry ${idx + 1}`}
                        {log.insertDatetime && (
                          <span className={styles.logEntryTime}>
                            {new Date(log.insertDatetime).toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {(() => {
                  const log = xmlLogs[activeLogIndex];
                  if (!log) return null;
                  return (
                    <div className={styles.logDetail}>
                      <div className={styles.logDetailTabs}>
                        <button
                          className={`${styles.logDetailTab} ${logModalTab === 'summary' ? styles.logDetailTabActive : ''}`}
                          onClick={() => setLogModalTab('summary')}
                        >
                          Summary
                        </button>
                        <button
                          className={`${styles.logDetailTab} ${logModalTab === 'xmlRequest' ? styles.logDetailTabActive : ''}`}
                          onClick={() => setLogModalTab('xmlRequest')}
                        >
                          XML Request
                        </button>
                        <button
                          className={`${styles.logDetailTab} ${logModalTab === 'xmlResponse' ? styles.logDetailTabActive : ''}`}
                          onClick={() => setLogModalTab('xmlResponse')}
                        >
                          XML Response
                        </button>
                      </div>

                      {logModalTab === 'summary' && (
                        <div className={styles.logSummary}>
                          <div className={styles.logSummaryGrid}>
                            <div className={styles.logField}>
                              <span className={styles.logFieldLabel}>Request Type</span>
                              <span className={styles.logFieldValue}>{log.requestType ?? '—'}</span>
                            </div>
                            <div className={styles.logField}>
                              <span className={styles.logFieldLabel}>Request Sproc</span>
                              <span className={styles.logFieldValue}>{log.requestSproc ?? '—'}</span>
                            </div>
                            <div className={styles.logField}>
                              <span className={styles.logFieldLabel}>Insert Datetime</span>
                              <span className={styles.logFieldValue}>
                                {log.insertDatetime ? new Date(log.insertDatetime).toLocaleString() : '—'}
                              </span>
                            </div>
                            <div className={styles.logField}>
                              <span className={styles.logFieldLabel}>WH ID</span>
                              <span className={styles.logFieldValue}>{log.whId ?? '—'}</span>
                            </div>
                            <div className={styles.logField}>
                              <span className={styles.logFieldLabel}>Order Number</span>
                              <span className={styles.logFieldValue}>{log.orderNumber ?? '—'}</span>
                            </div>
                          </div>
                          {log.errorText && (
                            <div className={styles.logErrorBlock}>
                              <span className={styles.logFieldLabel}>Error Text</span>
                              <pre className={styles.logErrorPre}>{log.errorText}</pre>
                            </div>
                          )}
                        </div>
                      )}

                      {logModalTab === 'xmlRequest' && (
                        <div className={styles.logXmlPane}>
                          <div className={styles.logXmlActions}>
                            <KibButtonNew size="small" onClick={() => copyToClipboard(log.xmlMessage)}>
                              Copy XML
                            </KibButtonNew>
                          </div>
                          <pre className={styles.logXmlPre}>
                            {log.xmlMessage ? formatXml(log.xmlMessage) : 'No XML request data'}
                          </pre>
                        </div>
                      )}

                      {logModalTab === 'xmlResponse' && (
                        <div className={styles.logXmlPane}>
                          <div className={styles.logXmlActions}>
                            <KibButtonNew size="small" onClick={() => copyToClipboard(log.xmlResponse)}>
                              Copy XML
                            </KibButtonNew>
                          </div>
                          <pre className={styles.logXmlPre}>
                            {log.xmlResponse ? formatXml(log.xmlResponse) : 'No XML response data'}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
