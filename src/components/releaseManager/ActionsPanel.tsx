import React, { useState, useCallback, useEffect } from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface WorkflowRun {
  databaseId: number;
  displayTitle: string;
  status: string;
  conclusion: string | null;
  event: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  workflowName: string;
}

interface JobStep {
  name: string;
  status: string;
  conclusion: string;
  number: number;
}

interface RunJob {
  name: string;
  status: string;
  conclusion: string;
  startedAt: string;
  completedAt: string;
  steps: JobStep[];
  url: string;
  databaseId: number;
}

interface RunDetails {
  databaseId: number;
  displayTitle: string;
  status: string;
  conclusion: string | null;
  event: string;
  headBranch: string;
  createdAt: string;
  updatedAt: string;
  url: string;
  workflowName: string;
  jobs: RunJob[];
}

export const ActionsPanel: React.FC = () => {
  const [runs, setRuns] = useState<WorkflowRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<RunDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const fetchRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/release-manager/actions/runs?limit=25`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }
      setRuns(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleRunClick = useCallback(async (runId: number) => {
    if (selectedRun?.databaseId === runId) {
      setSelectedRun(null);
      return;
    }
    setDetailLoading(true);
    setExpandedJob(null);
    try {
      const res = await fetch(`${API_BASE}/api/release-manager/actions/run/${runId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setSelectedRun(await res.json());
    } catch (e: any) {
      setError('Failed to load run details: ' + e.message);
    } finally {
      setDetailLoading(false);
    }
  }, [selectedRun]);

  const statusIcon = (status: string, conclusion: string | null): string => {
    if (status === 'completed') {
      if (conclusion === 'success') return '\u2705';
      if (conclusion === 'failure') return '\u274C';
      if (conclusion === 'cancelled') return '\u23F9\uFE0F';
      return '\u2754';
    }
    if (status === 'in_progress') return '\u23F3';
    if (status === 'queued') return '\u23F8\uFE0F';
    return '\u2B55';
  };

  const conclusionClass = (conclusion: string | null): string => {
    if (conclusion === 'success') return styles.runSuccess;
    if (conclusion === 'failure') return styles.runFailure;
    if (conclusion === 'cancelled') return styles.runCancelled;
    return '';
  };

  const timeAgo = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d ago`;
  };

  const duration = (start: string, end: string): string => {
    if (!start || !end) return '';
    const ms = new Date(end).getTime() - new Date(start).getTime();
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    return `${min}m ${remSec}s`;
  };

  return (
    <div className={styles.actionsPanel}>
      <div className={styles.actionsHeader}>
        <h3 className={styles.actionsPanelTitle}>GitHub Actions Runs</h3>
        <button className={styles.refreshBtn} onClick={fetchRuns} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}><strong>Error:</strong> {error}</div>
      )}

      {loading && runs.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p className={styles.emptyStateSubtext}>Loading workflow runs...</p>
        </div>
      )}

      {!loading && runs.length === 0 && !error && (
        <div className={styles.emptyState}>
          <p>No workflow runs found.</p>
          <p className={styles.emptyStateSubtext}>
            Configure roadrats.releases.github-repo in application.properties and ensure gh CLI is authenticated.
          </p>
        </div>
      )}

      {runs.length > 0 && (
        <div className={styles.runsContainer}>
          {/* Runs List */}
          <div className={styles.runsList}>
            <table className={styles.ticketTable}>
              <thead>
                <tr>
                  <th></th>
                  <th>Title</th>
                  <th>Workflow</th>
                  <th>Status</th>
                  <th>Branch</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {runs.map(run => (
                  <tr
                    key={run.databaseId}
                    className={`${styles.tableRow} ${conclusionClass(run.conclusion)} ${selectedRun?.databaseId === run.databaseId ? styles.selectedRow : ''}`}
                    onClick={() => handleRunClick(run.databaseId)}
                  >
                    <td style={{ textAlign: 'center', fontSize: '1rem' }}>
                      {statusIcon(run.status, run.conclusion)}
                    </td>
                    <td>
                      <strong>{run.displayTitle}</strong>
                    </td>
                    <td className={styles.colWorkflow}>{run.workflowName}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${conclusionClass(run.conclusion)}`}>
                        {run.conclusion || run.status}
                      </span>
                    </td>
                    <td><code>{run.headBranch}</code></td>
                    <td className={styles.colAge}>{timeAgo(run.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Run Detail Panel */}
          {detailLoading && (
            <div className={styles.runDetailPanel}>
              <div className={styles.spinner} />
            </div>
          )}

          {selectedRun && !detailLoading && (
            <div className={styles.runDetailPanel}>
              <div className={styles.runDetailHeader}>
                <h4>{selectedRun.displayTitle}</h4>
                <a href={selectedRun.url} target="_blank" rel="noopener noreferrer" className={styles.jiraLink}>
                  View on GitHub
                </a>
              </div>

              <div className={styles.runMeta}>
                <span><strong>Workflow:</strong> {selectedRun.workflowName}</span>
                <span><strong>Event:</strong> {selectedRun.event}</span>
                <span><strong>Branch:</strong> <code>{selectedRun.headBranch}</code></span>
                <span><strong>Created:</strong> {new Date(selectedRun.createdAt).toLocaleString()}</span>
              </div>

              {/* Jobs */}
              {selectedRun.jobs && selectedRun.jobs.length > 0 && (
                <div className={styles.jobsList}>
                  <h5>Jobs ({selectedRun.jobs.length})</h5>
                  {selectedRun.jobs.map(job => (
                    <div key={job.databaseId || job.name} className={styles.jobItem}>
                      <div
                        className={styles.jobHeader}
                        onClick={() => setExpandedJob(expandedJob === job.name ? null : job.name)}
                      >
                        <span>{statusIcon(job.status, job.conclusion)}</span>
                        <span className={styles.jobName}>{job.name}</span>
                        <span className={`${styles.statusBadge} ${conclusionClass(job.conclusion)}`}>
                          {job.conclusion || job.status}
                        </span>
                        {job.startedAt && job.completedAt && (
                          <span className={styles.jobDuration}>
                            {duration(job.startedAt, job.completedAt)}
                          </span>
                        )}
                        <span className={styles.expandIcon}>
                          {expandedJob === job.name ? '\u25BC' : '\u25B6'}
                        </span>
                      </div>

                      {expandedJob === job.name && job.steps && job.steps.length > 0 && (
                        <div className={styles.jobSteps}>
                          {job.steps.map(step => (
                            <div key={step.number} className={styles.stepRow}>
                              <span className={styles.stepNumber}>{step.number}</span>
                              <span>{statusIcon(step.status, step.conclusion)}</span>
                              <span className={styles.stepName}>{step.name}</span>
                              <span className={`${styles.statusBadge} ${conclusionClass(step.conclusion)}`}>
                                {step.conclusion || step.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
