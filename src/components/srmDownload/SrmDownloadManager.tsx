import React, { useState, useEffect } from 'react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import styles from '@/styles/srmDownload/srmDownload.module.scss';

interface ProcessStatus {
  step: string;
  status: 'idle' | 'running' | 'success' | 'error';
  message?: string;
  data?: any;
  errorDetails?: string;
  timestamp?: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warning' | 'success';
  message: string;
  details?: any;
}

interface Route {
  routeName: string;
  fileName: string;
  fileSize: number;
  lastModified: string;
  rowCount: number;
}

interface RouteContent {
  routeName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  rowCount: number;
  columnCount: number;
}

export const SrmDownloadManager: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [useLatestVersion, setUseLatestVersion] = useState(true);
  const [versionInput, setVersionInput] = useState('');
  const [processStatus, setProcessStatus] = useState<ProcessStatus[]>([
    { step: 'Get SRM Version', status: 'idle' },
    { step: 'Download SRM Files', status: 'idle' },
    { step: 'Copy to Local', status: 'idle' },
  ]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);
  const [routeContent, setRouteContent] = useState<RouteContent | null>(null);
  const [isLoadingRoutes, setIsLoadingRoutes] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showRoutes, setShowRoutes] = useState(true);
  const [contentSearch, setContentSearch] = useState('');
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});

  const addLog = (level: LogEntry['level'], message: string, details?: any) => {
    const logEntry: LogEntry = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      details,
    };
    setLogs(prev => [...prev, logEntry]);
    console.log(`[${logEntry.timestamp}] ${level.toUpperCase()}: ${message}`, details || '');
  };

  const updateStatus = (stepIndex: number, status: ProcessStatus['status'], message?: string, data?: any, errorDetails?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    let stepName = '';
    
    setProcessStatus(prev => {
      const updated = [...prev];
      stepName = updated[stepIndex].step;
      updated[stepIndex] = {
        ...updated[stepIndex],
        status,
        message,
        data,
        errorDetails,
        timestamp,
      };
      return updated;
    });
    
    // Add to logs
    if (status === 'error') {
      addLog('error', `${stepName}: ${message || 'Failed'}`, errorDetails || data);
    } else if (status === 'success') {
      addLog('success', `${stepName}: ${message || 'Completed'}`);
    } else if (status === 'running') {
      addLog('info', `${stepName}: ${message || 'In progress...'}`);
    }
  };

  const resetStatus = () => {
    setProcessStatus([
      { step: 'Get SRM Version', status: 'idle' },
      { step: 'Download SRM Files', status: 'idle' },
      { step: 'Copy to Local', status: 'idle' },
    ]);
    setResult(null);
    setError(null);
    setErrorDetails(null);
    setRoutes([]);
    setSelectedRoute(null);
    setRouteContent(null);
    setLogs([]);
    setContentSearch('');
    setColumnFilters({});
    addLog('info', 'Process reset - ready to start');
  };

  const loadRoutes = async () => {
    setIsLoadingRoutes(true);
    try {
      const response = await fetch('http://localhost:8080/api/srm/routes');
      if (!response.ok) {
        throw new Error('Failed to load routes');
      }
      const routesData = await response.json();
      setRoutes(routesData);
      addLog('success', `Loaded ${routesData.length} routes`);
    } catch (err: any) {
      addLog('error', 'Error loading routes', { message: err.message });
      console.error('Error loading routes:', err);
    } finally {
      setIsLoadingRoutes(false);
    }
  };

  const loadRouteContent = async (routeName: string) => {
    setIsLoadingContent(true);
    setSelectedRoute(routeName);
    try {
      const response = await fetch(`http://localhost:8080/api/srm/routes/${encodeURIComponent(routeName)}/contents`);
      if (!response.ok) {
        throw new Error('Failed to load route content');
      }
      const content = await response.json();
      setRouteContent(content);
    } catch (err: any) {
      console.error('Error loading route content:', err);
      setRouteContent(null);
    } finally {
      setIsLoadingContent(false);
    }
  };

  const executeFullProcess = async () => {
    setIsProcessing(true);
    setLogs([]);
    setError(null);
    setErrorDetails(null);
    addLog('info', 'Starting SRM download process...');

    let version: string | null = null;
    let downloadData: any = null;
    let copyData: any = null;

    try {

      // Step 1: Get SRM Version (if using latest)
      if (useLatestVersion) {
        updateStatus(0, 'running', 'Fetching latest SRM version number...');
        addLog('info', 'Calling GET /api/srm/version');
        
        try {
          const versionResponse = await fetch('http://localhost:8080/api/srm/version');
          addLog('info', `Response status: ${versionResponse.status} ${versionResponse.statusText}`);
          
          if (!versionResponse.ok) {
            let errorData: any = { error: 'Unknown error' };
            try {
              const text = await versionResponse.text();
              errorData = text ? JSON.parse(text) : { error: versionResponse.statusText };
            } catch {
              errorData = { error: versionResponse.statusText, status: versionResponse.status };
            }
            const errorMsg = `HTTP ${versionResponse.status}: ${errorData.error || versionResponse.statusText}`;
            addLog('error', 'Failed to get SRM version', errorData);
            const fullError = JSON.stringify(errorData, null, 2);
            updateStatus(0, 'error', errorMsg, null, fullError);
            throw new Error(errorMsg);
          }
          
          const versionData = await versionResponse.json();
          addLog('success', `SRM Version retrieved: ${versionData.version}`, versionData);
          version = versionData.version;
          updateStatus(0, 'success', `Version: ${version}`, versionData);
        } catch (err: any) {
          const errorMsg = err.message || 'Failed to get SRM version';
          addLog('error', 'Error getting SRM version', { message: err.message, stack: err.stack });
          updateStatus(0, 'error', errorMsg, null, err.toString());
          throw err;
        }
      } else {
        version = versionInput.trim();
        if (!version) {
          const errorMsg = 'Please enter a version number';
          addLog('error', errorMsg);
          throw new Error(errorMsg);
        }
        addLog('info', `Using specified version: ${version}`);
        updateStatus(0, 'success', `Using specified version: ${version}`);
      }

      // Step 2: Download SRM Files
      updateStatus(1, 'running', 'Downloading SRM files from WMSSQL-IS...');
      const downloadUrl = 'http://localhost:8080/api/srm/download';
      addLog('info', `Calling POST ${downloadUrl} with version: ${version}`);
      
      try {
        const downloadResponse = await fetch(downloadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        });
        
        addLog('info', `Download response status: ${downloadResponse.status} ${downloadResponse.statusText}`);
        
        if (!downloadResponse.ok) {
          let errorData: any = { error: 'Unknown error' };
          try {
            const text = await downloadResponse.text();
            errorData = text ? JSON.parse(text) : { error: downloadResponse.statusText };
          } catch {
            errorData = { error: downloadResponse.statusText, status: downloadResponse.status };
          }
          const errorMsg = `HTTP ${downloadResponse.status}: ${errorData.error || downloadResponse.statusText}`;
          addLog('error', `Failed to download SRM files from ${downloadUrl}`, { 
            url: downloadUrl,
            status: downloadResponse.status, 
            statusText: downloadResponse.statusText,
            error: errorData 
          });
          const fullError = `URL: ${downloadUrl}\nStatus: ${downloadResponse.status} ${downloadResponse.statusText}\n\n${JSON.stringify(errorData, null, 2)}`;
          updateStatus(1, 'error', errorMsg, null, fullError);
          throw new Error(errorMsg);
        }
        
        downloadData = await downloadResponse.json();
        addLog('success', `Download completed`, downloadData);
        updateStatus(1, 'success', `Downloaded ${downloadData.routeCount || downloadData.csvFileCount || 0} route files`, downloadData);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to download SRM files';
        addLog('error', 'Error downloading SRM files', { message: err.message, stack: err.stack });
        updateStatus(1, 'error', errorMsg, null, err.toString());
        throw err;
      }

      // Step 3: Copy to Local (now just verification since script handles it)
      updateStatus(2, 'running', 'Verifying files in local directory...');
      addLog('info', 'Calling POST /api/srm/copy-to-local');
      
      try {
        const copyResponse = await fetch('http://localhost:8080/api/srm/copy-to-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        addLog('info', `Copy response status: ${copyResponse.status} ${copyResponse.statusText}`);
        
        if (!copyResponse.ok) {
          let errorData: any = { error: 'Unknown error' };
          try {
            const text = await copyResponse.text();
            errorData = text ? JSON.parse(text) : { error: copyResponse.statusText };
          } catch {
            errorData = { error: copyResponse.statusText, status: copyResponse.status };
          }
          const errorMsg = `HTTP ${copyResponse.status}: ${errorData.error || copyResponse.statusText}`;
          addLog('error', 'Failed to verify files', { 
            status: copyResponse.status, 
            statusText: copyResponse.statusText,
            error: errorData 
          });
          const fullError = JSON.stringify(errorData, null, 2);
          updateStatus(2, 'error', errorMsg, null, fullError);
          throw new Error(errorMsg);
        }
        
        copyData = await copyResponse.json();
        addLog('success', `Files verified in local directory`, copyData);
        updateStatus(2, 'success', `Found ${copyData.csvFileCount || copyData.fileCount || 0} CSV files in ${copyData.localPath}`, copyData);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to verify files';
        addLog('error', 'Error verifying files', { message: err.message, stack: err.stack });
        updateStatus(2, 'error', errorMsg, null, err.toString());
        throw err;
      }

      setResult({
        version,
        download: downloadData,
        copy: copyData,
      });

      addLog('success', 'Process completed successfully!');
      
      // Load routes after successful download
      addLog('info', 'Loading route list...');
      await loadRoutes();

    } catch (err: any) {
      const errorMessage = err.message || 'An unknown error occurred';
      const fullError = err.toString() + (err.stack ? '\n\nStack:\n' + err.stack : '');
      
      setError(errorMessage);
      setErrorDetails(fullError);
      addLog('error', 'Process failed', { message: errorMessage, fullError });
      
      // Mark current step as error
      const currentStepIndex = processStatus.findIndex(s => s.status === 'running');
      if (currentStepIndex >= 0) {
        updateStatus(currentStepIndex, 'error', errorMessage, null, fullError);
      }
    } finally {
      setIsProcessing(false);
      addLog('info', 'Process finished');
    }
  };

  const getStatusIcon = (status: ProcessStatus['status']) => {
    switch (status) {
      case 'success':
        return '✓';
      case 'error':
        return '✗';
      case 'running':
        return '⟳';
      default:
        return '○';
    }
  };

  const getStatusClass = (status: ProcessStatus['status']) => {
    switch (status) {
      case 'success':
        return styles.statusSuccess;
      case 'error':
        return styles.statusError;
      case 'running':
        return styles.statusRunning;
      default:
        return styles.statusIdle;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  // Filter route content based on search and column filters
  const getFilteredContent = () => {
    if (!routeContent) return { headers: [], rows: [] };

    let filteredRows = routeContent.rows;

    // Apply column filters
    const hasColumnFilters = Object.values(columnFilters).some(filter => filter.trim() !== '');
    if (hasColumnFilters) {
      filteredRows = filteredRows.filter(row => {
        return routeContent.headers.every(header => {
          const filterValue = columnFilters[header]?.toLowerCase().trim() || '';
          if (filterValue === '') return true;
          const cellValue = (row[header] || '').toLowerCase();
          return cellValue.includes(filterValue);
        });
      });
    }

    // Apply global search
    if (contentSearch.trim() !== '') {
      const searchLower = contentSearch.toLowerCase().trim();
      filteredRows = filteredRows.filter(row => {
        return routeContent.headers.some(header => {
          const cellValue = (row[header] || '').toLowerCase();
          return cellValue.includes(searchLower);
        });
      });
    }

    return {
      headers: routeContent.headers,
      rows: filteredRows,
      rowCount: routeContent.rowCount,
      columnCount: routeContent.columnCount,
      routeName: routeContent.routeName,
    };
  };

  const filteredContent = getFilteredContent();

  // Export filtered content to CSV
  const exportToCsv = () => {
    if (!filteredContent || filteredContent.rows.length === 0) {
      addLog('warning', 'No data to export');
      return;
    }

    try {
      // CSV escape function - handles quotes and commas
      const escapeCsvField = (field: string): string => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        // If field contains comma, quote, or newline, wrap in quotes and escape quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      // Build CSV content
      const csvRows: string[] = [];
      
      // Add headers
      csvRows.push(filteredContent.headers.map(escapeCsvField).join(','));

      // Add data rows (export ALL filtered rows, not just the first 1000 displayed)
      filteredContent.rows.forEach(row => {
        const csvRow = filteredContent.headers.map(header => {
          const value = row[header] || '';
          return escapeCsvField(value);
        });
        csvRows.push(csvRow.join(','));
      });

      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with route name, timestamp, and filter info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filterInfo = contentSearch || Object.values(columnFilters).some(f => f) ? '_filtered' : '';
      const filename = `${filteredContent.routeName}${filterInfo}_${timestamp}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      addLog('success', `Exported ${filteredContent.rows.length.toLocaleString()} rows to ${filename}`);
    } catch (err: any) {
      addLog('error', 'Error exporting to CSV', { message: err.message });
      console.error('Error exporting to CSV:', err);
    }
  };

  return (
    <div className={styles.srmDownload}>
      <KibSectionHeading 
        heading="SRM File Download Manager" 
        subheading="Download SRM files and copy to localhost"
      >
        <div className={styles.content}>
          {/* Version Selection */}
          <div className={styles.versionSelection}>
            <h3>Version Selection</h3>
            <div className={styles.versionOptions}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={useLatestVersion}
                  onChange={() => setUseLatestVersion(true)}
                  disabled={isProcessing}
                />
                <span>Use Latest Version</span>
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  checked={!useLatestVersion}
                  onChange={() => setUseLatestVersion(false)}
                  disabled={isProcessing}
                />
                <span>Specify Version:</span>
              </label>
              <input
                type="text"
                value={versionInput}
                onChange={(e) => setVersionInput(e.target.value)}
                placeholder="e.g., 12101"
                disabled={isProcessing || useLatestVersion}
                className={styles.versionInput}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <KibButtonNew 
              size="large"
              onClick={executeFullProcess}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Download & Copy SRM Files'}
            </KibButtonNew>
            {!isProcessing && (result || error) && (
              <KibButtonNew 
                size="medium"
                onClick={resetStatus}
              >
                Reset
              </KibButtonNew>
            )}
            {routes.length > 0 && (
              <KibButtonNew 
                size="medium"
                onClick={loadRoutes}
                disabled={isLoadingRoutes}
              >
                {isLoadingRoutes ? 'Loading...' : 'Refresh Routes'}
              </KibButtonNew>
            )}
          </div>

          <div className={styles.statusContainer}>
            <h3>Process Status</h3>
            <div className={styles.statusList}>
              {processStatus.map((status, index) => (
                <div key={index} className={`${styles.statusItem} ${getStatusClass(status.status)}`}>
                  <span className={styles.statusIcon}>{getStatusIcon(status.status)}</span>
                  <div className={styles.statusDetails}>
                    <div className={styles.statusStep}>{status.step}</div>
                    {status.message && (
                      <div className={styles.statusMessage}>{status.message}</div>
                    )}
                    {status.errorDetails && (
                      <details className={styles.statusErrorDetails}>
                        <summary>Error Details</summary>
                        <pre>{status.errorDetails}</pre>
                      </details>
                    )}
                    {status.timestamp && (
                      <div className={styles.statusTimestamp}>{status.timestamp}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className={styles.errorContainer}>
              <h4>Error</h4>
              <p><strong>{error}</strong></p>
              {errorDetails && (
                <details className={styles.errorDetails}>
                  <summary>Error Details</summary>
                  <pre>{errorDetails}</pre>
                </details>
              )}
            </div>
          )}

          {/* Routes Table */}
          {routes.length > 0 && (
            <div className={styles.routesContainer}>
              <div className={styles.routesHeader}>
                <h3>Downloaded Routes ({routes.length})</h3>
                <KibButtonNew 
                  size="small"
                  onClick={() => setShowRoutes(!showRoutes)}
                >
                  {showRoutes ? 'Hide Routes' : 'Show Routes'}
                </KibButtonNew>
              </div>
              {showRoutes && (
              <div className={styles.tableWrapper}>
                <table className={styles.routesTable}>
                  <thead>
                    <tr>
                      <th>Route Name</th>
                      <th>File Name</th>
                      <th>Rows</th>
                      <th>File Size</th>
                      <th>Last Modified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routes.map((route) => (
                      <tr 
                        key={route.routeName}
                        className={selectedRoute === route.routeName ? styles.selectedRow : ''}
                      >
                        <td>{route.routeName}</td>
                        <td>{route.fileName}</td>
                        <td>{route.rowCount.toLocaleString()}</td>
                        <td>{formatFileSize(route.fileSize)}</td>
                        <td>{new Date(route.lastModified).toLocaleString()}</td>
                        <td>
                          <KibButtonNew 
                            size="small"
                            onClick={() => loadRouteContent(route.routeName)}
                            disabled={isLoadingContent}
                          >
                            {selectedRoute === route.routeName && isLoadingContent ? 'Loading...' : 'View'}
                          </KibButtonNew>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              )}
            </div>
          )}

          {/* Route Content Viewer */}
          {routeContent && (
            <div className={styles.contentContainer}>
              <div className={styles.contentHeader}>
                <h3>Route Content: {routeContent.routeName}</h3>
                <KibButtonNew 
                  size="small"
                  onClick={() => {
                    setSelectedRoute(null);
                    setRouteContent(null);
                    setContentSearch('');
                    setColumnFilters({});
                  }}
                >
                  Close
                </KibButtonNew>
              </div>
              <div className={styles.contentInfo}>
                <p>
                  <strong>Total Rows:</strong> {routeContent.rowCount.toLocaleString()} | 
                  <strong> Filtered Rows:</strong> {filteredContent.rows.length.toLocaleString()} | 
                  <strong> Columns:</strong> {routeContent.columnCount}
                </p>
              </div>
              
              {/* Search and Filter Controls */}
              <div className={styles.contentControls}>
                <div className={styles.searchBox}>
                  <label htmlFor="contentSearch">Search:</label>
                  <input
                    id="contentSearch"
                    type="text"
                    placeholder="Search across all columns..."
                    value={contentSearch}
                    onChange={(e) => setContentSearch(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>
                <KibButtonNew 
                  size="small"
                  onClick={() => {
                    setContentSearch('');
                    setColumnFilters({});
                  }}
                >
                  Clear Filters
                </KibButtonNew>
                <KibButtonNew 
                  size="small"
                  onClick={exportToCsv}
                  disabled={!filteredContent || filteredContent.rows.length === 0}
                >
                  Export to CSV ({filteredContent.rows.length.toLocaleString()} rows)
                </KibButtonNew>
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.contentTable}>
                  <thead>
                    <tr>
                      {filteredContent.headers.map((header, idx) => (
                        <th key={idx}>
                          <div className={styles.columnHeader}>
                            <span>{header}</span>
                            <input
                              type="text"
                              placeholder={`Filter ${header}...`}
                              value={columnFilters[header] || ''}
                              onChange={(e) => setColumnFilters({
                                ...columnFilters,
                                [header]: e.target.value
                              })}
                              className={styles.columnFilter}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.rows.slice(0, 1000).map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {filteredContent.headers.map((header, colIdx) => (
                          <td key={colIdx}>{row[header] || ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredContent.rows.length === 0 && (
                  <div className={styles.tableNote}>
                    No rows match the current filters
                  </div>
                )}
                {filteredContent.rows.length > 1000 && (
                  <div className={styles.tableNote}>
                    Showing first 1,000 of {filteredContent.rows.length.toLocaleString()} filtered rows
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Process Complete - Moved to bottom */}
          {result && !error && (
            <div className={styles.resultContainer}>
              <h4>Process Complete</h4>
              <div className={styles.resultDetails}>
                <p><strong>SRM Version:</strong> {result.version}</p>
                <p><strong>Files Downloaded:</strong> {result.download?.routeCount || 0}</p>
                <p><strong>Files Copied:</strong> {result.copy?.fileCount || 0}</p>
                <p><strong>Local Path:</strong> {result.copy?.localPath || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Detailed Logs - Moved to bottom */}
          <div className={styles.logsContainer}>
            <div className={styles.logsHeader}>
              <h3>Process Logs ({logs.length})</h3>
              <KibButtonNew 
                size="small"
                onClick={() => setShowLogs(!showLogs)}
              >
                {showLogs ? 'Hide Logs' : 'Show Logs'}
              </KibButtonNew>
            </div>
            {showLogs && (
              <div className={styles.logsContent}>
                {logs.length === 0 ? (
                  <p className={styles.noLogs}>No logs yet. Start the process to see detailed logging.</p>
                ) : (
                  <div className={styles.logsList}>
                    {logs.map((log, index) => (
                      <div key={index} className={`${styles.logEntry} ${styles[`log${log.level.charAt(0).toUpperCase() + log.level.slice(1)}`]}`}>
                        <span className={styles.logTimestamp}>[{log.timestamp}]</span>
                        <span className={styles.logLevel}>{log.level.toUpperCase()}</span>
                        <span className={styles.logMessage}>{log.message}</span>
                        {log.details && (
                          <details className={styles.logDetails}>
                            <summary>Details</summary>
                            <pre>{typeof log.details === 'string' ? log.details : JSON.stringify(log.details, null, 2)}</pre>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </KibSectionHeading>
    </div>
  );
};
