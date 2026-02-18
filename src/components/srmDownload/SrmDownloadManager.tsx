import React, { useState, useEffect, useCallback } from 'react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { Chatbot } from '@/components/chatbot/Chatbot';
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
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [expandedRoute, setExpandedRoute] = useState<string | null>(null);
  const [validationSearch, setValidationSearch] = useState('');
  const [validationFilters, setValidationFilters] = useState<Record<string, string>>({});

  // Extract page data for chatbot (with size limits to prevent token issues)
  const getPageData = useCallback(() => {
    // Limit routes to first 20
    const limitedRoutes = routes.slice(0, 20).map(r => ({
      routeName: r.routeName,
      fileName: r.fileName,
      fileSize: r.fileSize,
      lastModified: r.lastModified,
      rowCount: r.rowCount,
    }));

    // Limit validation results size
    let limitedValidationResults = null;
    if (validationResults) {
      limitedValidationResults = {
        ...validationResults,
        // If validationResults has arrays, limit them
        errors: validationResults.errors ? validationResults.errors.slice(0, 50) : undefined,
        warnings: validationResults.warnings ? validationResults.warnings.slice(0, 50) : undefined,
      };
    }

    // Limit logs to last 10 (most recent)
    const limitedLogs = logs.slice(-10).map(log => ({
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      // Exclude details to reduce size
    }));

    return {
      processStatus: processStatus.map(status => ({
        step: status.step,
        status: status.status,
        message: status.message ? status.message.substring(0, 200) : undefined, // Limit message length
      })),
      result: result ? {
        success: result.success,
        message: result.message ? String(result.message).substring(0, 200) : undefined,
        // Exclude large data fields
      } : null,
      error: error ? error.substring(0, 200) : null,
      errorDetails: errorDetails ? String(errorDetails).substring(0, 500) : null,
      routes: limitedRoutes,
      routesCount: routes.length, // Include total count
      selectedRoute,
      routeContent: routeContent ? {
        routeName: routeContent.routeName,
        rowCount: routeContent.rowCount,
        columnCount: routeContent.columnCount,
        headers: routeContent.headers,
        sampleRows: routeContent.rows.slice(0, 5), // Limit to first 5 rows only
      } : null,
      validationResults: limitedValidationResults,
      validationError: validationError ? validationError.substring(0, 200) : null,
      logs: limitedLogs,
      logsCount: logs.length, // Include total count
      filters: {
        contentSearch,
        columnFilters,
        validationSearch,
        validationFilters,
      },
    };
  }, [processStatus, result, error, errorDetails, routes, selectedRoute, routeContent, 
      validationResults, validationError, logs, contentSearch, columnFilters, 
      validationSearch, validationFilters]);

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
    setValidationResults(null);
    setValidationError(null);
    setExpandedRoute(null);
    addLog('info', 'Process reset - ready to start');
  };

  const validateSrmFiles = async () => {
    setIsValidating(true);
    setValidationError(null);
    setValidationResults(null);
    addLog('info', 'Starting SRM validation...');

    try {
      const response = await fetch('http://localhost:8080/api/srm/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      addLog('info', `Validation response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorData: any = { error: 'Unknown error' };
        try {
          const text = await response.text();
          errorData = text ? JSON.parse(text) : { error: response.statusText };
        } catch {
          errorData = { error: response.statusText, status: response.status };
        }
        const errorMsg = `HTTP ${response.status}: ${errorData.error || response.statusText}`;
        addLog('error', 'Validation failed', errorData);
        setValidationError(errorMsg);
        throw new Error(errorMsg);
      }

      const data = await response.json();
      addLog('success', 'Validation completed', data);
      setValidationResults(data);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to validate SRM files';
      addLog('error', 'Error validating SRM files', { message: err.message, stack: err.stack });
      setValidationError(errorMsg);
    } finally {
      setIsValidating(false);
    }
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

  const loadExistingFiles = async () => {
    setIsProcessing(true);
    setLogs([]);
    setError(null);
    setErrorDetails(null);
    addLog('info', 'Loading existing SRM files...');

    let downloadData: any = null;
    let copyData: any = null;

    try {
      // Step 1: Load existing files
      updateStatus(0, 'running', 'Checking for existing SRM files...');
      addLog('info', 'Calling POST /api/srm/load-existing');
      
      try {
        const loadResponse = await fetch('http://localhost:8080/api/srm/load-existing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        
        addLog('info', `Load existing response status: ${loadResponse.status} ${loadResponse.statusText}`);
        
        if (!loadResponse.ok) {
          let errorData: any = { error: 'Unknown error' };
          try {
            const text = await loadResponse.text();
            errorData = text ? JSON.parse(text) : { error: loadResponse.statusText };
          } catch {
            errorData = { error: loadResponse.statusText, status: loadResponse.status };
          }
          const errorMsg = `HTTP ${loadResponse.status}: ${errorData.error || loadResponse.statusText}`;
          addLog('error', 'Failed to load existing files', errorData);
          const fullError = JSON.stringify(errorData, null, 2);
          updateStatus(0, 'error', errorMsg, null, fullError);
          throw new Error(errorMsg);
        }
        
        const loadData = await loadResponse.json();
        downloadData = loadData.download || {};
        copyData = loadData.copy || {};
        
        addLog('success', 'Existing files loaded', loadData);
        updateStatus(0, 'success', `Found ${copyData.csvFileCount || copyData.fileCount || 0} existing route files`, loadData);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to load existing files';
        addLog('error', 'Error loading existing files', { message: err.message, stack: err.stack });
        updateStatus(0, 'error', errorMsg, null, err.toString());
        throw err;
      }

      // Step 2: Verify files
      updateStatus(1, 'running', 'Verifying files...');
      if (copyData && copyData.success) {
        addLog('success', `Files verified in local directory`, copyData);
        updateStatus(1, 'success', `Found ${copyData.csvFileCount || copyData.fileCount || 0} CSV files in ${copyData.localPath}`, copyData);
      } else {
        updateStatus(1, 'success', 'Files verified', copyData);
      }

      // Step 3: Mark copy step as complete
      updateStatus(2, 'success', 'Process complete', copyData);

      setResult({
        version: 'existing',
        download: downloadData,
        copy: copyData,
      });

      addLog('success', 'Existing files loaded successfully!');
      
      // Load routes after successful load
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
      addLog('info', 'Calling POST /api/srm/execute-full-process');
      
      try {
        const fullProcessResponse = await fetch('http://localhost:8080/api/srm/execute-full-process', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ version }),
        });
        
        addLog('info', `Full process response status: ${fullProcessResponse.status} ${fullProcessResponse.statusText}`);
        
        if (!fullProcessResponse.ok) {
          let errorData: any = { error: 'Unknown error' };
          try {
            const text = await fullProcessResponse.text();
            errorData = text ? JSON.parse(text) : { error: fullProcessResponse.statusText };
          } catch {
            errorData = { error: fullProcessResponse.statusText, status: fullProcessResponse.status };
          }
          const errorMsg = `HTTP ${fullProcessResponse.status}: ${errorData.error || fullProcessResponse.statusText}`;
          addLog('error', `Failed to execute SRM process`, { 
            status: fullProcessResponse.status, 
            statusText: fullProcessResponse.statusText,
            error: errorData 
          });
          const fullError = `Status: ${fullProcessResponse.status} ${fullProcessResponse.statusText}\n\n${JSON.stringify(errorData, null, 2)}`;
          updateStatus(1, 'error', errorMsg, null, fullError);
          throw new Error(errorMsg);
        }
        
        const fullProcessData = await fullProcessResponse.json();
        downloadData = fullProcessData.download || {};
        copyData = fullProcessData.copy || {};
        
        addLog('success', `Download completed`, downloadData);
        updateStatus(1, 'success', `Downloaded ${downloadData.routeCount || downloadData.csvFileCount || 0} route files`, downloadData);
      } catch (err: any) {
        const errorMsg = err.message || 'Failed to download SRM files';
        addLog('error', 'Error downloading SRM files', { message: err.message, stack: err.stack });
        updateStatus(1, 'error', errorMsg, null, err.toString());
        throw err;
      }

      // Step 3: Verify files in local directory
      updateStatus(2, 'running', 'Verifying files in local directory...');
      
      if (copyData && copyData.success) {
        addLog('success', `Files verified in local directory`, copyData);
        updateStatus(2, 'success', `Found ${copyData.csvFileCount || copyData.fileCount || 0} CSV files in ${copyData.localPath}`, copyData);
      } else {
        // Fallback: call copy endpoint if not already available
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

  // Filter validation results based on search and column filters
  const getFilteredValidationResults = () => {
    if (!validationResults || !validationResults.validationResults) {
      return [];
    }

    let filtered = validationResults.validationResults;

    // Apply column filters (only for Shipper, Route, and Service)
    const hasColumnFilters = Object.values(validationFilters).some(filter => filter.trim() !== '');
    if (hasColumnFilters) {
      filtered = filtered.filter((summary: any) => {
        const shipper = (summary.shipper || '').toLowerCase();
        const route = (summary.route || summary.defaultRoute || '').toLowerCase();
        const service = (summary.service || '').toLowerCase();

        const shipperFilter = (validationFilters.shipper || '').toLowerCase().trim();
        const routeFilter = (validationFilters.route || '').toLowerCase().trim();
        const serviceFilter = (validationFilters.service || '').toLowerCase().trim();

        return (!shipperFilter || shipper.includes(shipperFilter)) &&
               (!routeFilter || route.includes(routeFilter)) &&
               (!serviceFilter || service.includes(serviceFilter));
      });
    }

    // Apply global search
    if (validationSearch.trim() !== '') {
      const searchLower = validationSearch.toLowerCase().trim();
      filtered = filtered.filter((summary: any) => {
        const shipper = (summary.shipper || '').toLowerCase();
        const route = (summary.route || summary.defaultRoute || '').toLowerCase();
        const service = (summary.service || '').toLowerCase();
        const postalCodeCount = String(summary.postalCodeCount || '');
        const transitDays = String(summary.transitDays || '');
        const changeType = (summary.changeType || '').toLowerCase();

        return shipper.includes(searchLower) ||
               route.includes(searchLower) ||
               service.includes(searchLower) ||
               postalCodeCount.includes(searchLower) ||
               transitDays.includes(searchLower) ||
               changeType.includes(searchLower);
      });
    }

    return filtered;
  };

  const filteredValidationResults = getFilteredValidationResults();

  // Export validation results to CSV (includes both summary and details)
  const exportValidationResultsToCsv = () => {
    if (!filteredValidationResults || filteredValidationResults.length === 0) {
      addLog('warning', 'No validation results to export');
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
      
      // Headers: Summary columns + Detail columns
      const headers = [
        'Shipper',
        'Route',
        'Service',
        'Postal Code Count',
        'Transit Days',
        'Detail Postal Code',
        'Detail Change Type',
        'Detail Transit Days',
        'Detail Default Route',
        'Old Transit Days',
        'Old Default Route'
      ];
      csvRows.push(headers.map(escapeCsvField).join(','));

      // For each summary, add summary row and all detail rows
      filteredValidationResults.forEach((summary: any) => {
        // Get transit days display value
        let transitDaysValue = '';
        if (summary.transitDays !== undefined && summary.transitDays !== null) {
          transitDaysValue = String(summary.transitDays);
        } else if (summary.differences && summary.differences.length > 0) {
          transitDaysValue = String(summary.differences[0].transitDays);
        } else {
          transitDaysValue = '-';
        }

        // Summary row (detail columns are empty)
        const summaryRow = [
          summary.shipper || '',
          summary.route || summary.defaultRoute || '',
          summary.service || '',
          summary.postalCodeCount || 0,
          transitDaysValue,
          '', // Detail Postal Code
          '', // Detail Change Type
          '', // Detail Transit Days
          '', // Detail Default Route
          '', // Old Transit Days
          ''  // Old Default Route
        ];
        csvRows.push(summaryRow.map(escapeCsvField).join(','));

        // Detail rows (one for each difference)
        if (summary.differences && summary.differences.length > 0) {
          summary.differences.forEach((diff: any) => {
            const oldTransitDays = diff.oldValue?.transitDays || '';
            const oldDefaultRoute = diff.oldValue?.defaultRoute || '';
            const detailRow = [
              summary.shipper || '',
              summary.route || summary.defaultRoute || '',
              summary.service || '',
              summary.postalCodeCount || 0,
              transitDaysValue,
              diff.postalCode || '',
              diff.changeType || '',
              diff.transitDays || '',
              diff.defaultRoute || '',
              oldTransitDays,
              oldDefaultRoute
            ];
            csvRows.push(detailRow.map(escapeCsvField).join(','));
          });
        }
      });

      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Generate filename with timestamp and filter info
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filterInfo = validationSearch || Object.values(validationFilters).some(f => f) ? '_filtered' : '';
      const filename = `SRM_Validation_Results${filterInfo}_${timestamp}.csv`;
      
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      const totalRows = filteredValidationResults.reduce((sum: number, s: any) => {
        return sum + 1 + (s.differences?.length || 0); // 1 summary row + detail rows
      }, 0);
      addLog('success', `Exported ${totalRows.toLocaleString()} rows (${filteredValidationResults.length} summaries + details) to ${filename}`);
    } catch (err: any) {
      addLog('error', 'Error exporting validation results to CSV', { message: err.message });
      console.error('Error exporting validation results to CSV:', err);
    }
  };

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
            <KibButtonNew 
              size="large"
              onClick={loadExistingFiles}
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Use Existing Files'}
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

          {/* SRM Validation Section */}
          <div className={styles.validationContainer}>
            <div className={styles.validationHeader}>
              <h3>SRM Validation</h3>
              <KibButtonNew 
                size="medium"
                onClick={validateSrmFiles}
                disabled={isValidating || routes.length === 0}
              >
                {isValidating ? 'Validating...' : 'Validate SRM Files'}
              </KibButtonNew>
            </div>

            {validationError && (
              <div className={styles.validationError}>
                <strong>Error:</strong> {validationError}
              </div>
            )}

            {validationResults && validationResults.success && (
              <div className={styles.validationResults}>
                <div className={styles.validationSummary}>
                  <p>
                    <strong>Total Routes Affected:</strong> {validationResults.summary?.totalRoutesAffected || 0} | 
                    <strong> Total Postal Codes Changed:</strong> {validationResults.summary?.totalPostalCodesChanged || 0} | 
                    <strong> Shippers Validated:</strong> {(validationResults.summary?.shippersValidated || []).join(', ')}
                  </p>
                </div>

                {validationResults.validationResults && validationResults.validationResults.length > 0 ? (
                  <>
                    {/* Search and Filter Controls */}
                    <div className={styles.contentControls}>
                      <div className={styles.searchBox}>
                        <label htmlFor="validationSearch">Search:</label>
                        <input
                          id="validationSearch"
                          type="text"
                          placeholder="Search across all columns..."
                          value={validationSearch}
                          onChange={(e) => setValidationSearch(e.target.value)}
                          className={styles.searchInput}
                        />
                      </div>
                      <KibButtonNew 
                        size="small"
                        onClick={() => {
                          setValidationSearch('');
                          setValidationFilters({});
                        }}
                      >
                        Clear Filters
                      </KibButtonNew>
                      <KibButtonNew 
                        size="small"
                        onClick={exportValidationResultsToCsv}
                        disabled={!filteredValidationResults || filteredValidationResults.length === 0}
                      >
                        Export to CSV
                      </KibButtonNew>
                    </div>

                    <div className={styles.tableWrapper}>
                      <table className={styles.validationTable}>
                        <thead>
                          <tr>
                            <th>
                              <div className={styles.columnHeader}>
                                <span>Shipper</span>
                                <input
                                  type="text"
                                  placeholder="Filter Shipper..."
                                  value={validationFilters.shipper || ''}
                                  onChange={(e) => setValidationFilters({
                                    ...validationFilters,
                                    shipper: e.target.value
                                  })}
                                  className={styles.columnFilter}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th>
                              <div className={styles.columnHeader}>
                                <span>Route</span>
                                <input
                                  type="text"
                                  placeholder="Filter Route..."
                                  value={validationFilters.route || ''}
                                  onChange={(e) => setValidationFilters({
                                    ...validationFilters,
                                    route: e.target.value
                                  })}
                                  className={styles.columnFilter}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th>
                              <div className={styles.columnHeader}>
                                <span>Service</span>
                                <input
                                  type="text"
                                  placeholder="Filter Service..."
                                  value={validationFilters.service || ''}
                                  onChange={(e) => setValidationFilters({
                                    ...validationFilters,
                                    service: e.target.value
                                  })}
                                  className={styles.columnFilter}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </div>
                            </th>
                            <th>Postal Code Count</th>
                            <th>Transit Days</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredValidationResults.length > 0 ? (
                            filteredValidationResults.map((summary: any, index: number) => {
                              const routeKey = `${summary.shipper}_${summary.route}_${summary.service}`;
                              const isExpanded = expandedRoute === routeKey;
                              return (
                                <React.Fragment key={index}>
                                  <tr className={isExpanded ? styles.selectedRow : ''}>
                                    <td>{summary.shipper}</td>
                                    <td>{summary.route || summary.defaultRoute}</td>
                                    <td>{summary.service}</td>
                                    <td>{summary.postalCodeCount.toLocaleString()}</td>
                                    <td>
                                      {summary.transitDays !== undefined && summary.transitDays !== null ? (
                                        <span>
                                          {summary.transitDays}
                                          {summary.differences && summary.differences.length > 0 && 
                                           summary.differences[0].changeType === 'UPDATED' && 
                                           summary.differences[0].oldValue && (
                                            <span className={styles.changedValue}>
                                              {' '}(was {summary.differences[0].oldValue.transitDays})
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        summary.differences && summary.differences.length > 0 ? (
                                          <span>
                                            {summary.differences[0].transitDays}
                                            {summary.differences[0].changeType === 'UPDATED' && summary.differences[0].oldValue && (
                                              <span className={styles.changedValue}>
                                                {' '}(was {summary.differences[0].oldValue.transitDays})
                                              </span>
                                            )}
                                          </span>
                                        ) : '-'
                                      )}
                                    </td>
                                    <td>
                                      <KibButtonNew 
                                        size="small"
                                        onClick={() => setExpandedRoute(isExpanded ? null : routeKey)}
                                      >
                                        {isExpanded ? 'Hide' : 'Show'} Details
                                      </KibButtonNew>
                                    </td>
                                  </tr>
                                  {isExpanded && summary.differences && (
                                    <tr>
                                      <td colSpan={6} className={styles.detailsCell}>
                                        <div className={styles.detailsContent}>
                                          <h4>Postal Code Changes ({summary.differences.length})</h4>
                                          <div className={styles.detailsTableWrapper}>
                                            <table className={styles.detailsTable}>
                                              <thead>
                                                <tr>
                                                  <th>Postal Code</th>
                                                  <th>Change Type</th>
                                                  <th>Transit Days</th>
                                                  <th>Default Route</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {summary.differences.map((diff: any, diffIndex: number) => (
                                                  <tr key={diffIndex}>
                                                    <td>{diff.postalCode}</td>
                                                    <td>
                                                      <span className={styles[`changeType${diff.changeType}`]}>
                                                        {diff.changeType}
                                                      </span>
                                                    </td>
                                                    <td>
                                                      {diff.transitDays}
                                                      {diff.changeType === 'UPDATED' && diff.oldValue && (
                                                        <span className={styles.changedValue}>
                                                          {' '}(was {diff.oldValue.transitDays})
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td>
                                                      {diff.defaultRoute}
                                                      {diff.changeType === 'UPDATED' && diff.oldValue && diff.oldValue.defaultRoute !== diff.defaultRoute && (
                                                        <span className={styles.changedValue}>
                                                          {' '}(was {diff.oldValue.defaultRoute})
                                                        </span>
                                                      )}
                                                    </td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className={styles.tableNote}>
                                No results match the current filters
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                      {filteredValidationResults.length > 0 && (
                        <div className={styles.tableNote}>
                          Showing {filteredValidationResults.length} of {validationResults.validationResults.length} results
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.noValidationResults}>
                    <p>No differences found between SRM files and production data.</p>
                  </div>
                )}
              </div>
            )}
          </div>

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
      <Chatbot pageType="srm-download" getPageData={getPageData} />
    </div>
  );
};
