import { describe, expect, it } from 'vitest';
import { calculateLoad, calculateSolarDesign } from './engineering.js';

describe('deterministic engineering calculations', () => {
  it('calculates load and battery sizing deterministically', () => {
    const result = calculateLoad({
      monthlyBill: 15000,
      peakSunHours: 5,
      roofAreaM2: 60,
      systemLoss: 0.2,
      dailyConsumptionKwh: 18,
      peakLoadKw: 4,
      backupHours: 6,
    });

    expect(result.result.recommendedBatteryKwh).toBe(4.5);
    expect(result.formulaVersion).toBe('1.4.0');
  });

  it('calculates solar design deterministically', () => {
    const result = calculateSolarDesign({
      monthlyBill: 15000,
      peakSunHours: 5,
      roofAreaM2: 60,
      systemLoss: 0.2,
      dailyConsumptionKwh: 18,
      peakLoadKw: 4,
      backupHours: 6,
    });

    expect(result.result.pvKwp).toBeGreaterThan(0);
    expect(result.result.modules).toBeGreaterThan(0);
    expect(result.traceId).toMatch(/^ENG-/);
  });
});
