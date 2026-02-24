import React, { useState, useCallback, useEffect } from 'react';
import styles from '@/styles/releaseManager/releaseManager.module.scss';
import { ComponentGroupPanel } from './ComponentGroupPanel';
import { RiskFlagsPanel } from './RiskFlagsPanel';
import { DeploymentPlan } from './ReleaseManagerDashboard';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified?: number;
  extension?: string;
}

interface ChgSummary {
  chgNumber: string;
  artifactTypes: string[];
  fileCount: number;
  hasDeployScripts: boolean;
  hasRollbackScripts: boolean;
  categorized: Record<string, string[]>;
  files: FileInfo[];
}

interface FolderChild {
  name: string;
  type: 'chg' | 'folder' | 'release' | 'other';
  path: string;
  summary?: ChgSummary;
  fileCount?: number;
}

interface FolderContents {
  path: string;
  name: string;
  fullPath: string;
  folders: FolderChild[];
  files: FileInfo[];
  chgCount: number;
  totalFiles: number;
  isChg?: boolean;
  chgSummary?: ChgSummary;
}

export const DeploymentBrowser: React.FC = () => {
  const [years, setYears] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState('');
  const [folderContents, setFolderContents] = useState<FolderContents | null>(null);
  const [fileContent, setFileContent] = useState<{ path: string; name: string; content: string; truncated: boolean } | null>(null);
  const [deployPlan, setDeployPlan] = useState<DeploymentPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [activeChg, setActiveChg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/release-manager/deployments/years`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setYears)
      .catch(e => setError('Failed to load deployment years: ' + e.message));
  }, []);

  const navigateTo = useCallback(async (path: string) => {
    setFolderContents(null);
    setFileContent(null);
    setCurrentPath(path);
    if (!path) {
      setDeployPlan(null);
      setPlanError(null);
      setActiveChg(null);
      return;
    }

    // Find the CHG segment in the new path (if any)
    const segments = path.split('/');
    const chgSegment = segments.find(s => s.startsWith('CHG')) || null;

    // Only clear the plan if we're leaving the CHG folder entirely
    if (chgSegment !== activeChg) {
      setDeployPlan(null);
      setPlanError(null);
      setPlanLoading(false);
      setActiveChg(chgSegment);
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/release-manager/deployments/contents?path=${encodeURIComponent(path)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFolderContents(await res.json());
    } catch (e: any) {
      setError('Failed to load folder contents: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [activeChg]);

  const fetchDeployPlan = useCallback(async (chgNumber: string) => {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const res = await fetch(`${API_BASE}/api/release-manager/deployment-plan?chg=${encodeURIComponent(chgNumber)}`);
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `HTTP ${res.status}`);
      }
      setDeployPlan(await res.json());
    } catch (e: any) {
      setPlanError(e.message);
    } finally {
      setPlanLoading(false);
    }
  }, []);

  // Auto-fetch Jira deployment plan when entering a new CHG folder
  useEffect(() => {
    if (activeChg && !deployPlan && !planLoading && !planError) {
      fetchDeployPlan(activeChg);
    }
  }, [activeChg, deployPlan, planLoading, planError, fetchDeployPlan]);

  const navigateUp = useCallback(() => {
    if (!currentPath) return;
    const parts = currentPath.split('/');
    parts.pop();
    const parentPath = parts.join('/');
    if (parentPath) {
      navigateTo(parentPath);
    } else {
      setCurrentPath('');
      setFolderContents(null);
      setDeployPlan(null);
      setActiveChg(null);
    }
  }, [currentPath, navigateTo]);

  const handleReadFile = useCallback(async (filePath: string) => {
    setFileContent(null);
    try {
      const res = await fetch(`${API_BASE}/api/release-manager/deployments/file?path=${encodeURIComponent(filePath)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFileContent(await res.json());
    } catch (e: any) {
      setError('Failed to read file: ' + e.message);
    }
  }, []);

  const breadcrumbs = currentPath ? currentPath.split('/') : [];
  const currentFolderName = breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1] : '';
  const isChgFolder = currentFolderName.startsWith('CHG');

  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index < 0) {
      setCurrentPath('');
      setFolderContents(null);
      setFileContent(null);
      setDeployPlan(null);
      setActiveChg(null);
      return;
    }
    const path = breadcrumbs.slice(0, index + 1).join('/');
    navigateTo(path);
  }, [breadcrumbs, navigateTo]);

  const formatSize = (bytes: number): string => {
    if (bytes < 0) return '?';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const formatDate = (ms: number): string => {
    if (!ms) return '';
    return new Date(ms).toLocaleString();
  };

  const artifactColor = (type: string): string => {
    const colors: Record<string, string> = {
      DDL: '#6f42c1', DML: '#20c997', Web: '#fd7e14',
      Architect: '#007bff', Gateway: '#0dcaf0', Fitnesse: '#198754',
    };
    return colors[type] || '#6c757d';
  };

  // Root view: show year folders as clickable cards
  if (!currentPath) {
    return (
      <div className={styles.deployBrowser}>
        {error && (
          <div className={styles.errorBanner}><strong>Error:</strong> {error}</div>
        )}

        <div className={styles.chgSection}>
          <h3 className={styles.chgSectionTitle}>Deployment Years</h3>
          <div className={styles.chgGrid}>
            {years.map(year => (
              <div
                key={year}
                className={styles.chgCard}
                onClick={() => navigateTo(year)}
              >
                <div className={styles.chgCardHeader}>
                  <span className={styles.chgNumber}>{year}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {years.length === 0 && !error && (
          <div className={styles.emptyState}>
            <p>Select a year to browse deployment artifacts.</p>
            <p className={styles.emptyStateSubtext}>
              Browse CHG packages, view scripts, logs, and deployment artifacts.
            </p>
          </div>
        )}

        {fileContent && (
          <FileViewerModal fileContent={fileContent} onClose={() => setFileContent(null)} />
        )}
      </div>
    );
  }

  return (
    <div className={styles.deployBrowser}>
      {/* Breadcrumb Navigation */}
      <div className={styles.breadcrumb}>
        <button className={styles.breadcrumbItem} onClick={() => handleBreadcrumbClick(-1)}>
          Deployments
        </button>
        {breadcrumbs.map((segment, i) => (
          <React.Fragment key={i}>
            <span className={styles.breadcrumbSep}>/</span>
            {i < breadcrumbs.length - 1 ? (
              <button className={styles.breadcrumbItem} onClick={() => handleBreadcrumbClick(i)}>
                {segment}
              </button>
            ) : (
              <span className={styles.breadcrumbCurrent}>{segment}</span>
            )}
          </React.Fragment>
        ))}
        <button className={styles.backBtn} onClick={navigateUp} title="Go up one level">
          Up
        </button>
      </div>

      {error && (
        <div className={styles.errorBanner}><strong>Error:</strong> {error}</div>
      )}

      {loading && (
        <div className={styles.emptyState}>
          <div className={styles.spinner} />
          <p className={styles.emptyStateSubtext}>Loading folder contents...</p>
        </div>
      )}

      {/* Folder Contents */}
      {folderContents && !loading && (
        <div className={styles.deployContents}>
          {/* Summary Stats */}
          <div className={styles.deployStats}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Current Folder</div>
              <div className={styles.deployStatValue}>{folderContents.name}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Subfolders</div>
              <div className={styles.statValue}>{folderContents.folders.length}</div>
            </div>
            {folderContents.chgCount > 0 && (
              <div className={styles.statCard}>
                <div className={styles.statLabel}>CHG Packages</div>
                <div className={styles.statValue}>{folderContents.chgCount}</div>
              </div>
            )}
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Files</div>
              <div className={styles.statValue}>{folderContents.totalFiles}</div>
            </div>
          </div>

          {/* CHG Cards */}
          {folderContents.folders.filter(f => f.type === 'chg').length > 0 && (
            <div className={styles.chgSection}>
              <h3 className={styles.chgSectionTitle}>CHG Packages</h3>
              <div className={styles.chgGrid}>
                {folderContents.folders.filter(f => f.type === 'chg').map(folder => (
                  <div
                    key={folder.name}
                    className={styles.chgCard}
                    onClick={() => navigateTo(folder.path)}
                  >
                    <div className={styles.chgCardHeader}>
                      <span className={styles.chgNumber}>{folder.name}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        {folder.summary && (
                          <span className={styles.chgFileCount}>{folder.summary.fileCount} files</span>
                        )}
                        <span className={styles.openBtn}>Open</span>
                      </div>
                    </div>

                    {folder.summary && (
                      <>
                        <div className={styles.chgArtifacts}>
                          {folder.summary.artifactTypes.map(type => (
                            <span
                              key={type}
                              className={styles.artifactBadge}
                              style={{ backgroundColor: artifactColor(type), color: 'white' }}
                            >
                              {type}
                            </span>
                          ))}
                          {folder.summary.artifactTypes.length === 0 && (
                            <span className={styles.artifactBadge} style={{ backgroundColor: '#adb5bd' }}>
                              No artifacts detected
                            </span>
                          )}
                        </div>

                        <div className={styles.chgFlags}>
                          {folder.summary.hasDeployScripts && (
                            <span className={styles.chgFlag} data-type="deploy">Deploy Scripts</span>
                          )}
                          {folder.summary.hasRollbackScripts && (
                            <span className={styles.chgFlag} data-type="rollback">Rollback Scripts</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Non-CHG folders */}
          {folderContents.folders.filter(f => f.type !== 'chg').length > 0 && (
            <div className={styles.chgSection}>
              <h3 className={styles.chgSectionTitle}>Folders</h3>
              <div className={styles.chgGrid}>
                {folderContents.folders.filter(f => f.type !== 'chg').map(folder => (
                  <div
                    key={folder.name}
                    className={styles.chgCard}
                    onClick={() => navigateTo(folder.path)}
                  >
                    <div className={styles.chgCardHeader}>
                      <span className={styles.chgNumber}>{folder.name}</span>
                      <span className={styles.chgFileCount}>
                        {folder.fileCount != null && folder.fileCount >= 0 ? `${folder.fileCount} items` : ''}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Root-level files */}
          {folderContents.files.length > 0 && (
            <div className={styles.chgSection}>
              <h3 className={styles.chgSectionTitle}>Files</h3>
              <div className={styles.deployFileTable}>
                <table className={styles.ticketTable}>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {folderContents.files.map(file => (
                      <tr key={file.name} className={styles.tableRow}>
                        <td>{file.name}</td>
                        <td>{formatSize(file.size)}</td>
                        <td>{file.modified ? formatDate(file.modified) : ''}</td>
                        <td>
                          <button
                            className={styles.fileLink}
                            onClick={() => handleReadFile(file.path)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Jira Deployment Plan (auto-fetched for CHG folders) */}
          {activeChg && (
            <div className={styles.chgSummaryPanel}>
              <h3 className={styles.chgSummaryTitle}>
                {activeChg} &mdash; Jira Deployment Plan
              </h3>

              {planLoading && (
                <div className={styles.planLoadingRow}>
                  <div className={styles.spinner} />
                  <span>Fetching from Jira...</span>
                </div>
              )}

              {planError && (
                <div className={styles.planErrorRow}>
                  <span>Could not load Jira data: {planError}</span>
                  <button className={styles.openBtn} onClick={() => activeChg && fetchDeployPlan(activeChg)}>
                    Retry
                  </button>
                </div>
              )}

              {deployPlan && (
                <>
                  {/* Stats row */}
                  <div className={styles.deployStats}>
                    <div className={styles.statCard}>
                      <div className={styles.statLabel}>Tickets</div>
                      <div className={styles.statValue}>{deployPlan.totalTickets}</div>
                    </div>
                    <div className={`${styles.statCard} ${deployPlan.downtimeRequired ? styles.statCardDanger : ''}`}>
                      <div className={styles.statLabel}>Downtime</div>
                      <div className={styles.statValue}>{deployPlan.downtimeRequired ? 'YES' : 'No'}</div>
                    </div>
                    {deployPlan.architectComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Architect</div>
                        <div className={styles.statValue}>{deployPlan.architectComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.ddlComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>DDL</div>
                        <div className={styles.statValue}>{deployPlan.ddlComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.dmlComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>DML</div>
                        <div className={styles.statValue}>{deployPlan.dmlComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.webComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Web</div>
                        <div className={styles.statValue}>{deployPlan.webComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.gatewayComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Gateway</div>
                        <div className={styles.statValue}>{deployPlan.gatewayComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.fitnesseComponents.length > 0 && (
                      <div className={styles.statCard}>
                        <div className={styles.statLabel}>Fitnesse</div>
                        <div className={styles.statValue}>{deployPlan.fitnesseComponents.length}</div>
                      </div>
                    )}
                    {deployPlan.nonStandardComponents.length > 0 && (
                      <div className={`${styles.statCard} ${styles.statCardWarn}`}>
                        <div className={styles.statLabel}>Non-Standard</div>
                        <div className={styles.statValue}>{deployPlan.nonStandardComponents.length}</div>
                      </div>
                    )}
                    <div className={`${styles.statCard} ${deployPlan.riskFlags.filter(r => r.severity === 'high').length > 0 ? styles.statCardDanger : deployPlan.riskFlags.filter(r => r.severity === 'medium').length > 0 ? styles.statCardWarn : ''}`}>
                      <div className={styles.statLabel}>Risk Flags</div>
                      <div className={styles.statValue}>{deployPlan.riskFlags.length}</div>
                    </div>
                  </div>

                  {/* Breakdowns */}
                  <div className={styles.breakdownRow}>
                    <div className={styles.breakdownCard}>
                      <h4>By Team</h4>
                      <div className={styles.breakdownList}>
                        {Object.entries(deployPlan.teamBreakdown).map(([team, count]) => (
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
                        {Object.entries(deployPlan.statusBreakdown).map(([status, count]) => (
                          <div key={status} className={styles.breakdownItem}>
                            <span className={styles.breakdownLabel}>{status}</span>
                            <span className={styles.breakdownCount}>{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Risk Flags */}
                  {deployPlan.riskFlags.length > 0 && (
                    <RiskFlagsPanel riskFlags={deployPlan.riskFlags} />
                  )}

                  {/* Component Groups */}
                  <div className={styles.componentGroups}>
                    {deployPlan.architectComponents.length > 0 && (
                      <ComponentGroupPanel title="Architect Components" groups={deployPlan.architectComponents} colorClass="architect" />
                    )}
                    {deployPlan.ddlComponents.length > 0 && (
                      <ComponentGroupPanel title="DDL Components" groups={deployPlan.ddlComponents} colorClass="ddl" />
                    )}
                    {deployPlan.dmlComponents.length > 0 && (
                      <ComponentGroupPanel title="DML Components" groups={deployPlan.dmlComponents} colorClass="dml" />
                    )}
                    {deployPlan.webComponents.length > 0 && (
                      <ComponentGroupPanel title="Web Components" groups={deployPlan.webComponents} colorClass="web" />
                    )}
                    {deployPlan.gatewayComponents.length > 0 && (
                      <ComponentGroupPanel title="ChewyWMSGateway" groups={deployPlan.gatewayComponents} colorClass="gateway" />
                    )}
                    {deployPlan.fitnesseComponents.length > 0 && (
                      <ComponentGroupPanel title="Fitnesse" groups={deployPlan.fitnesseComponents} colorClass="fitnesse" />
                    )}
                    {deployPlan.nonStandardComponents.length > 0 && (
                      <ComponentGroupPanel title="Non-Standard Components" groups={deployPlan.nonStandardComponents} colorClass="nonstandard" />
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* File Summary Panel */}
          {isChgFolder && folderContents.chgSummary && (
            <div className={styles.chgSummaryPanel}>
              <h3 className={styles.chgSummaryTitle}>
                {activeChg || currentFolderName} &mdash; File Summary
              </h3>

              <div className={styles.chgSummaryRow}>
                <span className={styles.chgSummaryLabel}>Artifact Types</span>
                <div className={styles.chgArtifacts}>
                  {folderContents.chgSummary.artifactTypes.length > 0
                    ? folderContents.chgSummary.artifactTypes.map(type => (
                        <span
                          key={type}
                          className={styles.artifactBadge}
                          style={{ backgroundColor: artifactColor(type), color: 'white' }}
                        >
                          {type}
                        </span>
                      ))
                    : <span className={styles.artifactBadge} style={{ backgroundColor: '#adb5bd' }}>None detected</span>
                  }
                </div>
              </div>

              <div className={styles.chgSummaryRow}>
                <span className={styles.chgSummaryLabel}>Flags</span>
                <div className={styles.chgFlags}>
                  <span className={styles.chgFlag} data-type={folderContents.chgSummary.hasDeployScripts ? 'deploy' : ''}>
                    Deploy Scripts: {folderContents.chgSummary.hasDeployScripts ? 'Yes' : 'No'}
                  </span>
                  <span className={styles.chgFlag} data-type={folderContents.chgSummary.hasRollbackScripts ? 'rollback' : ''}>
                    Rollback Scripts: {folderContents.chgSummary.hasRollbackScripts ? 'Yes' : 'No'}
                  </span>
                  <span className={styles.chgFlag}>
                    Total Files: {folderContents.chgSummary.fileCount}
                  </span>
                </div>
              </div>

              <div className={styles.chgSummaryBreakdown}>
                {Object.entries(folderContents.chgSummary.categorized)
                  .filter(([, files]) => files.length > 0)
                  .map(([category, files]) => (
                    <div key={category} className={styles.chgCategory}>
                      <h5 className={styles.chgCategoryTitle}>
                        {category} ({files.length})
                      </h5>
                      <ul className={styles.chgFileList}>
                        {files.map(f => (
                          <li key={f}>
                            <button
                              className={styles.fileLink}
                              onClick={() => handleReadFile(folderContents.path + '/' + f)}
                            >
                              {f}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {folderContents.folders.length === 0 && folderContents.files.length === 0 && !isChgFolder && (
            <div className={styles.emptyState}>
              <p>This folder is empty.</p>
            </div>
          )}
        </div>
      )}

      {/* File Viewer Modal */}
      {fileContent && (
        <FileViewerModal fileContent={fileContent} onClose={() => setFileContent(null)} />
      )}
    </div>
  );
};

const FileViewerModal: React.FC<{
  fileContent: { path: string; name: string; content: string; truncated: boolean };
  onClose: () => void;
}> = ({ fileContent, onClose }) => (
  <div className={styles.fileModal} onClick={onClose}>
    <div className={styles.fileModalContent} onClick={e => e.stopPropagation()}>
      <div className={styles.fileModalHeader}>
        <h3>{fileContent.name}</h3>
        {fileContent.truncated && (
          <span className={styles.truncatedBadge}>Truncated (file too large)</span>
        )}
        <button className={styles.fileModalClose} onClick={onClose}>X</button>
      </div>
      <pre className={styles.fileModalBody}>{fileContent.content}</pre>
    </div>
  </div>
);
