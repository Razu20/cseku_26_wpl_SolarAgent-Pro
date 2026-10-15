import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateLoad, calculateSolarDesign } from './engineering';

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

    assert.equal(result.result.recommendedBatteryKwh, 4.5);
    assert.equal(result.formulaVersion, '1.4.0');
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

    assert.ok(result.result.pvKwp > 0);
    assert.ok(result.result.modules > 0);
    assert.match(result.traceId, /^ENG-/);
  });
});

