import React, { useState, useCallback, useMemo, useEffect } from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { ComponentGroupPanel } from './ComponentGroupPanel';
import { RiskFlagsPanel } from './RiskFlagsPanel';
import { TicketTable } from './TicketTable';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// -- Types matching backend DTOs --

export interface JiraTicket {
  jira: string;
  url: string;
  assignee: string;
  devTeam: string;
  productManager: string;
  downtimeRequired: string;
  status: string;
  title: string;
  plannedDeploymentDate: string;
  resolution: string;
  labels: string;
  architect: string;
  ddl: string;
  dml: string;
  web: string;
  chewyWmsGateway: string;
  fitnesse: string;
  nonStandard: string;
  linkedIssues: Record<string, string[]>;
  description: string;
  implementationPlan: string;
}

export interface LinkedIssueWarning {
  sourceJira: string;
  linkedJira: string;
  relationship: string;
  inChg: boolean;
}

export interface ComponentGroup {
  componentName: string;
  tickets: JiraTicket[];
  linkedIssueWarnings: LinkedIssueWarning[];
}

export interface RiskFlag {
  severity: string;
  category: string;
  message: string;
  relatedJira: string | null;
}

export interface DeploymentPlan {
  chgNumber: string;
  generatedAt: string;
  totalTickets: number;
  downtimeRequired: boolean;
  plannedDeploymentDate: string | null;
  architectComponents: ComponentGroup[];
  ddlComponents: ComponentGroup[];
  dmlComponents: ComponentGroup[];
  webComponents: ComponentGroup[];
  gatewayComponents: ComponentGroup[];
  fitnesseComponents: ComponentGroup[];
  nonStandardComponents: ComponentGroup[];
  allTickets: JiraTicket[];
  riskFlags: RiskFlag[];
  teamBreakdown: Record<string, number>;
  statusBreakdown: Record<string, number>;
}

interface PresetInfo {
  name: string;
  description: string;
  jql: string;
}

interface DeploymentDateInfo {
  deploymentDate: string;
  fixVersionSunday: string;
  fixVersionWMS: string;
  fixVersionWMSRx: string;
  releaseBranch: string;
}

type QueryMode = 'chg' | 'release' | 'preset' | 'custom';
type ViewMode = 'plan' | 'table';

export const ReleaseManagerDashboard: React.FC = () => {
  // Query state
  const [queryMode, setQueryMode] = useState<QueryMode>('chg');
  const [chgInput, setChgInput] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customJql, setCustomJql] = useState('');
  const [customLabel, setCustomLabel] = useState('');

  // Result state
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DeploymentPlan | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('plan');
  const [executedJql, setExecutedJql] = useState<string | null>(null);
  const [queryLabel, setQueryLabel] = useState<string>('');

  // Metadata state
  const [presets, setPresets] = useState<Record<string, PresetInfo>>({});
  const [deploymentDates, setDeploymentDates] = useState<Record<string, DeploymentDateInfo>>({});

  // Fetch presets and deployment dates on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/release-manager/presets`)
      .then(r => r.json())
      .then(setPresets)
      .catch(() => {});

    fetch(`${API_BASE}/api/release-manager/deployment-dates?count=6`)
      .then(r => r.json())
      .then(setDeploymentDates)
      .catch(() => {});
  }, []);

  // Set a sensible default when switching to release mode
  useEffect(() => {
    if (queryMode === 'release' && !releaseDate && Object.keys(deploymentDates).length > 0) {
      const nextDate = Object.values(deploymentDates)[0];
      if (nextDate) setReleaseDate(nextDate.deploymentDate);
    }
  }, [queryMode, deploymentDates, releaseDate]);

  // Set a sensible default when switching to preset mode
  useEffect(() => {
    if (queryMode === 'preset' && !selectedPreset && Object.keys(presets).length > 0) {
      setSelectedPreset(Object.keys(presets)[0]);
    }
  }, [queryMode, presets, selectedPreset]);

  const canExecute = useMemo(() => {
    if (loading) return false;
    switch (queryMode) {
      case 'chg': return chgInput.trim().length > 0;
      case 'release': return releaseDate.length > 0;
      case 'preset': return selectedPreset.length > 0;
      case 'custom': return customJql.trim().length > 0;
    }
  }, [queryMode, chgInput, releaseDate, selectedPreset, customJql, loading]);

  const executeQuery = useCallback(async () => {
    if (!canExecute) return;
    setLoading(true);
    setFetchError(null);
    setPlan(null);
    setExecutedJql(null);

    try {
      let res: Response;
      let label = '';

      switch (queryMode) {
        case 'chg':
          label = chgInput.trim().toUpperCase();
          res = await fetch(`${API_BASE}/api/release-manager/deployment-plan?chg=${encodeURIComponent(chgInput.trim())}`);
          break;

        case 'release':
          label = `Release ${releaseDate}`;
          res = await fetch(`${API_BASE}/api/release-manager/release-plan?date=${encodeURIComponent(releaseDate)}`);
          break;

        case 'preset':
          label = presets[selectedPreset]?.name || selectedPreset;
          res = await fetch(`${API_BASE}/api/release-manager/preset-plan?preset=${encodeURIComponent(selectedPreset)}`);
          break;

        case 'custom':
          label = customLabel.trim() || 'Custom JQL';
          res = await fetch(`${API_BASE}/api/release-manager/custom-plan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jql: customJql.trim(), label }),
          });
          break;

        default:
          return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }

      const data = await res.json();

      // Different endpoints return different shapes
      if (queryMode === 'chg') {
        setPlan(data as DeploymentPlan);
        setQueryLabel(label);
      } else {
        // release-plan, preset-plan, custom-plan wrap plan in a response object
        setPlan(data.plan as DeploymentPlan);
        setExecutedJql(data.jql || null);
        setQueryLabel(data.label || data.name || label);
      }
    } catch (err: any) {
      setFetchError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [queryMode, chgInput, releaseDate, selectedPreset, customJql, customLabel, canExecute, presets]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') executeQuery();
  }, [executeQuery]);

  // Stats
  const componentSummary = useMemo(() => {
    if (!plan) return null;
    return {
      architect: plan.architectComponents.length,
      ddl: plan.ddlComponents.length,
      dml: plan.dmlComponents.length,
      web: plan.webComponents.length,
      gateway: plan.gatewayComponents.length,
      fitnesse: plan.fitnesseComponents.length,
      nonStandard: plan.nonStandardComponents.length,
    };
  }, [plan]);

  const riskCounts = useMemo(() => {
    if (!plan) return { high: 0, medium: 0, low: 0 };
    return {
      high: plan.riskFlags.filter(r => r.severity === 'high').length,
      medium: plan.riskFlags.filter(r => r.severity === 'medium').length,
      low: plan.riskFlags.filter(r => r.severity === 'low').length,
    };
  }, [plan]);

  // ---- Render ----

  const modeButtons: { key: QueryMode; label: string; icon: string }[] = [
    { key: 'chg', label: 'CHG Label', icon: '🏷️' },
    { key: 'release', label: 'Release Date', icon: '📅' },
    { key: 'preset', label: 'Presets', icon: '⚡' },
    { key: 'custom', label: 'Custom JQL', icon: '🔍' },
  ];

  return (
    <div className={styles.dashboard}>
      {/* Header */}
      <div className={styles.viewerHeader}>
        <div className={styles.headerInfo}>
          <h2 className={styles.title}>Release Manager</h2>
          <p className={styles.subtitle}>
            Query Jira tickets and build deployment plans
          </p>
        </div>
        {plan && (
          <div className={styles.viewToggle}>
            <KibButtonNew
              size="small"
              onClick={() => setViewMode('plan')}
              className={viewMode === 'plan' ? styles.activeToggle : ''}
            >
              Plan View
            </KibButtonNew>
            <KibButtonNew
              size="small"
              onClick={() => setViewMode('table')}
              className={viewMode === 'table' ? styles.activeToggle : ''}
            >
              Table View
            </KibButtonNew>
          </div>
        )}
      </div>

      {/* Query Mode Selector */}
      <div className={styles.queryModeBar}>
        <div className={styles.modeTabs}>
          {modeButtons.map(({ key, label, icon }) => (
            <button
              key={key}
              className={`${styles.modeTab} ${queryMode === key ? styles.modeTabActive : ''}`}
              onClick={() => setQueryMode(key)}
            >
              <span className={styles.modeIcon}>{icon}</span>
              {label}
            </button>
          ))}
        </div>

        <div className={styles.queryInputArea}>
          {/* CHG Mode */}
          {queryMode === 'chg' && (
            <div className={styles.queryRow}>
              <label className={styles.controlLabel} htmlFor="chgInput">CHG Number:</label>
              <input
                id="chgInput"
                type="text"
                placeholder="CHG0261540"
                value={chgInput}
                onChange={(e) => setChgInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.chgInput}
              />
              <span className={styles.queryHint}>Labels = CHG filter + ExcludeFromBuild exclusion</span>
            </div>
          )}

          {/* Release Date Mode */}
          {queryMode === 'release' && (
            <div className={styles.queryRow}>
              <label className={styles.controlLabel} htmlFor="releaseDateInput">Deployment Date:</label>
              <select
                id="releaseDateInput"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                className={styles.querySelect}
              >
                <option value="">Select a deployment date...</option>
                {Object.entries(deploymentDates).map(([label, info]) => (
                  <option key={label} value={info.deploymentDate}>
                    {info.deploymentDate} ({label}) — {info.fixVersionWMS}
                  </option>
                ))}
              </select>
              <span className={styles.queryOr}>or</span>
              <input
                type="date"
                value={releaseDate}
                onChange={(e) => setReleaseDate(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.dateInput}
              />
              {releaseDate && (
                <span className={styles.queryHint}>
                  Fix versions + Planned Deployment Date JQL
                </span>
              )}
            </div>
          )}

          {/* Preset Mode */}
          {queryMode === 'preset' && (
            <div className={styles.queryRow}>
              <label className={styles.controlLabel} htmlFor="presetSelect">Filter:</label>
              <div className={styles.presetGrid}>
                {Object.entries(presets).map(([key, info]) => (
                  <button
                    key={key}
                    className={`${styles.presetCard} ${selectedPreset === key ? styles.presetCardActive : ''}`}
                    onClick={() => setSelectedPreset(key)}
                  >
                    <span className={styles.presetName}>{info.name}</span>
                    <span className={styles.presetDesc}>{info.description}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom JQL Mode */}
          {queryMode === 'custom' && (
            <div className={styles.queryColumn}>
              <div className={styles.queryRow}>
                <label className={styles.controlLabel} htmlFor="customLabel">Label:</label>
                <input
                  id="customLabel"
                  type="text"
                  placeholder="My custom query"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className={styles.chgInput}
                />
              </div>
              <div className={styles.queryRow}>
                <label className={styles.controlLabel} htmlFor="customJql">JQL:</label>
                <textarea
                  id="customJql"
                  placeholder={"project in (WMSRX, WMS) AND status in (\"Dev\")"}
                  value={customJql}
                  onChange={(e) => setCustomJql(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) executeQuery(); }}
                  className={styles.jqlTextarea}
                  rows={3}
                />
              </div>
              <span className={styles.queryHint}>Press Ctrl+Enter to execute, or click the button</span>
            </div>
          )}
        </div>

        <div className={styles.queryActions}>
          <KibButtonNew size="small" onClick={executeQuery} disabled={!canExecute}>
            {loading ? 'Querying Jira...' : 'Execute'}
          </KibButtonNew>
        </div>
      </div>

      {/* Executed JQL display */}
      {executedJql && (
        <div className={styles.jqlDisplay}>
          <span className={styles.jqlLabel}>Executed JQL:</span>
          <code className={styles.jqlCode}>{executedJql}</code>
        </div>
      )}

      {/* Error banner */}
      {fetchError && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {fetchError}
        </div>
      )}

      {/* Stats row */}
      {plan && (
        <div className={styles.queueStats}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Tickets</div>
            <div className={styles.statValue}>{plan.totalTickets}</div>
          </div>
          <div className={`${styles.statCard} ${plan.downtimeRequired ? styles.statCardDanger : ''}`}>
            <div className={styles.statLabel}>Downtime</div>
            <div className={styles.statValue}>{plan.downtimeRequired ? 'YES' : 'No'}</div>
          </div>
          {componentSummary && (
            <>
              {componentSummary.architect > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Architect</div>
                  <div className={styles.statValue}>{componentSummary.architect}</div>
                </div>
              )}
              {componentSummary.ddl > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>DDL</div>
                  <div className={styles.statValue}>{componentSummary.ddl}</div>
                </div>
              )}
              {componentSummary.dml > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>DML</div>
                  <div className={styles.statValue}>{componentSummary.dml}</div>
                </div>
              )}
              {componentSummary.web > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Web</div>
                  <div className={styles.statValue}>{componentSummary.web}</div>
                </div>
              )}
              {componentSummary.gateway > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Gateway</div>
                  <div className={styles.statValue}>{componentSummary.gateway}</div>
                </div>
              )}
              {componentSummary.fitnesse > 0 && (
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Fitnesse</div>
                  <div className={styles.statValue}>{componentSummary.fitnesse}</div>
                </div>
              )}
              {componentSummary.nonStandard > 0 && (
                <div className={`${styles.statCard} ${styles.statCardWarn}`}>
                  <div className={styles.statLabel}>Non-Standard</div>
                  <div className={styles.statValue}>{componentSummary.nonStandard}</div>
                </div>
              )}
            </>
          )}
          <div className={`${styles.statCard} ${riskCounts.high > 0 ? styles.statCardDanger : riskCounts.medium > 0 ? styles.statCardWarn : ''}`}>
            <div className={styles.statLabel}>Risk Flags</div>
            <div className={styles.statValue}>{plan.riskFlags.length}</div>
          </div>
        </div>
      )}

      {/* Breakdowns */}
      {plan && (
        <div className={styles.breakdownRow}>
          <div className={styles.breakdownCard}>
            <h4>By Team</h4>
            <div className={styles.breakdownList}>
              {Object.entries(plan.teamBreakdown).map(([team, count]) => (
                <div key={team} className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>{team}</span>
                  <span className={styles.breakdownCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.breakdownCard}>
            <h4>By Status</h4>
            <div className={styles.breakdownList}>
              {Object.entries(plan.statusBreakdown).map(([status, count]) => (
                <div key={status} className={styles.breakdownItem}>
                  <span className={styles.breakdownLabel}>{status}</span>
                  <span className={styles.breakdownCount}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Risk flags */}
      {plan && plan.riskFlags.length > 0 && (
        <RiskFlagsPanel riskFlags={plan.riskFlags} />
      )}

      {/* Main content area */}
      {plan && viewMode === 'plan' && (
        <div className={styles.planContainer}>
          <KibSectionHeading heading={`Deployment Plan: ${queryLabel || plan.chgNumber}`} className={styles.sectionHeading} />
          <div className={styles.componentGroups}>
            {plan.architectComponents.length > 0 && (
              <ComponentGroupPanel title="Architect Components" groups={plan.architectComponents} colorClass="architect" />
            )}
            {plan.ddlComponents.length > 0 && (
              <ComponentGroupPanel title="DDL Components" groups={plan.ddlComponents} colorClass="ddl" />
            )}
            {plan.dmlComponents.length > 0 && (
              <ComponentGroupPanel title="DML Components" groups={plan.dmlComponents} colorClass="dml" />
            )}
            {plan.webComponents.length > 0 && (
              <ComponentGroupPanel title="Web Components" groups={plan.webComponents} colorClass="web" />
            )}
            {plan.gatewayComponents.length > 0 && (
              <ComponentGroupPanel title="ChewyWMSGateway" groups={plan.gatewayComponents} colorClass="gateway" />
            )}
            {plan.fitnesseComponents.length > 0 && (
              <ComponentGroupPanel title="Fitnesse" groups={plan.fitnesseComponents} colorClass="fitnesse" />
            )}
            {plan.nonStandardComponents.length > 0 && (
              <ComponentGroupPanel title="Non-Standard Components" groups={plan.nonStandardComponents} colorClass="nonstandard" />
            )}
          </div>
        </div>
      )}

      {plan && viewMode === 'table' && (
        <div className={styles.tableContainer}>
          <KibSectionHeading heading={`All Tickets: ${queryLabel || plan.chgNumber}`} className={styles.sectionHeading} />
          <TicketTable tickets={plan.allTickets} chgKeys={new Set(plan.allTickets.map(t => t.jira))} />
        </div>
      )}

      {/* Empty state */}
      {!plan && !loading && !fetchError && (
        <div className={styles.emptyState}>
          <p>Select a query mode and execute to view tickets and deployment plans.</p>
          <p className={styles.emptyStateSubtext}>
            Supports CHG labels, release dates (bi-weekly Thursday cycle), preset pipeline filters, and custom JQL.
          </p>
        </div>
      )}

      {loading && (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p className={styles.emptyStateSubtext}>Fetching from Jira API...</p>
        </div>
      )}
    </div>
  );
};
