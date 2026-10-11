export type EngineeringInput = {
  monthlyBill: number;
  peakSunHours: number;
  roofAreaM2: number;
  systemLoss: number;
  dailyConsumptionKwh: number;
  peakLoadKw: number;
  backupHours: number;
};

export function calculateSolarDesign(input: EngineeringInput) {
  const annualKwh = input.monthlyBill * 12 * 0.42;
  const systemKw = annualKwh / (365 * input.peakSunHours * (1 - input.systemLoss));
  return {
    traceId: `ENG-${Date.now()}`,
    formulaVersion: '1.4.0',
    inputsHash: 'sha256:solar-design',
    result: {
      annualEnergyKwh: Number(annualKwh.toFixed(2)),
      pvKwp: Number(systemKw.toFixed(2)),
      modules: Math.ceil((systemKw * 1000) / 550),
      expectedGeneration: Number((systemKw * input.peakSunHours * 30).toFixed(2)),
    },
    warnings: [],
    assumptions: ['Default solar irradiance and performance ratio assumptions applied.'],
  };
}

export function calculateLoad(input: EngineeringInput) {
  const recommendedBatteryKwh = (input.dailyConsumptionKwh * input.backupHours) / 24;
  return {
    traceId: `ENG-${Date.now()}`,
    formulaVersion: '1.4.0',
    inputsHash: 'sha256:load-design',
    result: {
      dailyConsumptionKwh: input.dailyConsumptionKwh,
      peakLoadKw: input.peakLoadKw,
      recommendedBatteryKwh,
    },
    warnings: [],
    assumptions: ['Battery sizing uses configured outage window.'],
  };
}

