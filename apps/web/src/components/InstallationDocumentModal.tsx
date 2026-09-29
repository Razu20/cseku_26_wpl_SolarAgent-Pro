export interface InstallationDocProps {
  order: any;
  onClose: () => void;
}

export function InstallationDocumentModal({ order, onClose }: { order: any; onClose: () => void }) {
  if (!order) return null;

  const config = order.configuration || {};
  const estimate = order.estimate || {};
  const sizing = estimate.systemSizing || {};
  const pricing = order.pricing || estimate.pricing || {};
  const bom = estimate.billOfMaterials || [];
  const systemDesign = estimate.systemDesign || {};
  const loads = estimate.loads || [];

  function handlePrint() {
    window.print();
  }

  function handleDownloadJson() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(order, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `SolarAgent_${order.orderNumber}_Installation_Report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }

  return (
    <div className="doc-modal-overlay">
      <div className="doc-modal-content">
        <div className="doc-modal-actions no-print">
          <div>
            <strong>Document Preview: {order.orderNumber}</strong>
            <span className="pill success" style={{ marginLeft: '10px' }}>
              {order.status?.toUpperCase()}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="primary-button" onClick={handlePrint} type="button">
              🖨️ Print / Save PDF
            </button>
            <button className="secondary-button" onClick={handleDownloadJson} type="button">
              ⬇️ Export JSON
            </button>
            <button className="text-button" onClick={onClose} type="button">
              ✕ Close
            </button>
          </div>
        </div>

        <div className="printable-document">
          {/* Header */}
          <div className="doc-header">
            <div>
              <h1 style={{ margin: 0, color: '#1a365d', fontSize: '26px' }}>SOLARAGENT PRO BANGLADESH</h1>
              <p style={{ margin: '4px 0', color: '#4a5568', fontSize: '13px' }}>
                Certified Turnkey Renewable Energy Engineering & Field Installation Document
              </p>
              <small style={{ color: '#718096' }}>
                Corporate: Level 9, Green Energy Tower, Banani, Dhaka-1213 &bull; Helpline: +880 9612-SOLAR &bull; RJSC: REG-BD-2024-9182
              </small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#2b6cb0' }}>{order.orderNumber}</div>
              <small>Date: {new Date(order.createdAt || Date.now()).toLocaleDateString()}</small>
              <div style={{ marginTop: '4px' }}>
                <span className="pill">{order.projectType?.toUpperCase()} SYSTEM</span>
              </div>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '2px solid #2b6cb0', margin: '20px 0' }} />

          {/* Customer & Location Details */}
          <div className="doc-section">
            <h3 className="doc-section-title">1. Customer & Site Identification</h3>
            <table className="doc-table">
              <tbody>
                <tr>
                  <td className="doc-label">Customer Name:</td>
                  <td><strong>{order.customerName}</strong></td>
                  <td className="doc-label">Contact Phone:</td>
                  <td><strong>{order.contactNumber}</strong></td>
                </tr>
                <tr>
                  <td className="doc-label">Email Address:</td>
                  <td>{order.email || 'N/A'}</td>
                  <td className="doc-label">Installation Address:</td>
                  <td>{order.address || `${order.village}, ${order.upazila}, ${order.district}`}</td>
                </tr>
                <tr>
                  <td className="doc-label">Bangladesh Administrative:</td>
                  <td colSpan={3}>
                    {order.village}, Upazila: {order.upazila}, District: {order.district}, Division: {order.division}
                  </td>
                </tr>
                <tr>
                  <td className="doc-label">Rooftop / Site Type:</td>
                  <td>{config.configuration?.rooftopType?.toUpperCase() || 'CONCRETE'}</td>
                  <td className="doc-label">Rooftop Area Available:</td>
                  <td>{sizing.availableRoofAreaSqFt || config.configuration?.rooftopAreaSqFt || 'N/A'} sq ft</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Technical System Sizing */}
          <div className="doc-section">
            <h3 className="doc-section-title">2. Engineering System Sizing & Energy Assumptions</h3>
            <table className="doc-table">
              <tbody>
                <tr>
                  <td className="doc-label">System Type:</td>
                  <td><strong>{config.configuration?.system?.toUpperCase() || 'ON-GRID'}</strong></td>
                  <td className="doc-label">Total Installed Capacity:</td>
                  <td><strong>{sizing.totalSystemCapacityKwp || sizing.solarCapacityKwp} kWp</strong></td>
                </tr>
                <tr>
                  <td className="doc-label">PV Panel Assembly:</td>
                  <td>{sizing.panelCount} × {sizing.panelWattage || 550}W Monocrystalline Modules</td>
                  <td className="doc-label">Required Rooftop Area:</td>
                  <td>{sizing.requiredRoofAreaSqFt} sq ft (Area Sufficient: {sizing.roofAreaSufficient ? 'YES' : 'SITE SURVEY REQUIRED'})</td>
                </tr>
                <tr>
                  <td className="doc-label">Power Inverter:</td>
                  <td>{sizing.inverterCapacityKw} kW Grid-Synchronized / Dual MPPT</td>
                  <td className="doc-label">Storage Capacity:</td>
                  <td>{sizing.batteryCapacityKwh ? `${sizing.batteryCapacityKwh} kWh (${sizing.batteryCount} Units)` : 'Direct Grid-Tied (No Battery)'}</td>
                </tr>
                <tr>
                  <td className="doc-label">Expected Daily Generation:</td>
                  <td>{estimate.generationEstimates?.dailyKwh} kWh/day</td>
                  <td className="doc-label">Expected Monthly Generation:</td>
                  <td>{estimate.generationEstimates?.monthlyKwh} kWh/month</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Electrical Load Schedule */}
          {loads.length > 0 && (
            <div className="doc-section">
              <h3 className="doc-section-title">3. Connected Electrical Load Schedule</h3>
              <table className="doc-table-bordered">
                <thead>
                  <tr>
                    <th>Appliance</th>
                    <th>Category</th>
                    <th>Rated Power (W)</th>
                    <th>Surge (W)</th>
                    <th>Qty</th>
                    <th>Daily Hours</th>
                    <th>Daily Consumption (kWh)</th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map((load: any, i: number) => (
                    <tr key={i}>
                      <td>{load.name}</td>
                      <td>{load.category}</td>
                      <td>{load.ratedPowerW} W</td>
                      <td>{load.surgePowerW} W</td>
                      <td>{load.quantity}</td>
                      <td>{load.dailyHours} hrs</td>
                      <td>{load.dailyKwh} kWh</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#f7fafc', fontWeight: 'bold' }}>
                    <td colSpan={4}>Total Connected Demand</td>
                    <td colSpan={2}>{estimate.loadSummary?.totalConnectedLoadW} W ({estimate.loadSummary?.peakDemandKw} kW peak)</td>
                    <td>{estimate.loadSummary?.totalDailyConsumptionKwh} kWh/day</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {/* Dynamic Bill of Materials (BOM) */}
          <div className="doc-section">
            <h3 className="doc-section-title">4. Certified Bill of Materials (BOM) & Equipment Specifications</h3>
            <table className="doc-table-bordered">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Component</th>
                  <th>Manufacturer / Brand</th>
                  <th>Model / Specification</th>
                  <th>Qty</th>
                  <th>Unit Price (BDT)</th>
                  <th>Total Price (BDT)</th>
                </tr>
              </thead>
              <tbody>
                {bom.map((item: any, i: number) => (
                  <tr key={i}>
                    <td>{item.itemNo || i + 1}</td>
                    <td><strong>{item.component}</strong></td>
                    <td>{item.manufacturer}</td>
                    <td>{item.specification || item.model}</td>
                    <td>{item.quantity}</td>
                    <td>{Number(item.unitPrice).toLocaleString()}</td>
                    <td><strong>{Number(item.totalPrice).toLocaleString()}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* System Architecture Design */}
          <div className="doc-section">
            <h3 className="doc-section-title">5. Electrical System Architecture & Protection Overview</h3>
            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '6px', fontSize: '13px', lineHeight: '1.6' }}>
              <div><strong>System Topology:</strong> {systemDesign.architectureType || 'Standard Renewable Layout'}</div>
              <div><strong>PV String Arrangement:</strong> {systemDesign.pvArrayStrings || 'Configured in series-parallel arrays'}</div>
              <div><strong>DC Operating Bus:</strong> {systemDesign.operatingDcVoltage || 'Nominal 400V DC operating window'}</div>
              <div><strong>Inverter Integration:</strong> {systemDesign.inverterArrangement || 'Dual MPPT with automatic anti-islanding'}</div>
              <div><strong>Energy Storage Coupling:</strong> {systemDesign.storageArrangement || 'Lithium BMS RS485 communication'}</div>
              <div><strong>Earthing & Lightning Protection:</strong> {systemDesign.earthingAndGrounding || 'Dedicated earthing electrode (<5 Ohms)'}</div>
              <div><strong>Utility Standard:</strong> {systemDesign.gridConnectionStandard || 'Compliant with Bangladesh Net Metering Guidelines 2018'}</div>
            </div>
          </div>

          {/* Pricing & Commercial Terms */}
          <div className="doc-section">
            <h3 className="doc-section-title">6. Commercial Quotation & Financial Summary</h3>
            <table className="doc-table">
              <tbody>
                <tr>
                  <td className="doc-label">Equipment Subtotal:</td>
                  <td>BDT {pricing.subtotal?.toLocaleString() || 'N/A'}</td>
                  <td className="doc-label">Installation & Commissioning:</td>
                  <td>BDT {pricing.installation?.total?.toLocaleString() || 'N/A'}</td>
                </tr>
                <tr>
                  <td className="doc-label">Logistics, Delivery & Setup:</td>
                  <td>BDT {((pricing.delivery || 0) + (pricing.setup || 0) + (pricing.documentation || 0)).toLocaleString()}</td>
                  <td className="doc-label">Promotional Discount:</td>
                  <td style={{ color: '#38a169' }}>- BDT {pricing.discounts?.toLocaleString() || 0}</td>
                </tr>
                <tr>
                  <td className="doc-label">Applicable VAT / Tax ({pricing.taxPercent || 5}%):</td>
                  <td>BDT {pricing.taxes?.toLocaleString() || 0}</td>
                  <td className="doc-label" style={{ fontSize: '16px', color: '#2b6cb0' }}>Final Project Total:</td>
                  <td style={{ fontSize: '18px', fontWeight: 'bold', color: '#2b6cb0' }}>
                    BDT {Number(order.totalAmount || pricing.finalTotal).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="doc-label">Payment Method Selected:</td>
                  <td><strong>{order.paymentMethod?.toUpperCase()}</strong></td>
                  <td className="doc-label">Current Payment Status:</td>
                  <td><strong style={{ color: order.paymentStatus === 'verified' ? '#38a169' : '#d69e2e' }}>{order.paymentStatus?.toUpperCase()}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Standard Installation Procedure & Safety Guidelines */}
          <div className="doc-section">
            <h3 className="doc-section-title">7. Safety Standards, Installation Procedure & Warranty Notes</h3>
            <ol style={{ fontSize: '12px', color: '#4a5568', paddingLeft: '20px', lineHeight: '1.6' }}>
              <li><strong>Structural Anchor:</strong> Rail clamp fasteners are torqued to 12 Nm and pull-tested for 140 km/h wind gusts.</li>
              <li><strong>DC Isolation:</strong> Lockable DC rotary disconnect switch installed within line of sight of inverter.</li>
              <li><strong>Ground Resistance:</strong> Grounding pit earth resistance certified under 5.0 Ohms prior to energization.</li>
              <li><strong>Anti-Islanding Protection:</strong> Automatic grid disconnection under 0.1 seconds upon utility outage.</li>
              <li><strong>Maintenance:</strong> Clean solar panel glass monthly with clean water; annual electrical torque and thermography inspection included.</li>
            </ol>
            <div style={{ marginTop: '12px', fontSize: '12px', fontStyle: 'italic', color: '#718096' }}>
              <strong>Notice:</strong> This preliminary engineering report is subject to physical rooftop azimuth, shadow trajectory, and structural load verification by a SolarAgent Pro certified field technician.
            </div>
          </div>

          {/* Signatures */}
          <div className="doc-signatures">
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #718096', height: '40px' }}></div>
              <small>Customer Signature & Date</small>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ borderBottom: '1px solid #718096', height: '40px' }}>
                <span style={{ fontFamily: 'monospace', color: '#2b6cb0' }}>Engr. SolarAgent Pro</span>
              </div>
              <small>Certified Renewable Energy Engineer</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
