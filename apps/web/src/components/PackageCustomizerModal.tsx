import { useState, useMemo } from 'react';

export interface PackageCustomizerProps {
  originalPackage: any;
  availableProducts: any[];
  onClose: () => void;
  onProceed: (customizedData: any) => void;
}

export function PackageCustomizerModal({
  originalPackage,
  availableProducts,
  onClose,
  onProceed,
}: PackageCustomizerProps) {
  const modules = availableProducts.filter((p) => p.category === 'module');
  const inverters = availableProducts.filter((p) => p.category === 'inverter');
  const batteries = availableProducts.filter((p) => p.category === 'battery');

  // Initial state derived from original package
  const initialPanel = modules.find((m) => m.id === originalPackage.panelProductId) || modules[0];
  const initialInverter = inverters.find((i) => i.id === originalPackage.inverterProductId) || inverters[0];
  const initialBattery = batteries.find((b) => b.id === originalPackage.batteryProductId) || (batteries.length > 0 ? batteries[0] : null);

  const [panelId, setPanelId] = useState(initialPanel?.id || '');
  const [panelQty, setPanelQty] = useState(Number(originalPackage.panelQuantity) || 4);
  const [inverterId, setInverterId] = useState(initialInverter?.id || '');
  const [hasBattery, setHasBattery] = useState(Boolean(originalPackage.batteryProductId));
  const [batteryId, setBatteryId] = useState(initialBattery?.id || '');
  const [batteryQty, setBatteryQty] = useState(originalPackage.batteryProductId ? 1 : 0);
  const [includeInstallation, setIncludeInstallation] = useState(true);

  // Recalculations
  const currentPanel = modules.find((m) => m.id === panelId) || initialPanel;
  const currentInverter = inverters.find((i) => i.id === inverterId) || initialInverter;
  const currentBattery = hasBattery ? (batteries.find((b) => b.id === batteryId) || initialBattery) : null;

  const panelWattage = currentPanel?.wattage || 550;
  const recalculatedCapacityKwp = Number(((panelQty * panelWattage) / 1000).toFixed(2));
  const requiredRooftopAreaSqFt = Math.ceil(panelQty * 24.5);

  const expectedMonthlyGenerationKwh = Number((recalculatedCapacityKwp * 4.2 * 0.8 * 30).toFixed(1));

  // Pricing recalculation
  const panelsCost = panelQty * (currentPanel?.price || 18500);
  const inverterCost = currentInverter?.price || 115000;
  const batteryCost = hasBattery && currentBattery ? batteryQty * (currentBattery?.price || 0) : 0;
  const mountingCost = panelQty * 1500;
  const electricalBOS = 18000;
  const installationCost = includeInstallation ? Math.max(15000, Math.round(recalculatedCapacityKwp * 6000)) : 0;
  const logisticsFee = 7500;

  const subtotal = panelsCost + inverterCost + batteryCost + mountingCost + electricalBOS + installationCost + logisticsFee;
  const vatTax = Math.round(subtotal * 0.05);
  const recalculatedTotal = subtotal + vatTax;

  const originalTotal = Number(originalPackage.totalPrice);
  const priceDifference = recalculatedTotal - originalTotal;

  // Technical Compatibility Checks
  const warnings: string[] = [];
  const inverterKw = (currentInverter?.wattage || 3000) / 1000;

  if (inverterKw < recalculatedCapacityKwp * 0.75) {
    warnings.push(`⚠️ Inverter capacity (${inverterKw} kW) is significantly lower than PV capacity (${recalculatedCapacityKwp} kWp). DC clipping may occur during bright hours.`);
  }
  if (originalPackage.systemType === 'off-grid' && (!hasBattery || batteryQty === 0)) {
    warnings.push('⚠️ Off-grid systems strictly require an energy storage battery bank for continuous power.');
  }
  if (recalculatedCapacityKwp > 12 && includeInstallation) {
    warnings.push('ℹ️ Sizing exceeds 10 kWp: requires 3-phase utility grid connection.');
  }

  const expectedGenerationMonthlyKwh = Math.round(recalculatedCapacityKwp * 4.3 * 30 * 0.82);

  function handleConfirm() {
    onProceed({
      isCustomized: true,
      originalPackageId: originalPackage.id,
      originalPackageName: originalPackage.name,
      packageName: `${originalPackage.name} (Customized)`,
      systemType: originalPackage.systemType,
      capacityKwp: recalculatedCapacityKwp,
      panelProduct: currentPanel,
      panelQuantity: panelQty,
      inverterProduct: currentInverter,
      batteryProduct: currentBattery,
      batteryQuantity: hasBattery ? batteryQty : 0,
      includeInstallation,
      requiredRooftopAreaSqFt,
      expectedGenerationMonthlyKwh,
      totalPrice: recalculatedTotal,
      pricingBreakdown: {
        panelsCost,
        inverterCost,
        batteryCost,
        mountingCost,
        electricalBOS,
        installationCost,
        logisticsFee,
        vatTax,
        finalTotal: recalculatedTotal,
      },
    });
  }

  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-content" style={{ maxWidth: '850px' }}>
        <div className="doc-modal-actions">
          <div>
            <span className="eyebrow">Package Customizer</span>
            <h2 style={{ margin: '4px 0 0 0' }}>Customize {originalPackage.name}</h2>
          </div>
          <button className="text-button" onClick={onClose} type="button">
            ✕ Close
          </button>
        </div>

        <div className="customizer-grid">
          {/* Controls Column */}
          <div className="customizer-controls">
            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #edf2f7', paddingBottom: '6px' }}>
              Equipment Adjustments
            </h4>

            {/* Panel Selector & Qty */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Solar Panel Model</label>
              <select value={panelId} onChange={(e) => setPanelId(e.target.value)}>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.wattage || 550}W) · BDT {Number(m.price).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Panel Quantity (Current: {panelQty} Panels)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPanelQty(Math.max(2, panelQty - 1))}
                >
                  -
                </button>
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={panelQty}
                  onChange={(e) => setPanelQty(Math.max(2, Number(e.target.value)))}
                  style={{ width: '80px', textAlign: 'center' }}
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setPanelQty(panelQty + 1)}
                >
                  +
                </button>
                <span style={{ fontSize: '13px', color: '#718096' }}>
                  = {recalculatedCapacityKwp} kWp Total PV
                </span>
              </div>
            </div>

            {/* Inverter Selector */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label>Inverter Model</label>
              <select value={inverterId} onChange={(e) => setInverterId(e.target.value)}>
                {inverters.map((inv) => (
                  <option key={inv.id} value={inv.id}>
                    {inv.name} · BDT {Number(inv.price).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Battery Storage Options */}
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={hasBattery}
                  onChange={(e) => {
                    setHasBattery(e.target.checked);
                    if (e.target.checked && batteryQty === 0) setBatteryQty(1);
                  }}
                />
                <strong>Include Energy Storage Battery Bank</strong>
              </label>

              {hasBattery && (
                <div style={{ marginTop: '8px', paddingLeft: '16px', borderLeft: '2px solid #cbd5e0' }}>
                  <select
                    value={batteryId}
                    onChange={(e) => setBatteryId(e.target.value)}
                    style={{ marginBottom: '8px' }}
                  >
                    {batteries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} · BDT {Number(b.price).toLocaleString()}
                      </option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px' }}>Battery Units:</span>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setBatteryQty(Math.max(1, batteryQty - 1))}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={batteryQty}
                      onChange={(e) => setBatteryQty(Math.max(1, Number(e.target.value)))}
                      style={{ width: '60px', textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => setBatteryQty(batteryQty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Installation Toggle */}
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeInstallation}
                  onChange={(e) => setIncludeInstallation(e.target.checked)}
                />
                <span>Include Certified Turnkey Installation & Testing Service</span>
              </label>
            </div>
          </div>

          {/* Real-time Recalculated Summary Column */}
          <div className="customizer-summary" style={{ background: '#f7fafc', padding: '20px', borderRadius: '8px' }}>
            <h4 style={{ margin: '0 0 12px 0', borderBottom: '1px solid #edf2f7', paddingBottom: '6px' }}>
              Live Recalculation
            </h4>

            <div className="metric-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
              <div className="metric-card teal" style={{ padding: '10px' }}>
                <span>Capacity</span>
                <strong style={{ fontSize: '18px' }}>{recalculatedCapacityKwp} kWp</strong>
                <small>Original: {originalPackage.capacityKwp} kWp</small>
              </div>
              <div className="metric-card green" style={{ padding: '10px' }}>
                <span>Expected Output</span>
                <strong style={{ fontSize: '18px' }}>{expectedMonthlyGenerationKwh} kWh/mo</strong>
                <small>Est. BDT {Math.round(expectedMonthlyGenerationKwh * 8.5).toLocaleString()} save</small>
              </div>
            </div>

            <div style={{ fontSize: '13px', lineHeight: '1.8', color: '#4a5568', marginBottom: '16px' }}>
              <div><strong>Required Roof Area:</strong> ~{requiredRooftopAreaSqFt} sq ft</div>
              <div><strong>Panels:</strong> {panelQty} × {currentPanel?.brand || 'Solar Module'}</div>
              <div><strong>Inverter:</strong> {currentInverter?.name}</div>
              <div>
                <strong>Battery:</strong> {hasBattery && currentBattery ? `${batteryQty} × ${currentBattery.name}` : 'None'}
              </div>
              <div><strong>Installation:</strong> {includeInstallation ? 'Certified Engineer Team' : 'Equipment Only'}</div>
            </div>

            {/* Compatibility Warnings */}
            {warnings.length > 0 && (
              <div className="notice" style={{ borderColor: '#ecc94b', background: '#fefcbf', color: '#975a16', fontSize: '12px', marginBottom: '16px' }}>
                {warnings.map((w, idx) => (
                  <div key={idx}>{w}</div>
                ))}
              </div>
            )}

            {/* Price Comparison */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#718096' }}>
                <span>Standard Package Price:</span>
                <span>BDT {originalTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#2b6cb0', marginTop: '4px' }}>
                <span>Customized Total:</span>
                <span>BDT {recalculatedTotal.toLocaleString()}</span>
              </div>
              <div style={{ textAlign: 'right', fontSize: '12px', color: priceDifference >= 0 ? '#38a169' : '#e53e3e', fontWeight: '600' }}>
                {priceDifference >= 0 ? `+ BDT ${priceDifference.toLocaleString()}` : `- BDT ${Math.abs(priceDifference).toLocaleString()}`} vs standard
              </div>
            </div>

            <button
              className="primary-button"
              style={{ width: '100%' }}
              onClick={handleConfirm}
              type="button"
            >
              ✓ Proceed with Customized Package
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
