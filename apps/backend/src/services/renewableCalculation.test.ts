import { describe, it, expect } from 'vitest';
import { calculateRenewableProject } from './renewableCalculation.js';

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
    });

    expect(result.type).toBe('solar');
    expect(result.loadSummary.totalConnectedLoadW).toBe(15 * 10 + 75 * 4 + 180);
    expect(result.loadSummary.totalDailyConsumptionKwh).toBeGreaterThan(0);
    expect(result.systemSizing.solarCapacityKwp).toBeGreaterThan(0);
    expect(result.systemSizing.panelCount).toBeGreaterThan(0);
    expect(result.suitability.totalPercent).toBeGreaterThanOrEqual(40);
    expect(result.suitability.totalPercent).toBeLessThanOrEqual(100);
    expect(result.pricing.finalTotal).toBeGreaterThan(0);
    expect(result.billOfMaterials.length).toBeGreaterThanOrEqual(4);
    expect(result.systemDesign.architectureType).toContain('SOLAR');
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
    });

    expect(result.type).toBe('hybrid');
    expect(result.systemSizing.solarCapacityKwp).toBeGreaterThan(0);
    expect(result.systemSizing.windTurbineCount).toBeGreaterThan(0);
    expect(result.generationEstimates.solarDailyKwh).toBeGreaterThan(0);
    expect(result.generationEstimates.windDailyKwh).toBeGreaterThan(0);
    expect(result.pricing.battery).not.toBeNull();
    expect(result.pricing.windTurbine).not.toBeNull();
  });
});
