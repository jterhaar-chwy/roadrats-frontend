import React, { useState, useCallback } from 'react';
import styles from '@/styles/testTools/testTools.module.scss';
import { getApiBaseUrl } from '@/utils/api';

const API_BASE = getApiBaseUrl();

const COMMON_WAREHOUSES = [
  'AVP1', 'CFC1', 'CFF1', 'CLT1', 'DAY1', 'DFW1', 'MCO1', 'PHX1', 'RNO1',
];

interface LookupResult {
  success: boolean;
  found: boolean;
  message?: string;
  error?: string;
  connection?: string;
  warehouses?: string[];
  itemMaster?: Record<string, unknown>[];
  itemUom?: Record<string, unknown>[];
}

interface ImportWhResult {
  warehouseId: string;
  success: boolean;
  statusCode?: number;
  response?: string;
  error?: string;
  xmlSent?: string;
}

interface ImportResult {
  success: boolean;
  totalWarehouses: number;
  successCount: number;
  failCount: number;
  results: ImportWhResult[];
}

export const ItemImport: React.FC = () => {
  const [searchItem, setSearchItem] = useState('');
  const [searchWh, setSearchWh] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);

  // Import form state
  const [showImportForm, setShowImportForm] = useState(false);
  const [importItem, setImportItem] = useState('');
  const [selectedWarehouses, setSelectedWarehouses] = useState<string[]>([]);
  const [customWh, setCustomWh] = useState('');
  const [description, setDescription] = useState('');
  const [weight, setWeight] = useState('1.0');
  const [length, setLength] = useState('10.0');
  const [width, setWidth] = useState('10.0');
  const [height, setHeight] = useState('10.0');
  const [inventoryType, setInventoryType] = useState('FG');
  const [frozen, setFrozen] = useState('N');
  const [fresh, setFresh] = useState('N');
  const [hazmat, setHazmat] = useState('No');

  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [expandedXml, setExpandedXml] = useState<number | null>(null);

  const handleLookup = useCallback(async () => {
    if (!searchItem.trim()) return;
    setIsSearching(true);
    setLookupResult(null);
    setImportResult(null);
    setShowImportForm(false);

    try {
      const params = new URLSearchParams({ itemNumber: searchItem.trim() });
      if (searchWh.trim()) params.set('warehouseId', searchWh.trim());
      const resp = await fetch(`${API_BASE}/api/test-tools/item-lookup?${params}`);
      const data = await resp.json();
      setLookupResult(data);

      if (!data.found) {
        setImportItem(searchItem.trim());
        setShowImportForm(true);
        if (searchWh.trim() && !selectedWarehouses.includes(searchWh.trim())) {
          setSelectedWarehouses([searchWh.trim()]);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setLookupResult({ success: false, found: false, error: msg });
    } finally {
      setIsSearching(false);
    }
  }, [searchItem, searchWh, selectedWarehouses]);

  const toggleWarehouse = (wh: string) => {
    setSelectedWarehouses(prev =>
      prev.includes(wh) ? prev.filter(w => w !== wh) : [...prev, wh]
    );
  };

  const addCustomWarehouse = () => {
    const wh = customWh.trim().toUpperCase();
    if (wh && !selectedWarehouses.includes(wh)) {
      setSelectedWarehouses(prev => [...prev, wh]);
    }
    setCustomWh('');
  };

  const handleImport = useCallback(async () => {
    if (!importItem.trim() || selectedWarehouses.length === 0) return;
    setIsImporting(true);
    setImportResult(null);

    try {
      const resp = await fetch(`${API_BASE}/api/test-tools/item-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemNumber: importItem.trim(),
          warehouses: selectedWarehouses,
          description: description || `Imported Item ${importItem.trim()}`,
          weight, length, width, height,
          uom: 'EA',
          inventoryType, frozen, fresh, hazmat,
        }),
      });
      const data = await resp.json();
      setImportResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setImportResult({ success: false, totalWarehouses: 0, successCount: 0, failCount: 0, results: [{ warehouseId: '?', success: false, error: msg }] });
    } finally {
      setIsImporting(false);
    }
  }, [importItem, selectedWarehouses, description, weight, length, width, height, inventoryType, frozen, fresh, hazmat]);

  const openImportFormForItem = () => {
    setImportItem(searchItem.trim());
    setShowImportForm(true);
    setImportResult(null);
  };

  return (
    <div className={styles.itemImportPanel}>
      {/* Search Section */}
      <div className={styles.itemSearchSection}>
        <h3>Item Lookup</h3>
        <p className={styles.itemSearchHelp}>Search for an item to see if it exists. If not found, you can create it.</p>
        <div className={styles.itemSearchRow}>
          <input
            type="text"
            placeholder="Item Number"
            value={searchItem}
            onChange={e => setSearchItem(e.target.value)}
            className={styles.itemInput}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <input
            type="text"
            placeholder="Warehouse (optional)"
            value={searchWh}
            onChange={e => setSearchWh(e.target.value)}
            className={styles.itemInputSmall}
            onKeyDown={e => e.key === 'Enter' && handleLookup()}
          />
          <button
            onClick={handleLookup}
            disabled={isSearching || !searchItem.trim()}
            className={styles.itemBtn}
          >
            {isSearching ? 'Searching...' : 'Find Item'}
          </button>
        </div>
      </div>

      {/* Lookup Result */}
      {lookupResult && (
        <div className={`${styles.itemResultCard} ${lookupResult.found ? styles.itemFound : styles.itemNotFound}`}>
          <div className={styles.itemResultHeader}>
            <span className={styles.itemResultBadge}>
              {lookupResult.found ? 'FOUND' : 'NOT FOUND'}
            </span>
            <span className={styles.itemResultMsg}>{lookupResult.message || lookupResult.error}</span>
            {lookupResult.connection && (
              <span className={styles.itemConnectionInfo}>{lookupResult.connection}</span>
            )}
          </div>

          {lookupResult.found && lookupResult.itemMaster && lookupResult.itemMaster.length > 0 && (
            <>
              <div className={styles.itemTableSection}>
                <h4>t_item_master ({lookupResult.itemMaster.length} row{lookupResult.itemMaster.length !== 1 ? 's' : ''})</h4>
                <div className={styles.itemTableWrap}>
                  <table className={styles.itemTable}>
                    <thead>
                      <tr>
                        {Object.keys(lookupResult.itemMaster[0]).map(col => (
                          <th key={col}>{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {lookupResult.itemMaster.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j}>{val != null ? String(val) : '—'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {lookupResult.itemUom && lookupResult.itemUom.length > 0 && (
                <div className={styles.itemTableSection}>
                  <h4>t_item_uom ({lookupResult.itemUom.length} row{lookupResult.itemUom.length !== 1 ? 's' : ''})</h4>
                  <div className={styles.itemTableWrap}>
                    <table className={styles.itemTable}>
                      <thead>
                        <tr>
                          {Object.keys(lookupResult.itemUom[0]).map(col => (
                            <th key={col}>{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lookupResult.itemUom.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j}>{val != null ? String(val) : '—'}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <button onClick={openImportFormForItem} className={styles.itemBtnSecondary}>
                Import to Additional Warehouses
              </button>
            </>
          )}

          {!lookupResult.found && !showImportForm && (
            <button onClick={openImportFormForItem} className={styles.itemBtn}>
              Create This Item
            </button>
          )}
        </div>
      )}

      {/* Import Form */}
      {showImportForm && (
        <div className={styles.itemImportForm}>
          <h3>Import Item</h3>

          <div className={styles.itemFormGrid}>
            <div className={styles.itemFormGroup}>
              <label>Item Number</label>
              <input
                type="text"
                value={importItem}
                onChange={e => setImportItem(e.target.value)}
                className={styles.itemInput}
              />
            </div>
            <div className={styles.itemFormGroup}>
              <label>Description</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder={`Imported Item ${importItem}`}
                className={styles.itemInput}
              />
            </div>
          </div>

          <div className={styles.itemFormSection}>
            <label>Target Warehouses</label>
            <div className={styles.itemWhGrid}>
              {COMMON_WAREHOUSES.map(wh => (
                <button
                  key={wh}
                  className={`${styles.itemWhChip} ${selectedWarehouses.includes(wh) ? styles.itemWhChipActive : ''}`}
                  onClick={() => toggleWarehouse(wh)}
                >
                  {wh}
                </button>
              ))}
            </div>
            <div className={styles.itemWhCustomRow}>
              <input
                type="text"
                placeholder="Other warehouse..."
                value={customWh}
                onChange={e => setCustomWh(e.target.value)}
                className={styles.itemInputSmall}
                onKeyDown={e => e.key === 'Enter' && addCustomWarehouse()}
              />
              <button onClick={addCustomWarehouse} className={styles.itemBtnSmall}>Add</button>
              {selectedWarehouses.filter(w => !COMMON_WAREHOUSES.includes(w)).map(wh => (
                <span key={wh} className={styles.itemWhTag}>
                  {wh}
                  <button onClick={() => toggleWarehouse(wh)}>&times;</button>
                </span>
              ))}
            </div>
            {selectedWarehouses.length > 0 && (
              <div className={styles.itemWhSummary}>
                Selected: {selectedWarehouses.join(', ')}
              </div>
            )}
          </div>

          <div className={styles.itemFormSection}>
            <label>Dimensions &amp; Weight</label>
            <div className={styles.itemDimGrid}>
              <div className={styles.itemFormGroup}>
                <label>Weight (lbs)</label>
                <input type="text" value={weight} onChange={e => setWeight(e.target.value)} className={styles.itemInputSmall} />
              </div>
              <div className={styles.itemFormGroup}>
                <label>Length (in)</label>
                <input type="text" value={length} onChange={e => setLength(e.target.value)} className={styles.itemInputSmall} />
              </div>
              <div className={styles.itemFormGroup}>
                <label>Width (in)</label>
                <input type="text" value={width} onChange={e => setWidth(e.target.value)} className={styles.itemInputSmall} />
              </div>
              <div className={styles.itemFormGroup}>
                <label>Height (in)</label>
                <input type="text" value={height} onChange={e => setHeight(e.target.value)} className={styles.itemInputSmall} />
              </div>
            </div>
          </div>

          <div className={styles.itemFormSection}>
            <label>Item Attributes</label>
            <div className={styles.itemAttrGrid}>
              <div className={styles.itemFormGroup}>
                <label>Inventory Type</label>
                <select value={inventoryType} onChange={e => setInventoryType(e.target.value)} className={styles.itemSelect}>
                  <option value="FG">FG (Finished Goods)</option>
                  <option value="RM">RM (Raw Material)</option>
                  <option value="PKG">PKG (Packaging)</option>
                </select>
              </div>
              <div className={styles.itemFormGroup}>
                <label>Frozen</label>
                <select value={frozen} onChange={e => setFrozen(e.target.value)} className={styles.itemSelect}>
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
              </div>
              <div className={styles.itemFormGroup}>
                <label>Fresh</label>
                <select value={fresh} onChange={e => setFresh(e.target.value)} className={styles.itemSelect}>
                  <option value="N">No</option>
                  <option value="Y">Yes</option>
                </select>
              </div>
              <div className={styles.itemFormGroup}>
                <label>HazMat</label>
                <select value={hazmat} onChange={e => setHazmat(e.target.value)} className={styles.itemSelect}>
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.itemFormActions}>
            <button
              onClick={handleImport}
              disabled={isImporting || !importItem.trim() || selectedWarehouses.length === 0}
              className={styles.itemBtn}
            >
              {isImporting
                ? 'Importing...'
                : `Import to ${selectedWarehouses.length} Warehouse${selectedWarehouses.length !== 1 ? 's' : ''}`}
            </button>
            <button onClick={() => setShowImportForm(false)} className={styles.itemBtnSecondary}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import Results */}
      {importResult && (
        <div className={styles.itemImportResults}>
          <h3>Import Results</h3>
          <div className={styles.itemImportSummary}>
            <span className={styles.itemImportStat}>
              Total: {importResult.totalWarehouses}
            </span>
            <span className={`${styles.itemImportStat} ${styles.statSuccess}`}>
              Success: {importResult.successCount}
            </span>
            {importResult.failCount > 0 && (
              <span className={`${styles.itemImportStat} ${styles.statFail}`}>
                Failed: {importResult.failCount}
              </span>
            )}
          </div>

          {importResult.results.map((r, i) => (
            <div key={i} className={`${styles.itemImportWhResult} ${r.success ? styles.whSuccess : styles.whFail}`}>
              <div className={styles.itemImportWhHeader}>
                <span className={styles.itemImportWhBadge}>
                  {r.success ? 'OK' : 'FAIL'}
                </span>
                <strong>{r.warehouseId}</strong>
                {r.statusCode && <span className={styles.itemHttpCode}>HTTP {r.statusCode}</span>}
                {r.error && <span className={styles.itemErrorMsg}>{r.error}</span>}
                <button
                  className={styles.itemXmlToggle}
                  onClick={() => setExpandedXml(expandedXml === i ? null : i)}
                >
                  {expandedXml === i ? 'Hide XML' : 'Show XML'}
                </button>
              </div>
              {r.response && (
                <div className={styles.itemResponsePreview}>
                  {r.response.substring(0, 200)}{r.response.length > 200 ? '...' : ''}
                </div>
              )}
              {expandedXml === i && r.xmlSent && (
                <pre className={styles.itemXmlBlock}>{r.xmlSent}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
