import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { Chatbot } from '@/components/chatbot/Chatbot';
import { getApiBaseUrl } from '@/utils/api';
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
  const [scheduledVersion, setScheduledVersion] = useState<any>(null);
  const [isLoadingScheduledVersion, setIsLoadingScheduledVersion] = useState(false);
  const [deltaSummary, setDeltaSummary] = useState<any>(null);
  const [deltaVersionId, setDeltaVersionId] = useState<number | null>(null);
  const [isLoadingDelta, setIsLoadingDelta] = useState(false);
  const [deltaError, setDeltaError] = useState<string | null>(null);
  const [deltaExpandedFC, setDeltaExpandedFC] = useState<string | null>(null);
  const [deltaFilterFC, setDeltaFilterFC] = useState('');
  const [deltaFilterRoute, setDeltaFilterRoute] = useState('');
  const [deltaFilterChangeType, setDeltaFilterChangeType] = useState('');
  const [scheduledVersionError, setScheduledVersionError] = useState<string | null>(null);

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
      const response = await fetch(`${getApiBaseUrl()}/api/srm/validate`, {
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
      const response = await fetch(`${getApiBaseUrl()}/api/srm/routes`);
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
      const response = await fetch(`${getApiBaseUrl()}/api/srm/routes/${encodeURIComponent(routeName)}/contents`);
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

  const fetchScheduledVersion = async () => {
    setIsLoadingScheduledVersion(true);
    setScheduledVersionError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/srm/scheduled-version`);
      const data = await response.json();
      if (data.success) {
        setScheduledVersion(data);
        addLog('success', `Retrieved ${data.versions?.length || 0} versions from SRM (scheduled: ${data.scheduledVersion})`);
      } else {
        setScheduledVersionError(data.error || 'Failed to fetch scheduled version');
        addLog('error', 'Failed to fetch scheduled version', { error: data.error });
      }
    } catch (err: any) {
      setScheduledVersionError(err.message || 'Network error');
      addLog('error', 'Error fetching scheduled version', { message: err.message });
    } finally {
      setIsLoadingScheduledVersion(false);
    }
  };

  // Auto-fetch scheduled version on component mount
  useEffect(() => {
    fetchScheduledVersion();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDeltaSummary = async (versionId: number) => {
    setIsLoadingDelta(true);
    setDeltaError(null);
    setDeltaSummary(null);
    setDeltaVersionId(versionId);
    setDeltaExpandedFC(null);
    setDeltaFilterFC('');
    setDeltaFilterRoute('');
    setDeltaFilterChangeType('');
    try {
      const res = await fetch(`${getApiBaseUrl()}/api/srm/delta-summary?versionId=${versionId}`);
      const data = await res.json();
      if (data.success) {
        setDeltaSummary(data);
        addLog('success', `Delta summary loaded for version ${versionId}: ${data.summary?.totalChanges} changes`);
      } else {
        setDeltaError(data.error || 'Failed to fetch delta summary');
        addLog('error', `Delta summary failed for version ${versionId}`, { error: data.error });
      }
    } catch (err: any) {
      setDeltaError(err.message);
      addLog('error', 'Error fetching delta summary', { message: err.message });
    } finally {
      setIsLoadingDelta(false);
    }
  };

  const DELTA_DISPLAY_COLUMNS = [
    { key: 'fulfillmentCenter', label: 'FC' },
    { key: 'routeName', label: 'Route' },
    { key: 'newRouteName', label: 'New Route' },
    { key: 'changeType', label: 'Change Type' },
    { key: 'currentCutTime', label: 'Cut Time' },
    { key: 'currentPullTime', label: 'Pull Time' },
    { key: 'newCutTime', label: 'New Cut Time' },
    { key: 'newPullTime', label: 'New Pull Time' },
    { key: 'destinationChangeSummary', label: 'Dest Change Summary' },
    { key: 'numZips', label: '# of Zips' },
  ];

  const deltaProcessed = useMemo(() => {
    if (!deltaSummary?.raw) return null;

    const allChanges: any[] = [];
    for (const [, changes] of Object.entries(deltaSummary.raw)) {
      if (Array.isArray(changes)) allChanges.push(...changes);
    }

    const uniqueFCs = Array.from(new Set(allChanges.map((c: any) => c.fulfillmentCenter || '').filter(Boolean))).sort() as string[];
    const uniqueRoutes = Array.from(new Set(allChanges.map((c: any) => c.routeName || '').filter(Boolean))).sort() as string[];
    const uniqueChangeTypes = Array.from(new Set(allChanges.map((c: any) => c.changeType || '').filter(Boolean))).sort() as string[];

    let filtered = allChanges;
    if (deltaFilterFC) filtered = filtered.filter((c: any) => c.fulfillmentCenter === deltaFilterFC);
    if (deltaFilterRoute) filtered = filtered.filter((c: any) => c.routeName === deltaFilterRoute);
    if (deltaFilterChangeType) filtered = filtered.filter((c: any) => c.changeType === deltaFilterChangeType);

    // Deduplicate by visible columns, summing numZips for duplicates
    const dedupeKey = (c: any) => [
      c.fulfillmentCenter, c.routeName, c.newRouteName, c.changeType,
      c.currentCutTime, c.currentPullTime, c.newCutTime, c.newPullTime,
      c.destinationChangeSummary
    ].join('|');

    const dedupeMap = new Map<string, any>();
    for (const change of filtered) {
      const key = dedupeKey(change);
      if (!dedupeMap.has(key)) {
        dedupeMap.set(key, { ...change, _dupeCount: 1 });
      } else {
        dedupeMap.get(key)._dupeCount += 1;
      }
    }
    const deduped = Array.from(dedupeMap.values());

    // Group by FC -> Route
    const fcGroups: Record<string, { routes: Record<string, any[]>; totalZips: number }> = {};
    for (const change of deduped) {
      const fc = change.fulfillmentCenter || 'Unknown';
      const route = change.routeName || 'Unknown';
      if (!fcGroups[fc]) fcGroups[fc] = { routes: {}, totalZips: 0 };
      if (!fcGroups[fc].routes[route]) fcGroups[fc].routes[route] = [];
      fcGroups[fc].routes[route].push(change);
      fcGroups[fc].totalZips += (change.numZips || 0);
    }

    return { fcGroups, uniqueFCs, uniqueRoutes, uniqueChangeTypes, totalFiltered: filtered.length, totalDeduped: deduped.length };
  }, [deltaSummary, deltaFilterFC, deltaFilterRoute, deltaFilterChangeType]);

  // Compare delta summary vs validation when both are available
  const deltaComparison = useMemo(() => {
    if (!deltaSummary?.raw || !validationResults?.deltaComparable) return null;

    // Build a deduped delta map keyed by FC|route|changeType
    // For delta, we need to normalize: ZIP_MOVE splits into NEW zips on newRoute and DELETED from routeName
    const deltaEntries: Record<string, { fc: string; route: string; changeType: string; numZips: number }> = {};
    for (const [, changes] of Object.entries(deltaSummary.raw)) {
      if (!Array.isArray(changes)) continue;
      for (const c of changes) {
        // Normalize delta change types to validation types
        // ZIP_MOVE = zips leaving routeName (DELETED) + zips arriving at newRouteName (NEW)
        if (c.changeType === 'ZIP_MOVE') {
          const delKey = `${c.fulfillmentCenter}|${c.routeName}|DELETED`;
          if (deltaEntries[delKey]) deltaEntries[delKey].numZips += (c.numZips || 0);
          else deltaEntries[delKey] = { fc: c.fulfillmentCenter, route: c.routeName, changeType: 'DELETED', numZips: c.numZips || 0 };

          const newKey = `${c.fulfillmentCenter}|${c.newRouteName}|NEW`;
          if (deltaEntries[newKey]) deltaEntries[newKey].numZips += (c.numZips || 0);
          else deltaEntries[newKey] = { fc: c.fulfillmentCenter, route: c.newRouteName, changeType: 'NEW', numZips: c.numZips || 0 };
        } else {
          const key = `${c.fulfillmentCenter}|${c.routeName}|${c.changeType}`;
          if (deltaEntries[key]) deltaEntries[key].numZips += (c.numZips || 0);
          else deltaEntries[key] = { fc: c.fulfillmentCenter, route: c.routeName, changeType: c.changeType, numZips: c.numZips || 0 };
        }
      }
    }

    // Build validation map keyed the same way
    const valEntries: Record<string, { fc: string; route: string; changeType: string; numZips: number }> = {};
    for (const v of validationResults.deltaComparable) {
      const key = `${v.fulfillmentCenter}|${v.routeName}|${v.changeType}`;
      if (valEntries[key]) valEntries[key].numZips += v.numZips;
      else valEntries[key] = { fc: v.fulfillmentCenter, route: v.routeName, changeType: v.changeType, numZips: v.numZips };
    }

    // Find all unique keys
    const allKeys = Array.from(new Set(Object.keys(deltaEntries).concat(Object.keys(valEntries)))) as string[];
    allKeys.sort();

    const diffs: Array<{
      fc: string; route: string; changeType: string;
      deltaZips: number | null; valZips: number | null;
      status: 'match' | 'delta_only' | 'val_only' | 'mismatch';
    }> = [];

    let matchCount = 0;
    let diffCount = 0;

    for (const key of allKeys) {
      const d = deltaEntries[key];
      const v = valEntries[key];
      const fc = (d || v).fc;
      const route = (d || v).route;
      const changeType = (d || v).changeType;

      if (d && v) {
        if (d.numZips === v.numZips) {
          matchCount++;
        } else {
          diffCount++;
          diffs.push({ fc, route, changeType, deltaZips: d.numZips, valZips: v.numZips, status: 'mismatch' });
        }
      } else if (d && !v) {
        diffCount++;
        diffs.push({ fc, route, changeType, deltaZips: d.numZips, valZips: null, status: 'delta_only' });
      } else {
        diffCount++;
        diffs.push({ fc, route, changeType, deltaZips: null, valZips: v.numZips, status: 'val_only' });
      }
    }

    return { diffs, matchCount, diffCount, totalKeys: allKeys.length };
  }, [deltaSummary, validationResults]);

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
        const loadResponse = await fetch(`${getApiBaseUrl()}/api/srm/load-existing`, {
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
          const versionResponse = await fetch(`${getApiBaseUrl()}/api/srm/version`);
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
        const fullProcessResponse = await fetch(`${getApiBaseUrl()}/api/srm/execute-full-process`, {
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
          const copyResponse = await fetch(`${getApiBaseUrl()}/api/srm/copy-to-local`, {
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

  // Build a human-readable change summary for a validation row
  const buildChangeSummary = (summary: any): string => {
    if (!summary.differences || summary.differences.length === 0) {
      return '-';
    }

    const diffs: any[] = summary.differences;
    let newZips = 0;
    let removedZips = 0;
    let routeChanges = 0;
    let tntChanges = 0;

    for (const diff of diffs) {
      if (diff.changeType === 'NEW') {
        newZips++;
      } else if (diff.changeType === 'DELETED') {
        removedZips++;
      } else if (diff.changeType === 'UPDATED') {
        const routeChanged = diff.oldValue && diff.oldValue.defaultRoute !== diff.defaultRoute;
        const tntChanged = diff.oldValue && Math.abs((diff.oldValue.transitDays || 0) - (diff.transitDays || 0)) > 0.01;
        if (routeChanged) routeChanges++;
        if (tntChanged) tntChanges++;
        // If neither flag triggered (shouldn't happen), count as route change
        if (!routeChanged && !tntChanged) routeChanges++;
      }
    }

    const parts: string[] = [];
    if (newZips > 0) parts.push(`${newZips} New Zip${newZips !== 1 ? 's' : ''}`);
    if (removedZips > 0) parts.push(`${removedZips} Removed Zip${removedZips !== 1 ? 's' : ''}`);
    if (routeChanges > 0) parts.push(`${routeChanges} Route Change${routeChanges !== 1 ? 's' : ''}`);
    if (tntChanges > 0) parts.push(`${tntChanges} TNT Change${tntChanges !== 1 ? 's' : ''}`);

    return parts.length > 0 ? parts.join(', ') : '-';
  };

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
        const changeSummary = buildChangeSummary(summary).toLowerCase();

        return shipper.includes(searchLower) ||
               route.includes(searchLower) ||
               service.includes(searchLower) ||
               postalCodeCount.includes(searchLower) ||
               transitDays.includes(searchLower) ||
               changeType.includes(searchLower) ||
               changeSummary.includes(searchLower);
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
        'Summary',
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
          buildChangeSummary(summary),
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
              '', // Summary (only on summary row)
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
          {/* SRM Route Calendar Versions */}
          <div className={styles.scheduledVersionPanel}>
            <div className={styles.scheduledVersionHeader}>
              <h3>SRM Route Calendar Versions</h3>
              <KibButtonNew
                size="small"
                onClick={fetchScheduledVersion}
                disabled={isLoadingScheduledVersion}
              >
                {isLoadingScheduledVersion ? 'Refreshing...' : 'Refresh'}
              </KibButtonNew>
            </div>
            {scheduledVersionError && (
              <div className={styles.scheduledVersionError}>
                {scheduledVersionError}
              </div>
            )}
            {isLoadingScheduledVersion && !scheduledVersion && (
              <div className={styles.scheduledVersionLoading}>Loading versions from SRM API...</div>
            )}
            {scheduledVersion && scheduledVersion.success && scheduledVersion.versions && (
              <div className={styles.versionTableWrapper}>
                <table className={styles.versionTable}>
                  <thead>
                    <tr>
                      <th>Version ID</th>
                      <th>Status</th>
                      <th>Upload Time</th>
                      <th>Upload User</th>
                      <th>Scheduled Time</th>
                      <th>Locked</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduledVersion.versions.map((v: any) => {
                      const uploadDate = v.uploadTime && v.uploadTime > 0
                        ? new Date(v.uploadTime).toLocaleString()
                        : '-';
                      const scheduledDate = v.scheduledTime && v.scheduledTime > 0
                        ? new Date(v.scheduledTime).toLocaleString()
                        : '-';
                      const isScheduled = v.status === 'SCHEDULED';
                      const isActive = v.status === 'ACTIVE';
                      const isCurrent = !useLatestVersion && versionInput === String(v.id);

                      return (
                        <tr
                          key={v.id}
                          className={`${styles.versionRow} ${isScheduled ? styles.versionScheduled : ''} ${isActive ? styles.versionActive : ''} ${isCurrent ? styles.versionCurrent : ''}`}
                        >
                          <td className={styles.versionId}>{v.id}</td>
                          <td>
                            <span className={`${styles.versionStatusBadge} ${styles[`status${v.status}`] || ''}`}>
                              {v.status}
                            </span>
                          </td>
                          <td>{uploadDate}</td>
                          <td>{v.uploadUser || '-'}</td>
                          <td>{scheduledDate}</td>
                          <td>{v.locked ? '🔒' : '-'}</td>
                          <td>
                            <button
                              className={styles.useVersionBtn}
                              onClick={() => {
                                setUseLatestVersion(false);
                                setVersionInput(String(v.id));
                                addLog('info', `Version set to ${v.id} from SRM list`);
                              }}
                              disabled={isCurrent}
                            >
                              {isCurrent ? 'Selected' : 'Use'}
                            </button>
                            <button
                              className={`${styles.useVersionBtn} ${deltaVersionId === v.id ? styles.deltaActiveBtn : styles.deltaBtnSecondary}`}
                              onClick={() => fetchDeltaSummary(v.id)}
                              disabled={isLoadingDelta}
                              title="View delta summary for this version"
                            >
                              {isLoadingDelta && deltaVersionId === v.id ? '...' : 'Delta'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className={styles.versionTableFooter}>
                  Showing {scheduledVersion.versions.length} of {scheduledVersion.totalCount} versions
                </div>
              </div>
            )}
          </div>

          {/* Delta Summary Panel */}
          {(deltaSummary || isLoadingDelta || deltaError) && (
            <div className={styles.deltaSummaryPanel}>
              <div className={styles.deltaSummaryHeader}>
                <h3>Delta Summary &mdash; Version {deltaVersionId}</h3>
                {deltaSummary && (
                  <button
                    className={styles.useVersionBtn}
                    onClick={() => { setDeltaSummary(null); setDeltaVersionId(null); setDeltaError(null); }}
                  >
                    Close
                  </button>
                )}
              </div>

              {isLoadingDelta && (
                <div className={styles.scheduledVersionLoading}>Loading delta summary from SRM API...</div>
              )}

              {deltaError && (
                <div className={styles.scheduledVersionError}>{deltaError}</div>
              )}

              {deltaSummary && deltaSummary.summary && deltaProcessed && (
                <>
                  {/* Summary cards */}
                  <div className={styles.deltaSummaryCards}>
                    <div className={styles.deltaSummaryCard}>
                      <span className={styles.deltaSummaryValue}>{deltaSummary.summary.totalChanges}</span>
                      <span className={styles.deltaSummaryLabel}>Total Changes</span>
                    </div>
                    <div className={styles.deltaSummaryCard}>
                      <span className={styles.deltaSummaryValue}>{deltaSummary.summary.totalZipsAffected?.toLocaleString()}</span>
                      <span className={styles.deltaSummaryLabel}>Zips Affected</span>
                    </div>
                    {deltaSummary.summary.changeTypeCounts && Object.entries(deltaSummary.summary.changeTypeCounts).map(([type, count]: [string, any]) => (
                      <div key={type} className={styles.deltaSummaryCard}>
                        <span className={styles.deltaSummaryValue}>{count}</span>
                        <span className={`${styles.deltaSummaryLabel} ${styles[`deltaType${type.replace(/[^a-zA-Z]/g, '')}`] || ''}`}>{type.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>

                  {/* Filters */}
                  <div className={styles.deltaFilters}>
                    <select
                      value={deltaFilterFC}
                      onChange={(e) => setDeltaFilterFC(e.target.value)}
                      className={styles.deltaFilterSelect}
                    >
                      <option value="">All FCs ({deltaProcessed.uniqueFCs.length})</option>
                      {deltaProcessed.uniqueFCs.map((fc: string) => (
                        <option key={fc} value={fc}>{fc}</option>
                      ))}
                    </select>
                    <select
                      value={deltaFilterRoute}
                      onChange={(e) => setDeltaFilterRoute(e.target.value)}
                      className={styles.deltaFilterSelect}
                    >
                      <option value="">All Routes ({deltaProcessed.uniqueRoutes.length})</option>
                      {deltaProcessed.uniqueRoutes.map((r: string) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <select
                      value={deltaFilterChangeType}
                      onChange={(e) => setDeltaFilterChangeType(e.target.value)}
                      className={styles.deltaFilterSelect}
                    >
                      <option value="">All Change Types ({deltaProcessed.uniqueChangeTypes.length})</option>
                      {deltaProcessed.uniqueChangeTypes.map((ct: string) => (
                        <option key={ct} value={ct}>{ct.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                    {(deltaFilterFC || deltaFilterRoute || deltaFilterChangeType) && (
                      <button
                        className={styles.deltaFilterClear}
                        onClick={() => { setDeltaFilterFC(''); setDeltaFilterRoute(''); setDeltaFilterChangeType(''); }}
                      >
                        Clear Filters
                      </button>
                    )}
                    <span className={styles.deltaFilterCount}>
                      {deltaProcessed.totalDeduped} unique rows ({deltaProcessed.totalFiltered} raw, {deltaSummary.summary.totalChanges} total)
                    </span>
                  </div>

                  {/* Grouped by FC -> Route */}
                  {Object.entries(deltaProcessed.fcGroups)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([fc, fcData]: [string, any]) => {
                      const isExpanded = deltaExpandedFC === fc;
                      const routeCount = Object.keys(fcData.routes).length;

                      return (
                        <div key={fc} className={styles.deltaChangeGroup}>
                          <button
                            className={styles.deltaChangeGroupHeader}
                            onClick={() => setDeltaExpandedFC(isExpanded ? null : fc)}
                          >
                            <span className={styles.deltaChangeGroupTitle}>
                              {isExpanded ? '▼' : '▶'} {fc}
                            </span>
                            <span className={styles.deltaChangeGroupMeta}>
                              <span className={styles.deltaFcTag}>{routeCount} routes</span>
                              <span className={styles.deltaFcTag}>{fcData.totalZips.toLocaleString()} zips</span>
                            </span>
                          </button>
                          {isExpanded && (
                            <div className={styles.deltaFcContent}>
                              {Object.entries(fcData.routes)
                                .sort(([a], [b]) => a.localeCompare(b))
                                .map(([route, rows]: [string, any]) => {
                                  const routeZips = rows.reduce((sum: number, r: any) => sum + (r.numZips || 0), 0);
                                  return (
                                    <div key={route} className={styles.deltaRouteSection}>
                                      <div className={styles.deltaRouteHeader}>
                                        <span className={styles.deltaRouteName}>{route}</span>
                                        <span className={styles.deltaRouteMeta}>{rows.length} changes &middot; {routeZips} zips</span>
                                      </div>
                                      <div className={styles.deltaChangeTableWrapper}>
                                        <table className={styles.deltaChangeTable}>
                                          <thead>
                                            <tr>
                                              {DELTA_DISPLAY_COLUMNS.map((col) => (
                                                <th key={col.key}>{col.label}</th>
                                              ))}
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {rows.map((row: any, idx: number) => (
                                              <tr key={idx}>
                                                {DELTA_DISPLAY_COLUMNS.map((col) => (
                                                  <td key={col.key} className={col.key === 'changeType' ? styles.deltaChangeTypeCell : ''}>
                                                    {row[col.key] === null || row[col.key] === undefined || row[col.key] === ''
                                                      ? <span className={styles.nullValue}>&mdash;</span>
                                                      : String(row[col.key])}
                                                  </td>
                                                ))}
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </div>
          )}

          {/* Delta vs Validation Comparison */}
          {deltaComparison && (
            <div className={styles.comparisonPanel}>
              <div className={styles.comparisonHeader}>
                <h3>Delta vs Validation Comparison</h3>
                <div className={styles.comparisonBadges}>
                  <span className={styles.comparisonMatch}>{deltaComparison.matchCount} matching</span>
                  {deltaComparison.diffCount > 0 && (
                    <span className={styles.comparisonDiff}>{deltaComparison.diffCount} differences</span>
                  )}
                </div>
              </div>

              {deltaComparison.diffCount === 0 ? (
                <div className={styles.comparisonAllMatch}>
                  All {deltaComparison.totalKeys} route/change-type combinations match between delta summary and validation.
                </div>
              ) : (
                <div className={styles.deltaChangeTableWrapper}>
                  <table className={styles.deltaChangeTable}>
                    <thead>
                      <tr>
                        <th>Status</th>
                        <th>FC</th>
                        <th>Route</th>
                        <th>Change Type</th>
                        <th>Delta Zips</th>
                        <th>Validation Zips</th>
                        <th>Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deltaComparison.diffs.map((d: any, idx: number) => (
                        <tr key={idx} className={styles[`comparison_${d.status}`] || ''}>
                          <td>
                            <span className={`${styles.comparisonStatusBadge} ${styles[`compStatus_${d.status}`] || ''}`}>
                              {d.status === 'mismatch' ? 'Mismatch' : d.status === 'delta_only' ? 'Delta Only' : 'Validation Only'}
                            </span>
                          </td>
                          <td>{d.fc}</td>
                          <td>{d.route}</td>
                          <td className={styles.deltaChangeTypeCell}>{d.changeType}</td>
                          <td>{d.deltaZips !== null ? d.deltaZips : <span className={styles.nullValue}>&mdash;</span>}</td>
                          <td>{d.valZips !== null ? d.valZips : <span className={styles.nullValue}>&mdash;</span>}</td>
                          <td className={styles.comparisonDiffCell}>
                            {d.deltaZips !== null && d.valZips !== null
                              ? (d.deltaZips - d.valZips > 0 ? '+' : '') + (d.deltaZips - d.valZips)
                              : <span className={styles.nullValue}>&mdash;</span>
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

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
                            <th>Summary</th>
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
                                    <td className={styles.summaryCell}>{buildChangeSummary(summary)}</td>
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
                                      <td colSpan={7} className={styles.detailsCell}>
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
                              <td colSpan={7} className={styles.tableNote}>
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
