import React, { useState, useCallback, useEffect } from 'react';
import styles from '@/styles/clsManagement/saturdayDeliveryPanel.module.scss';
import { KibSectionHeading } from '@chewy/kib-content-groups-react';
import { KibButtonNew } from '@chewy/kib-controls-react';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface SaturdayDeliveryResponse {
  totalRateOrders: number;
  originsChecked: number;
  totalSaturdayFlags: number;
  queryTimeMs: number;
  groupedByService: Record<string, string[]>;
  message?: string;
  error?: string;
}

interface SaturdayDeliveryPanelProps {
  onDataChange?: (data: any) => void;
}

export const SaturdayDeliveryPanel: React.FC<SaturdayDeliveryPanelProps> = ({ onDataChange }) => {
  const [data, setData] = useState<SaturdayDeliveryResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/cls/saturday-delivery`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || `Request failed with status ${res.status}`);
      }
      const json: SaturdayDeliveryResponse = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const copyZips = (zips: string[]) => {
    navigator.clipboard.writeText(zips.join(', ')).catch(() => {});
  };

  const grouped = data?.groupedByService ?? {};
  const serviceKeys = Object.keys(grouped).sort();

  // Notify parent of data changes
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        totalRateOrders: data?.totalRateOrders || 0,
        originsChecked: data?.originsChecked || 0,
        totalSaturdayFlags: data?.totalSaturdayFlags || 0,
        queryTimeMs: data?.queryTimeMs,
        servicesCount: serviceKeys.length,
        sampleServices: serviceKeys.slice(0, 5).map(svc => ({
          serviceName: svc,
          zipCount: grouped[svc]?.length || 0,
          sampleZips: grouped[svc]?.slice(0, 10) || [],
        })),
        error,
        isLoading,
        message: data?.message,
      });
    }
  }, [data, error, isLoading, serviceKeys, grouped, onDataChange]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <p className={styles.description}>
          Checks 2nd rate orders for Saturday delivery flags by querying the CLS routing guide for each origin.
        </p>
        <KibButtonNew size="medium" onClick={fetchData} disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Zips for Saturday Delivery'}
        </KibButtonNew>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <>
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Rate Orders</div>
              <div className={styles.statValue}>{data.totalRateOrders ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Origins Checked</div>
              <div className={styles.statValue}>{data.originsChecked ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Saturday Flags</div>
              <div className={styles.statValue}>{data.totalSaturdayFlags ?? 0}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Query Time</div>
              <div className={styles.statValue}>{data.queryTimeMs ?? 0}ms</div>
            </div>
          </div>

          {data.message && (
            <div className={styles.infoMessage}>{data.message}</div>
          )}

          {serviceKeys.length > 0 ? (
            <KibSectionHeading heading="Zips Marked with Saturday Delivery" className={styles.resultsHeading}>
              <div className={styles.serviceList}>
                {serviceKeys.map((svc) => {
                  const zips = grouped[svc];
                  return (
                    <div key={svc} className={styles.serviceItem}>
                      <div className={styles.serviceHeader}>
                        <div className={styles.serviceName}>{svc}</div>
                        <div className={styles.serviceActions}>
                          <span className={styles.zipCount}>{zips.length} zip{zips.length !== 1 ? 's' : ''}</span>
                          <KibButtonNew size="small" onClick={() => copyZips(zips)}>
                            Copy Zips
                          </KibButtonNew>
                        </div>
                      </div>
                      <div className={styles.zipList}>
                        {zips.map((zip) => (
                          <span key={zip} className={styles.zipBadge}>{zip}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </KibSectionHeading>
          ) : (
            <div className={styles.noResults}>
              No SATURDAYDELIVERY_FLAG = true across any origin.
            </div>
          )}
        </>
      )}

      {!data && !isLoading && !error && (
        <div className={styles.emptyState}>
          <p>Click &quot;Check Zips for Saturday Delivery&quot; to run the Saturday delivery pipeline.</p>
        </div>
      )}
    </div>
  );
};
