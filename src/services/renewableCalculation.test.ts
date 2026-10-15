import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateRenewableProject } from './renewableCalculation';
const fixture = { settings: [], appliances: [], catalog: [
  { id: 'panel', name: '550W Panel', category: 'module', wattage: 550, regularPrice: '15000', status: 'preferred' },
  { id: 'inverter', name: '5kW Inverter', category: 'inverter', wattage: 5000, regularPrice: '65000', status: 'approved' },
  { id: 'battery', name: '5kWh Battery', category: 'battery', wattage: 5000, regularPrice: '90000', status: 'approved' },
  { id: 'turbine', name: '1kW Wind Turbine', category: 'turbine', wattage: 1000, regularPrice: '120000', status: 'approved' },
] } as any;


describe('Renewable Energy Sizing & Calculation Engine', () => {
  it('calculates preliminary solar system design correctly from appliance loads', async () => {
    const result = await calculateRenewableProject({
      type: 'solar',
      location: {
        division: 'Dhaka',
        district: 'Dhaka',
        upazila: 'Gulshan',
        village: 'Gulshan-2',
      },
      configuration: {
        system: 'on-grid',
        locationType: 'urban',
        rooftopType: 'concrete',
        rooftopAreaSqFt: 500,
      },
      appliances: [
        { applianceId: 'mock-1', name: 'LED Tube Light', ratedPowerW: 15, quantity: 10, dailyHours: 6 },
        { applianceId: 'mock-2', name: 'Ceiling Fan', ratedPowerW: 75, quantity: 4, dailyHours: 8 },
        { applianceId: 'mock-3', name: 'Refrigerator', ratedPowerW: 180, quantity: 1, dailyHours: 12 },
      ],
    }, fixture);

    assert.equal(result.type, 'solar');
    assert.equal(result.loadSummary.totalConnectedLoadW, 15 * 10 + 75 * 4 + 180);
    assert.ok(result.loadSummary.totalDailyConsumptionKwh > 0);
    assert.ok(result.systemSizing.solarCapacityKwp > 0);
    assert.ok(result.systemSizing.panelCount > 0);
    assert.ok(result.suitability.totalPercent >= 40);
    assert.ok(result.suitability.totalPercent <= 100);
    assert.ok(result.pricing.finalTotal > 0);
    assert.ok(result.billOfMaterials.length >= 4);
    assert.ok(result.systemDesign.architectureType.includes('SOLAR'));
  });

  it('calculates hybrid solar + wind system with dual generation sources', async () => {
    const result = await calculateRenewableProject({
      type: 'hybrid',
      location: {
        division: 'Chattogram',
        district: "Cox's Bazar",
        upazila: 'Kutubdia',
        village: 'Ali Akbar Deil',
      },
      configuration: {
        system: 'hybrid-grid',
        locationType: 'rural',
        rooftopType: 'concrete',
        rooftopAreaSqFt: 800,
      },
      appliances: [
        { applianceId: 'mock-ac', name: 'Inverter AC', ratedPowerW: 1450, quantity: 1, dailyHours: 6 },
        { applianceId: 'mock-light', name: 'LED Lights', ratedPowerW: 15, quantity: 8, dailyHours: 6 },
      ],
    }, fixture);

    assert.equal(result.type, 'hybrid');
    assert.ok(result.systemSizing.solarCapacityKwp > 0);
    assert.ok(result.systemSizing.windTurbineCount > 0);
    assert.ok(result.generationEstimates.solarDailyKwh > 0);
    assert.ok(result.generationEstimates.windDailyKwh > 0);
    assert.notEqual(result.pricing.battery, null);
    assert.notEqual(result.pricing.windTurbine, null);
  });
});

