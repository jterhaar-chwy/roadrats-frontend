import React, { useState, useCallback, useMemo } from 'react';
import styles from '@/styles/testTools/testTools.module.scss';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface TableResult {
  name: string;
  displayName: string;
  source: string;
  group: string;
  columns: string[];
  rows: Record<string, any>[];
  rowCount: number;
  error?: string;
}

interface LookupResult {
  searchType: string;
  searchValue: string;
  stack: string;
  warehouseId?: string;
  orderNumber?: string;
  containerId?: string;
  aadConnection?: string;
  ioConnection?: string;
  tables?: TableResult[];
  error?: string;
}

type SearchType = 'order' | 'container' | 'oms';
type Stack = 'aad' | 'io' | 'both';

export const OrderLookup: React.FC = () => {
  const [searchType, setSearchType] = useState<SearchType>('order');
  const [warehouseId, setWarehouseId] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [stack, setStack] = useState<Stack>('both');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());

  const executeSearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    if (searchType !== 'oms' && !warehouseId.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setExpandedTables(new Set());

    try {
      const params = new URLSearchParams({
        type: searchType,
        value: searchValue.trim(),
        warehouseId: warehouseId.trim(),
        stack,
      });
      const res = await fetch(`${API_BASE}/api/test-tools/lookup?${params}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || errBody.message || `HTTP ${res.status}`);
      }
      const data: LookupResult = await res.json();
      setResult(data);

      if (data.tables) {
        const withData = new Set(data.tables.filter(t => t.rowCount > 0).map(t => t.name));
        setExpandedTables(withData);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchType, searchValue, warehouseId, stack]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') executeSearch();
  };

  const toggleTable = (name: string) => {
    setExpandedTables(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const expandAll = () => {
    if (result?.tables) setExpandedTables(new Set(result.tables.map(t => t.name)));
  };
  const collapseAll = () => setExpandedTables(new Set());
  const expandWithData = () => {
    if (result?.tables) setExpandedTables(new Set(result.tables.filter(t => t.rowCount > 0).map(t => t.name)));
  };

  const canSearch = searchValue.trim() && (searchType === 'oms' || warehouseId.trim());

  // Group tables by source for display
  const groupedTables = useMemo(() => {
    if (!result?.tables) return [];

    const sources = new Map<string, { label: string; groups: Map<string, TableResult[]> }>();

    for (const table of result.tables) {
      const src = table.source || 'Unknown';
      if (!sources.has(src)) {
        const label = src === 'AAD'
          ? 'AAD Stack (WMSSQL-TEST / AAD)'
          : src === 'IO'
          ? 'IO Stack (WMSSQL-IO-TEST / AAD_IMPORT_ORDER)'
          : src;
        sources.set(src, { label, groups: new Map() });
      }
      const srcEntry = sources.get(src)!;
      const grp = table.group || 'Other';
      if (!srcEntry.groups.has(grp)) srcEntry.groups.set(grp, []);
      srcEntry.groups.get(grp)!.push(table);
    }

    return Array.from(sources.entries()).map(([key, val]) => ({
      source: key,
      label: val.label,
      groups: Array.from(val.groups.entries()).map(([grpName, tables]) => ({
        name: grpName,
        tables,
      })),
    }));
  }, [result]);

  const totalRows = result?.tables?.reduce((sum, t) => sum + t.rowCount, 0) ?? 0;
  const tablesWithData = result?.tables?.filter(t => t.rowCount > 0).length ?? 0;

  return (
    <div className={styles.lookupPanel}>
      {/* Search Controls */}
      <div className={styles.searchPanel}>
        <div className={styles.searchRow}>
          <select
            className={styles.searchSelect}
            value={searchType}
            onChange={e => setSearchType(e.target.value as SearchType)}
          >
            <option value="order">Order Number</option>
            <option value="container">Container ID</option>
            <option value="oms">OMS Order Number</option>
          </select>

          {searchType !== 'oms' && (
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Warehouse ID (e.g. CFF1)"
              value={warehouseId}
              onChange={e => setWarehouseId(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              style={{ maxWidth: 160 }}
            />
          )}

          <input
            className={styles.searchInput}
            type="text"
            placeholder={
              searchType === 'order' ? 'Order number...' :
              searchType === 'container' ? 'Container ID...' :
              'OMS order number...'
            }
            value={searchValue}
            onChange={e => setSearchValue(e.target.value)}
            onKeyDown={handleKeyDown}
            style={{ flex: 1 }}
          />

          <div className={styles.stackToggle}>
            {(['aad', 'io', 'both'] as Stack[]).map(s => (
              <button
                key={s}
                className={`${styles.stackBtn} ${stack === s ? styles.stackBtnActive : ''}`}
                onClick={() => setStack(s)}
              >
                {s === 'aad' ? 'AAD' : s === 'io' ? 'IO' : 'Both'}
              </button>
            ))}
          </div>

          <button
            className={styles.searchBtn}
            onClick={executeSearch}
            disabled={!canSearch || loading}
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner} />
          <span>Querying {stack === 'both' ? 'AAD + IO databases' : stack === 'aad' ? 'AAD database' : 'IO database'}...</span>
        </div>
      )}

      {result && !loading && (
        <>
          {/* Summary Banner */}
          <div className={styles.summaryBanner}>
            {/* Connection details */}
            {(result.aadConnection || result.ioConnection) && (
              <div className={styles.connectionInfo}>
                {result.aadConnection && (
                  <span className={styles.connectionTag}>
                    <strong>AAD:</strong> {result.aadConnection}
                  </span>
                )}
                {result.ioConnection && (
                  <span className={styles.connectionTag}>
                    <strong>IO:</strong> {result.ioConnection}
                  </span>
                )}
              </div>
            )}
            <div className={styles.summaryItems}>
              {result.warehouseId && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Warehouse</span>
                  <span className={styles.summaryValue}>{result.warehouseId}</span>
                </div>
              )}
              {result.orderNumber && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Order Number</span>
                  <span className={styles.summaryValue}>{result.orderNumber}</span>
                </div>
              )}
              {result.containerId && (
                <div className={styles.summaryItem}>
                  <span className={styles.summaryLabel}>Container ID</span>
                  <span className={styles.summaryValue}>{result.containerId}</span>
                </div>
              )}
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Tables with Data</span>
                <span className={styles.summaryValue}>{tablesWithData} / {result.tables?.length ?? 0}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Rows</span>
                <span className={styles.summaryValue}>{totalRows}</span>
              </div>
            </div>
            {result.error && <div className={styles.summaryWarning}>{result.error}</div>}
          </div>

          {/* Table Controls */}
          {result.tables && result.tables.length > 0 && (
            <div className={styles.tableControls}>
              <button className={styles.controlBtn} onClick={expandAll}>Expand All</button>
              <button className={styles.controlBtn} onClick={expandWithData}>With Data Only</button>
              <button className={styles.controlBtn} onClick={collapseAll}>Collapse All</button>
            </div>
          )}

          {/* Grouped Table Sections */}
          {groupedTables.map(sourceGroup => (
            <div key={sourceGroup.source} className={styles.sourceGroup}>
              {groupedTables.length > 1 && (
                <div className={styles.sourceHeader}>
                  <span className={`${styles.sourceBadge} ${sourceGroup.source === 'AAD' ? styles.sourceBadgeAad : styles.sourceBadgeIo}`}>
                    {sourceGroup.source}
                  </span>
                  <span className={styles.sourceLabel}>{sourceGroup.label}</span>
                </div>
              )}

              {sourceGroup.groups.map(grp => (
                <div key={grp.name} className={styles.tableGroup}>
                  <div className={styles.groupHeader}>{grp.name}</div>

                  {grp.tables.map(table => (
                    <div key={table.name} className={`${styles.tableSection} ${table.error ? styles.tableSectionError : ''}`}>
                      <button className={styles.tableSectionHeader} onClick={() => toggleTable(table.name)}>
                        <span className={styles.tableSectionToggle}>
                          {expandedTables.has(table.name) ? '\u25BC' : '\u25B6'}
                        </span>
                        <span className={styles.tableSectionName}>{table.displayName}</span>
                        {groupedTables.length <= 1 && (
                          <span className={`${styles.sourceBadgeInline} ${table.source === 'AAD' ? styles.sourceBadgeAad : styles.sourceBadgeIo}`}>
                            {table.source}
                          </span>
                        )}
                        <span className={`${styles.tableSectionBadge} ${table.rowCount > 0 ? styles.badgeActive : styles.badgeEmpty}`}>
                          {table.rowCount} row{table.rowCount !== 1 ? 's' : ''}
                        </span>
                        {table.error && (
                          <span className={styles.tableSectionBadge} style={{ background: '#f8d7da', color: '#842029' }}>
                            Error
                          </span>
                        )}
                      </button>

                      {expandedTables.has(table.name) && (
                        <div className={styles.tableSectionContent}>
                          {table.error && <div className={styles.tableError}>{table.error}</div>}
                          {table.rowCount === 0 && !table.error && (
                            <div className={styles.tableEmpty}>No records found</div>
                          )}
                          {table.rowCount > 0 && (
                            <div className={styles.dataTableWrapper}>
                              <table className={styles.dataTable}>
                                <thead>
                                  <tr>
                                    {table.columns.map(col => (
                                      <th key={col}>{col}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {table.rows.map((row, idx) => (
                                    <tr key={idx}>
                                      {table.columns.map(col => (
                                        <td key={col}>
                                          {row[col] === null
                                            ? <span className={styles.nullValue}>NULL</span>
                                            : String(row[col])}
                                        </td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
};
