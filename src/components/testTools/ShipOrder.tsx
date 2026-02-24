import React, { useState, useCallback, useMemo } from 'react';
import styles from '@/styles/testTools/testTools.module.scss';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

interface OrderData {
  success: boolean;
  error?: string;
  orderNumber?: string;
  containerId?: string;
  warehouseId?: string;
  connection?: string;
  pickContainers?: any[];
  pickDetails?: any[];
  orders?: any[];
  huMaster?: any[];
  storedItems?: any[];
}

interface ActionResult {
  success: boolean;
  message?: string;
  error?: string;
  [key: string]: any;
}

const FULFILLMENT_STATUSES = [
  { code: '820', label: '820 - Shipped', description: 'Container shipped from FC' },
  { code: '830', label: '830 - In Transit', description: 'Container in transit to customer' },
  { code: '840', label: '840 - Delivered', description: 'Container delivered to customer' },
];

export const ShipOrder: React.FC = () => {
  const [searchType, setSearchType] = useState<'order' | 'container' | 'oms'>('order');
  const [searchValue, setSearchValue] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<OrderData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionResults, setActionResults] = useState<Record<string, ActionResult>>({});

  // Setup params
  const [setupType, setSetupType] = useState<'normal' | 'short_ship' | 'floor_deny'>('normal');
  const [setupContainerId, setSetupContainerId] = useState('');
  const [setupItemNumber, setSetupItemNumber] = useState('');
  const [setupQtyOverride, setSetupQtyOverride] = useState('');

  // Ship params
  const [shipMode, setShipMode] = useState<'order' | 'container'>('order');
  const [shipContainerId, setShipContainerId] = useState('');

  // Fulfillment params
  const [eventContainerId, setEventContainerId] = useState('');

  // Derived: unique container IDs from pick_containers
  const containerOptions = useMemo(() => {
    if (!orderData?.pickContainers) return [];
    const seen = new Set<string>();
    return orderData.pickContainers
      .map((r: any) => String(r.container_id))
      .filter((id: string) => { if (seen.has(id)) return false; seen.add(id); return true; });
  }, [orderData]);

  // Derived: pick_details filtered to selected setup container
  const filteredDetails = useMemo(() => {
    if (!orderData?.pickDetails) return [];
    if (!setupContainerId) return orderData.pickDetails;
    return orderData.pickDetails.filter((d: any) => String(d.container_id) === setupContainerId);
  }, [orderData, setupContainerId]);

  // Derived: unique items from filtered details
  const itemOptions = useMemo(() => {
    const seen = new Set<string>();
    return filteredDetails
      .map((d: any) => ({ item: String(d.item_number), qty: d.planned_quantity }))
      .filter((o: any) => { if (seen.has(o.item)) return false; seen.add(o.item); return true; });
  }, [filteredDetails]);

  // Derived: planned qty for selected item
  const selectedPlannedQty = useMemo(() => {
    if (!setupItemNumber) return null;
    const match = filteredDetails.find((d: any) => String(d.item_number) === setupItemNumber);
    return match ? match.planned_quantity : null;
  }, [filteredDetails, setupItemNumber]);

  const handleSearch = useCallback(async () => {
    if (!searchValue.trim()) return;
    if (searchType !== 'oms' && !warehouseId.trim()) return;

    setLoading(true);
    setError(null);
    setOrderData(null);
    setActionResults({});

    try {
      const params = new URLSearchParams({
        type: searchType,
        value: searchValue.trim(),
        warehouseId: warehouseId.trim(),
      });
      const res = await fetch(`${API_BASE}/api/test-tools/resolve-order?${params}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || data.message || `HTTP ${res.status}`);
      }
      setOrderData(data);
      // Pre-populate dropdowns
      const firstContainer = data.pickContainers?.[0]?.container_id;
      setSetupContainerId(firstContainer ? String(firstContainer) : '');
      setShipContainerId(firstContainer ? String(firstContainer) : '');
      setEventContainerId(data.containerId || firstContainer ? String(firstContainer) : '');
      setSetupItemNumber('');
      setSetupQtyOverride('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [searchType, searchValue, warehouseId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const executeAction = useCallback(async (action: string, endpoint: string, body: Record<string, string>) => {
    setActionLoading(action);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setActionResults(prev => ({ ...prev, [action]: data }));
    } catch (e: any) {
      setActionResults(prev => ({ ...prev, [action]: { success: false, error: e.message } }));
    } finally {
      setActionLoading(null);
    }
  }, []);

  const handleSetupData = useCallback(() => {
    if (!orderData?.warehouseId || !orderData?.orderNumber) return;
    const body: Record<string, string> = {
      warehouseId: orderData.warehouseId,
      orderNumber: orderData.orderNumber,
      setupType,
    };
    if (setupContainerId) body.containerId = setupContainerId;
    if (setupItemNumber) body.itemOverride = setupItemNumber;
    if (setupQtyOverride.trim()) body.quantityOverride = setupQtyOverride.trim();
    executeAction('setup', '/api/test-tools/setup-order', body);
  }, [orderData, executeAction, setupType, setupContainerId, setupItemNumber, setupQtyOverride]);

  const handleShipOrder = useCallback(() => {
    if (!orderData?.warehouseId) return;
    if (shipMode === 'container') {
      if (!shipContainerId) return;
      executeAction('ship', '/api/test-tools/ship-container', {
        warehouseId: orderData.warehouseId,
        containerId: shipContainerId,
      });
    } else {
      if (!orderData.orderNumber) return;
      executeAction('ship', '/api/test-tools/ship-order', {
        warehouseId: orderData.warehouseId,
        orderNumber: orderData.orderNumber,
      });
    }
  }, [orderData, executeAction, shipMode, shipContainerId]);

  const handleFulfillmentEvent = useCallback((statusCode: string) => {
    const cid = eventContainerId.trim();
    if (!orderData?.warehouseId || !cid) return;
    executeAction(`fulfillment_${statusCode}`, '/api/test-tools/fulfillment-event', {
      warehouseId: orderData.warehouseId,
      containerId: cid,
      statusCode,
    });
  }, [orderData, executeAction, eventContainerId]);

  const canSearch = searchValue.trim() && (searchType === 'oms' || warehouseId.trim()) && !loading;
  const hasSetupData = orderData && ((orderData.huMaster && orderData.huMaster.length > 0) || (orderData.storedItems && orderData.storedItems.length > 0));

  return (
    <div className={styles.shipPanel}>
      {/* Search */}
      <div className={styles.shipDescription}>
        <p>
          Search for an order to perform actions: <strong>Setup Data</strong>,
          <strong> Ship Order / Container</strong>, or <strong>Send Fulfillment Events</strong> (Wizmo).
        </p>
      </div>

      <div className={styles.shipForm}>
        <div className={styles.shipFormRow}>
          <label className={styles.shipLabel}>Search By</label>
          <select className={styles.searchInput} value={searchType} onChange={e => setSearchType(e.target.value as any)}>
            <option value="order">Order Number</option>
            <option value="container">Container ID</option>
            <option value="oms">OMS Order Number</option>
          </select>
        </div>
        <div className={styles.shipFormRow}>
          <label className={styles.shipLabel}>Warehouse ID</label>
          <input className={styles.searchInput} type="text"
            placeholder={searchType === 'oms' ? 'Optional for OMS' : 'e.g. CFF1'}
            value={warehouseId} onChange={e => setWarehouseId(e.target.value.toUpperCase())} onKeyDown={handleKeyDown} />
        </div>
        <div className={styles.shipFormRow}>
          <label className={styles.shipLabel}>Search Value</label>
          <input className={styles.searchInput} type="text"
            placeholder={searchType === 'oms' ? 'OMS order number' : searchType === 'container' ? 'Container ID' : 'Order number'}
            value={searchValue} onChange={e => setSearchValue(e.target.value)} onKeyDown={handleKeyDown} />
        </div>
        <button className={styles.searchBtn} onClick={handleSearch} disabled={!canSearch}>
          {loading ? 'Searching...' : 'Find Order'}
        </button>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {/* Order Details */}
      {orderData && orderData.success && (
        <>
          <div className={styles.orderSummaryBanner}>
            <div className={styles.orderSummaryRow}>
              <span><strong>Warehouse:</strong> {orderData.warehouseId}</span>
              <span><strong>Order:</strong> {orderData.orderNumber || '\u2014'}</span>
              <span><strong>Containers:</strong> {containerOptions.length}</span>
              <span className={styles.orderConnection}>{orderData.connection}</span>
            </div>
          </div>

          {/* Pick Container table */}
          {orderData.pickContainers && orderData.pickContainers.length > 0 && (
            <div className={styles.orderDataSection}>
              <h4 className={styles.orderDataTitle}>
                Pick Containers <span className={styles.orderDataCount}>{orderData.pickContainers.length}</span>
              </h4>
              <div className={styles.orderDataTableWrap}>
                <table className={styles.orderDataTable}>
                  <thead><tr>{Object.keys(orderData.pickContainers[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>
                    {orderData.pickContainers.map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v: any, j) => (
                        <td key={j}>{v === null ? <span className={styles.nullVal}>NULL</span> : String(v)}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pick Detail table */}
          {orderData.pickDetails && orderData.pickDetails.length > 0 && (
            <div className={styles.orderDataSection}>
              <h4 className={styles.orderDataTitle}>
                Pick Details <span className={styles.orderDataCount}>{orderData.pickDetails.length}</span>
              </h4>
              <div className={styles.orderDataTableWrap}>
                <table className={styles.orderDataTable}>
                  <thead><tr>{Object.keys(orderData.pickDetails[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
                  <tbody>
                    {orderData.pickDetails.map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v: any, j) => (
                        <td key={j}>{v === null ? <span className={styles.nullVal}>NULL</span> : String(v)}</td>
                      ))}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {hasSetupData && (
            <div className={styles.orderSetupExists}>
              HU Master: {orderData.huMaster?.length || 0} rows &middot; Stored Items: {orderData.storedItems?.length || 0} rows already exist
            </div>
          )}

          {/* Actions */}
          <div className={styles.actionPanel}>
            <h4 className={styles.actionPanelTitle}>Actions</h4>
            <div className={styles.actionGrid}>

              {/* Setup Data */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardHeader}>
                  <span className={styles.actionCardIcon}>&#x1f4e6;</span>
                  <span className={styles.actionCardTitle}>Setup Data</span>
                </div>
                <p className={styles.actionCardDesc}>
                  Insert <code>t_hu_master</code> + <code>t_stored_item</code> records.
                </p>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Setup Type</label>
                  <select className={styles.actionParamInput} value={setupType} onChange={e => setSetupType(e.target.value as any)}>
                    <option value="normal">Normal (full qty)</option>
                    <option value="short_ship">Short Ship</option>
                    <option value="floor_deny">Floor Deny</option>
                  </select>
                </div>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Container</label>
                  <select className={styles.actionParamInput} value={setupContainerId}
                    onChange={e => { setSetupContainerId(e.target.value); setSetupItemNumber(''); setSetupQtyOverride(''); }}>
                    <option value="">All containers</option>
                    {containerOptions.map((cid: string) => <option key={cid} value={cid}>{cid}</option>)}
                  </select>
                </div>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Item</label>
                  <select className={styles.actionParamInput} value={setupItemNumber}
                    onChange={e => { setSetupItemNumber(e.target.value); setSetupQtyOverride(''); }}>
                    <option value="">All items ({itemOptions.length})</option>
                    {itemOptions.map((o: any) => (
                      <option key={o.item} value={o.item}>{o.item} (qty: {o.qty})</option>
                    ))}
                  </select>
                </div>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Qty Override</label>
                  <input className={styles.actionParamInput} type="number" min="0"
                    placeholder={selectedPlannedQty !== null ? `Planned: ${selectedPlannedQty}` : 'Leave blank for default'}
                    value={setupQtyOverride} onChange={e => setSetupQtyOverride(e.target.value)} />
                </div>

                <button className={`${styles.actionBtn} ${styles.actionBtnSetup}`}
                  onClick={handleSetupData} disabled={actionLoading !== null}>
                  {actionLoading === 'setup' ? 'Setting up...'
                    : `Run ${setupType === 'normal' ? 'Setup' : setupType === 'short_ship' ? 'Short Ship Setup' : 'Floor Deny Setup'}`}
                </button>
                {actionResults.setup && <ActionResultDisplay result={actionResults.setup} />}
              </div>

              {/* Ship */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardHeader}>
                  <span className={styles.actionCardIcon}>&#x1f69a;</span>
                  <span className={styles.actionCardTitle}>Ship</span>
                </div>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Ship Mode</label>
                  <div className={styles.shipModeToggle}>
                    <button className={`${styles.shipModeBtn} ${shipMode === 'order' ? styles.shipModeBtnActive : ''}`}
                      onClick={() => setShipMode('order')}>By Order</button>
                    <button className={`${styles.shipModeBtn} ${shipMode === 'container' ? styles.shipModeBtnActive : ''}`}
                      onClick={() => setShipMode('container')}>By Container</button>
                  </div>
                </div>

                {shipMode === 'order' ? (
                  <p className={styles.actionCardDesc}>
                    <code>usp_nonprod_order_ship</code> &mdash; ships all containers for order <strong>{orderData.orderNumber}</strong>.
                  </p>
                ) : (
                  <>
                    <p className={styles.actionCardDesc}>
                      <code>usp_nonprod_container_ship</code> &mdash; ships a specific container.
                    </p>
                    <div className={styles.actionParamGroup}>
                      <label className={styles.actionParamLabel}>Container</label>
                      <select className={styles.actionParamInput} value={shipContainerId}
                        onChange={e => setShipContainerId(e.target.value)}>
                        <option value="">Select container...</option>
                        {containerOptions.map((cid: string) => <option key={cid} value={cid}>{cid}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <button className={`${styles.actionBtn} ${styles.actionBtnShip}`}
                  onClick={handleShipOrder} disabled={actionLoading !== null || (shipMode === 'container' && !shipContainerId)}>
                  {actionLoading === 'ship' ? 'Shipping...' : shipMode === 'order' ? 'Ship Order' : 'Ship Container'}
                </button>
                {actionResults.ship && <ActionResultDisplay result={actionResults.ship} />}
              </div>

              {/* Fulfillment Events */}
              <div className={styles.actionCard}>
                <div className={styles.actionCardHeader}>
                  <span className={styles.actionCardIcon}>&#x1f4e1;</span>
                  <span className={styles.actionCardTitle}>Fulfillment Events (Wizmo)</span>
                </div>
                <p className={styles.actionCardDesc}>
                  <code>usp_pick_container_fulfillment_status_update</code>
                </p>

                <div className={styles.actionParamGroup}>
                  <label className={styles.actionParamLabel}>Container</label>
                  <select className={styles.actionParamInput} value={eventContainerId}
                    onChange={e => setEventContainerId(e.target.value)}>
                    <option value="">Select container...</option>
                    {containerOptions.map((cid: string) => <option key={cid} value={cid}>{cid}</option>)}
                  </select>
                </div>

                {!eventContainerId.trim() ? (
                  <p className={styles.actionCardWarn}>Select a container above to send events.</p>
                ) : (
                  <div className={styles.fulfillmentBtnGroup}>
                    {FULFILLMENT_STATUSES.map(fs => (
                      <div key={fs.code} className={styles.fulfillmentRow}>
                        <button className={`${styles.actionBtn} ${styles.actionBtnEvent}`}
                          onClick={() => handleFulfillmentEvent(fs.code)}
                          disabled={actionLoading !== null} title={fs.description}>
                          {actionLoading === `fulfillment_${fs.code}` ? '...' : `Send ${fs.label}`}
                        </button>
                        {actionResults[`fulfillment_${fs.code}`] && (
                          <ActionResultDisplay result={actionResults[`fulfillment_${fs.code}`]} compact />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </>
      )}
    </div>
  );
};

const ActionResultDisplay: React.FC<{ result: ActionResult; compact?: boolean }> = ({ result, compact }) => (
  <div className={`${styles.actionResult} ${result.success ? styles.actionResultOk : styles.actionResultFail} ${compact ? styles.actionResultCompact : ''}`}>
    <span className={styles.actionResultIcon}>{result.success ? '\u2713' : '\u2717'}</span>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div>{result.message || result.error || (result.success ? 'Done' : 'Failed')}</div>
      {result.debugLog && Array.isArray(result.debugLog) && (
        <div className={styles.actionDebugLog}>
          {result.debugLog.map((line: string, i: number) => (
            <div key={i} className={styles.actionDebugLine}>{line}</div>
          ))}
        </div>
      )}
      {result.verifyHuMaster && Array.isArray(result.verifyHuMaster) && result.verifyHuMaster.length > 0 && (
        <DataResultTable title="t_hu_master" rows={result.verifyHuMaster} />
      )}
      {result.verifyStoredItem && Array.isArray(result.verifyStoredItem) && result.verifyStoredItem.length > 0 && (
        <DataResultTable title="t_stored_item" rows={result.verifyStoredItem} />
      )}
    </div>
  </div>
);

const DataResultTable: React.FC<{ title: string; rows: any[] }> = ({ title, rows }) => (
  <div className={styles.actionVerifySection}>
    <div className={styles.actionVerifyTitle}>{title} <span className={styles.orderDataCount}>{rows.length}</span></div>
    <div className={styles.orderDataTableWrap}>
      <table className={styles.orderDataTable}>
        <thead><tr>{Object.keys(rows[0]).map(k => <th key={k}>{k}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{Object.values(row).map((v: any, j) => (
              <td key={j}>{v === null ? <span className={styles.nullVal}>NULL</span> : String(v)}</td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
