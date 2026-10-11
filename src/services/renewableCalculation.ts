import { asc, eq } from 'drizzle-orm';
import { db } from '../db/client';
import { adminSettings, appliances, productCatalog } from '../db/schema';
import { getDistrictData } from '../data/bangladeshLocations';

export interface ApplianceInput {
  applianceId: string;
  name?: string;
  category?: string;
  ratedPowerW?: number;
  surgePowerW?: number;
  quantity: number;
  dailyHours: number;
}

export interface CalculationInput {
  type: 'solar' | 'wind' | 'hybrid';
  location: {
    division: string;
    district: string;
    upazila: string;
    village: string;
  };
  configuration: {
    system: 'on-grid' | 'off-grid' | 'hybrid-grid';
    locationType?: 'urban' | 'rural' | 'city';
    rooftopType?: 'concrete' | 'metal' | 'tile' | 'other';
    rooftopAreaSqFt?: number;
    towerHeightM?: number;
    terrainType?: 'open_coastal' | 'plain' | 'suburban' | 'obstructed';
  };
  appliances: ApplianceInput[];
  selectedPanelId?: string;
  selectedInverterId?: string;
  selectedBatteryId?: string;
  selectedTurbineId?: string;
}

export async function calculateRenewableProject(input: CalculationInput) {
  // 1. Load Admin Settings (Pricing & Engineering)
  const settingsRows = await db.select().from(adminSettings);
  const pricingSettings = (settingsRows.find((s) => s.key === 'pricing_settings')?.data as any) || {
    baseInstallationRatePerKwp: 6000,
    deliveryBaseCost: 3500,
    setupAndEngineeringFee: 5000,
    documentationAndNemFee: 4000,
    vatTaxPercent: 5.0,
    defaultPromotionalDiscountPercent: 2.0,
  };

  const systemSettings = (settingsRows.find((s) => s.key === 'system_settings')?.data as any) || {
    defaultPeakSunHours: 4.2,
    systemPerformanceRatio: 0.80,
    defaultElectricityTariffBdtKwh: 8.50,
    batteryAutonomyDaysDefault: 1.5,
  };

  // 2. Location & Climate Benchmark
  const districtData = getDistrictData(input.location.district);
  const peakSunHours = districtData?.avgPeakSunHours ?? systemSettings.defaultPeakSunHours ?? 4.2;
  const avgWindSpeedKmh = districtData?.avgWindSpeedKmh ?? 11.5;
  const performanceRatio = systemSettings.systemPerformanceRatio ?? 0.80;
  const tariffBdt = systemSettings.defaultElectricityTariffBdtKwh ?? 8.50;

  // 3. Load Calculations
  const activeAppliances = await db.select().from(appliances).where(eq(appliances.active, true));
  const applianceMap = new Map(activeAppliances.map((a) => [a.id, a]));

  const itemizedLoads = input.appliances.map((selection) => {
    const catalogItem = applianceMap.get(selection.applianceId);
    const name = selection.name || catalogItem?.name || 'Custom Appliance';
    const category = selection.category || catalogItem?.category || 'General';
    const ratedPowerW = selection.ratedPowerW || catalogItem?.ratedPowerW || 50;
    const surgePowerW = selection.surgePowerW || catalogItem?.surgePowerW || ratedPowerW;
    const dailyKwh = (ratedPowerW * selection.quantity * selection.dailyHours) / 1000;

    return {
      applianceId: selection.applianceId,
      name,
      category,
      ratedPowerW,
      surgePowerW,
      quantity: selection.quantity,
      dailyHours: selection.dailyHours,
      totalConnectedW: ratedPowerW * selection.quantity,
      totalSurgeW: surgePowerW * selection.quantity,
      dailyKwh: Number(dailyKwh.toFixed(3)),
    };
  });

  const totalConnectedLoadW = itemizedLoads.reduce((sum, item) => sum + item.totalConnectedW, 0);
  const totalDailyConsumptionKwh = Number(itemizedLoads.reduce((sum, item) => sum + item.dailyKwh, 0).toFixed(2));
  const peakDemandKw = Number((totalConnectedLoadW * 0.75 / 1000).toFixed(2));
  const maxSimultaneousSurgeW = Math.max(...itemizedLoads.map((i) => i.totalSurgeW), totalConnectedLoadW * 1.3);

  // 4. Products Catalog Lookup
  const catalog = await db.select().from(productCatalog).where(eq(productCatalog.status, 'approved')).orderBy(asc(productCatalog.name));
  const isMatch = (cat: string | null | undefined, target: string) => {
    const c = (cat || '').toLowerCase();
    const t = target.toLowerCase();
    return c === t || c.includes(t) || t.includes(c);
  };
  const allModules = catalog.filter((p) => isMatch(p.category, 'module') || isMatch(p.category, 'panel') || isMatch(p.category, 'solar'));
  const allInverters = catalog.filter((p) => isMatch(p.category, 'inverter'));
  const allBatteries = catalog.filter((p) => isMatch(p.category, 'battery'));
  const allTurbines = catalog.filter((p) => isMatch(p.category, 'turbine') || isMatch(p.category, 'wind'));
  const allMountings = catalog.filter((p) => isMatch(p.category, 'mounting') || isMatch(p.category, 'structure'));
  const allElectrical = catalog.filter((p) => isMatch(p.category, 'electrical') || isMatch(p.category, 'controller') || isMatch(p.category, 'accessories'));

  // 5. Sizing based on Project Type
  let solarCapacityKwp = 0;
  let panelCount = 0;
  let selectedPanel: any = null;
  let selectedInverter: any = null;
  let selectedBattery: any = null;
  let batteryCount = 0;
  let selectedTurbine: any = null;
  let turbineCount = 0;
  let requiredRoofAreaSqFt = 0;

  // Selected or recommended Panel
  if (input.selectedPanelId) {
    selectedPanel = allModules.find((p) => p.id === input.selectedPanelId) || allModules[0];
  } else {
    selectedPanel = allModules.find((p) => p.status === 'preferred') || allModules[0];
  }
  const panelWattage = selectedPanel?.wattage || Number(selectedPanel?.name?.match(/(\d+)W/i)?.[1] || 550);

  // Solar Sizing
  if (input.type === 'solar' || input.type === 'hybrid') {
    const targetDailyKwh = input.type === 'hybrid' ? totalDailyConsumptionKwh * 0.65 : totalDailyConsumptionKwh;
    // Engineering formula: Capacity = Daily kWh / (PeakSunHours * PerformanceRatio) * DesignMargin (1.15)
    const rawSolarKw = (Math.max(1.0, targetDailyKwh) / (peakSunHours * performanceRatio)) * 1.15;
    solarCapacityKwp = Number((Math.ceil(rawSolarKw * 10) / 10).toFixed(2));
    panelCount = Math.ceil((solarCapacityKwp * 1000) / panelWattage);
    // Rooftop area: ~23 sq ft per 550W panel + 15% clearance/walkway
    requiredRoofAreaSqFt = Math.ceil(panelCount * 24.5);
  }

  // Wind Sizing
  if (input.type === 'wind' || input.type === 'hybrid') {
    const targetDailyKwh = input.type === 'hybrid' ? totalDailyConsumptionKwh * 0.35 : totalDailyConsumptionKwh;
    // Turbine matching
    if (input.selectedTurbineId) {
      selectedTurbine = allTurbines.find((t) => t.id === input.selectedTurbineId) || allTurbines[0];
    } else {
      selectedTurbine = allTurbines.find((t) => t.status === 'preferred') || allTurbines[0];
    }
    const turbineWattage = selectedTurbine?.wattage || 1000;
    // Wind Capacity Factor approximation based on BD regional wind speed: CF ~ 0.18 to 0.25
    const windCf = Math.min(0.28, Math.max(0.14, (avgWindSpeedKmh / 50)));
    const dailyKwhPerTurbine = (turbineWattage * 24 * windCf) / 1000;
    turbineCount = Math.max(1, Math.ceil(targetDailyKwh / Math.max(0.5, dailyKwhPerTurbine)));
  }

  // Inverter Selection based on system type & total kW
  const targetInverterKw = Math.max(solarCapacityKwp, peakDemandKw * 1.25);
  if (input.selectedInverterId) {
    selectedInverter = allInverters.find((i) => i.id === input.selectedInverterId) || allInverters[0];
  } else {
    if (input.configuration.system === 'hybrid-grid' || input.type === 'hybrid') {
      selectedInverter = allInverters.find((i) => i.sku.includes('DEYE') || i.name.toLowerCase().includes('hybrid')) || allInverters[0];
    } else if (input.configuration.system === 'off-grid') {
      selectedInverter = allInverters.find((i) => i.name.toLowerCase().includes('off-grid')) || allInverters[0];
    } else {
      selectedInverter = allInverters.find((i) => i.name.toLowerCase().includes('on-grid')) || allInverters[0];
    }
  }

  // Battery Selection
  const systemConfig = input.configuration.system;
  let requiredBatteryKwh = 0;

  if (systemConfig === 'off-grid') {
    // 1.5 days autonomy, 80% DOD
    requiredBatteryKwh = Number(((totalDailyConsumptionKwh * 1.5) / 0.85).toFixed(2));
  } else if (systemConfig === 'hybrid-grid') {
    // Essential load backup for 4 hours outage
    requiredBatteryKwh = Number(Math.max(3.5, (peakDemandKw * 4 * 0.6)).toFixed(2));
  }

  if (requiredBatteryKwh > 0) {
    if (input.selectedBatteryId) {
      selectedBattery = allBatteries.find((b) => b.id === input.selectedBatteryId) || allBatteries[0];
    } else {
      selectedBattery = allBatteries.find((b) => b.status === 'preferred') || allBatteries[0];
    }
    const batteryCapacityKwh = selectedBattery?.wattage ? selectedBattery.wattage / 1000 : 3.5;
    batteryCount = Math.max(1, Math.ceil(requiredBatteryKwh / batteryCapacityKwh));
  }

  // 6. Suitability / Location Matching Score Algorithm (0 to 100%)
  // Factor 1: Rooftop Area Availability (35 points max)
  const availableArea = input.configuration.rooftopAreaSqFt || (requiredRoofAreaSqFt * 1.2);
  const areaRatio = requiredRoofAreaSqFt > 0 ? availableArea / requiredRoofAreaSqFt : 1;
  const areaScore = Math.min(35, Math.round(Math.min(1.0, areaRatio) * 35));

  // Factor 2: Rooftop Construction Type (25 points max)
  let rooftopScore = 20;
  const roofType = input.configuration.rooftopType || 'concrete';
  if (roofType === 'concrete') rooftopScore = 25;
  else if (roofType === 'metal') rooftopScore = 23;
  else if (roofType === 'tile') rooftopScore = 18;
  else rooftopScore = 14;

  // Factor 3: Renewable Resource Potential (25 points max)
  let resourceScore = 20;
  if (input.type === 'solar') {
    resourceScore = Math.min(25, Math.round((peakSunHours / 4.7) * 25));
  } else if (input.type === 'wind') {
    resourceScore = Math.min(25, Math.round((avgWindSpeedKmh / 18) * 25));
  } else {
    resourceScore = Math.min(25, Math.round(((peakSunHours / 4.7) * 15) + ((avgWindSpeedKmh / 18) * 10)));
  }

  // Factor 4: Location Type & Site Accessibility (15 points max)
  let locationScore = 13;
  const locType = input.configuration.locationType || 'urban';
  if (locType === 'rural') locationScore = 15;
  else if (locType === 'urban') locationScore = 14;
  else if (locType === 'city') locationScore = 12;

  const suitabilityPercent = Math.min(99, Math.max(40, areaScore + rooftopScore + resourceScore + locationScore));

  const suitabilityBreakdown = {
    totalPercent: suitabilityPercent,
    areaFactor: { score: areaScore, max: 35, description: `Available area (${availableArea} sq ft) vs required (${requiredRoofAreaSqFt} sq ft)` },
    structureFactor: { score: rooftopScore, max: 25, description: `${roofType.toUpperCase()} rooftop structural suitability` },
    resourceFactor: { score: resourceScore, max: 25, description: `Regional resource benchmark (${input.type === 'solar' ? `${peakSunHours} PSH/day` : `${avgWindSpeedKmh} km/h wind`})` },
    locationFactor: { score: locationScore, max: 15, description: `${locType.toUpperCase()} exposure and shading index` },
  };

  // 7. Generation Estimates
  const dailySolarKwh = Number((solarCapacityKwp * peakSunHours * performanceRatio).toFixed(2));
  const dailyWindKwh = selectedTurbine
    ? Number((turbineCount * (selectedTurbine.wattage / 1000) * 24 * (Math.min(0.28, Math.max(0.14, avgWindSpeedKmh / 50)))).toFixed(2))
    : 0;

  const totalDailyGenerationKwh = Number((dailySolarKwh + dailyWindKwh).toFixed(2));
  const totalMonthlyGenerationKwh = Number((totalDailyGenerationKwh * 30).toFixed(2));
  const totalAnnualGenerationKwh = Number((totalDailyGenerationKwh * 365).toFixed(2));

  // Savings Estimates
  const dailySavingsBdt = Number((totalDailyGenerationKwh * tariffBdt).toFixed(2));
  const monthlySavingsBdt = Number((totalMonthlyGenerationKwh * tariffBdt).toFixed(2));
  const annualSavingsBdt = Number((totalAnnualGenerationKwh * tariffBdt).toFixed(2));

  // 8. Cost & Pricing Calculation
  const panelPriceEach = selectedPanel ? Number(selectedPanel.regularPrice) : 18500;
  const panelsTotal = panelCount * panelPriceEach;

  const inverterPriceEach = selectedInverter ? Number(selectedInverter.regularPrice) : 115000;
  const inverterTotal = inverterPriceEach;

  const batteryPriceEach = selectedBattery ? Number(selectedBattery.regularPrice) : 0;
  const batteryTotal = batteryCount * batteryPriceEach;

  const turbinePriceEach = selectedTurbine ? Number(selectedTurbine.regularPrice) : 0;
  const turbineTotal = turbineCount * turbinePriceEach;

  // Mounting structure per panel
  const mountingItem = allMountings[0];
  const mountingPriceEach = mountingItem ? Number(mountingItem.regularPrice) : 1500;
  const mountingTotal = panelCount * mountingPriceEach + (turbineCount > 0 ? turbineCount * 12000 : 0);

  // Electrical BOS (Distribution, SPD, Breakers, Cables)
  const dcBoxItem = allElectrical.find((e) => e.sku.includes('DC-BOX')) || allElectrical[0];
  const cableItem = allElectrical.find((e) => e.sku.includes('CABLE')) || allElectrical[1];
  const electricalTotal = (dcBoxItem ? Number(dcBoxItem.regularPrice) : 12500) + (cableItem ? Number(cableItem.regularPrice) : 9500);

  // Installation rate based on capacity
  const totalCapacityKwp = Number((solarCapacityKwp + (turbineCount * (selectedTurbine?.wattage || 1000) / 1000)).toFixed(2));
  const installationTotal = Math.max(
    15000,
    Math.round(totalCapacityKwp * Number(pricingSettings.baseInstallationRatePerKwp || 6000))
  );

  const setupFee = Number(pricingSettings.setupAndEngineeringFee || 5000);
  const deliveryFee = Number(pricingSettings.deliveryBaseCost || 3500);
  const documentationFee = Number(pricingSettings.documentationAndNemFee || 4000);

  const subtotalBeforeTaxes = panelsTotal + inverterTotal + batteryTotal + turbineTotal + mountingTotal + electricalTotal + installationTotal + setupFee + deliveryFee + documentationFee;
  const discountPercent = Number(pricingSettings.defaultPromotionalDiscountPercent || 0);
  const discountAmount = Math.round((subtotalBeforeTaxes * discountPercent) / 100);

  const subtotalAfterDiscount = subtotalBeforeTaxes - discountAmount;
  const vatTaxPercent = Number(pricingSettings.vatTaxPercent || 5.0);
  const taxAmount = Math.round((subtotalAfterDiscount * vatTaxPercent) / 100);

  const finalTotal = subtotalAfterDiscount + taxAmount;
  const paybackPeriodYears = annualSavingsBdt > 0 ? Number((finalTotal / annualSavingsBdt).toFixed(1)) : 5.5;

  const pricingBreakdown = {
    solarPanels: { count: panelCount, unitPrice: panelPriceEach, total: panelsTotal, name: selectedPanel?.name },
    inverter: { count: 1, unitPrice: inverterPriceEach, total: inverterTotal, name: selectedInverter?.name },
    battery: batteryCount > 0 ? { count: batteryCount, unitPrice: batteryPriceEach, total: batteryTotal, name: selectedBattery?.name } : null,
    windTurbine: turbineCount > 0 ? { count: turbineCount, unitPrice: turbinePriceEach, total: turbineTotal, name: selectedTurbine?.name } : null,
    mountingStructure: { total: mountingTotal, description: `${panelCount} panel mounting rail and clamp assemblies` },
    electricalComponents: {
      total: electricalTotal,
      description: 'DC/AC surge protection combiner box, disconnects, and TÜV solar cables',
      label: pricingSettings.componentCostLabel || 'Balance of System (BOS), SPD & Safety Disconnects',
    },
    installation: {
      total: installationTotal,
      ratePerKwp: pricingSettings.baseInstallationRatePerKwp,
      label: pricingSettings.installationPriceLabel || 'Turnkey Installation & Engineering Commissioning',
    },
    setup: {
      total: setupFee,
      label: pricingSettings.setupCostLabel || 'System Architecture Design & Grid Net-Metering Setup',
    },
    delivery: {
      total: deliveryFee,
      label: pricingSettings.deliveryCostLabel || 'Regional Logistics & Secure Site Transport',
    },
    documentation: {
      total: documentationFee,
      label: pricingSettings.documentationLabel || 'Engineering Drawing & SREDA Net-Metering Documentation',
      terms: pricingSettings.documentationTerms || 'Turnkey solar installation governed by BPDB / SREDA Net Energy Metering guidelines.',
    },
    subtotal: subtotalBeforeTaxes,
    discounts: discountAmount,
    taxes: taxAmount,
    taxPercent: vatTaxPercent,
    finalTotal,
    currency: 'BDT',
  };

  // 9. Bill of Materials (BOM) & System Design Generation
  const bom = [
    ...(panelCount > 0 && selectedPanel
      ? [{
          itemNo: 1,
          component: 'Solar Photovoltaic Modules',
          manufacturer: selectedPanel.brand || 'Longi Solar',
          model: selectedPanel.model || selectedPanel.name,
          specification: `${panelWattage}W Mono PERC High Efficiency (${selectedPanel.dimensions || '2278×1134×35mm'})`,
          quantity: panelCount,
          unitPrice: panelPriceEach,
          totalPrice: panelsTotal,
        }]
      : []),
    ...(selectedInverter
      ? [{
          itemNo: 2,
          component: 'Power Conversion Inverter',
          manufacturer: selectedInverter.brand || 'Growatt / Huawei',
          model: selectedInverter.model || selectedInverter.name,
          specification: `${selectedInverter.wattage / 1000}kW ${input.configuration.system.toUpperCase()} Grid-Synchronized / MPPT`,
          quantity: 1,
          unitPrice: inverterPriceEach,
          totalPrice: inverterTotal,
        }]
      : []),
    ...(batteryCount > 0 && selectedBattery
      ? [{
          itemNo: 3,
          component: 'Energy Storage System',
          manufacturer: selectedBattery.brand || 'Pylontech',
          model: selectedBattery.model || selectedBattery.name,
          specification: `${(selectedBattery.wattage / 1000).toFixed(1)}kWh Module (${selectedBattery.warranty || 'Deep Cycle'})`,
          quantity: batteryCount,
          unitPrice: batteryPriceEach,
          totalPrice: batteryTotal,
        }]
      : []),
    ...(turbineCount > 0 && selectedTurbine
      ? [{
          itemNo: 4,
          component: 'Aerodynamic Wind Turbine',
          manufacturer: selectedTurbine.brand || 'Air-X',
          model: selectedTurbine.model || selectedTurbine.name,
          specification: `${selectedTurbine.wattage}W Rated Capacity with Furling Storm Protection`,
          quantity: turbineCount,
          unitPrice: turbinePriceEach,
          totalPrice: turbineTotal,
        }]
      : []),
    {
      itemNo: 5,
      component: 'Mounting & Structural Rails',
      manufacturer: 'AluMount Pro Bangladesh',
      model: 'AL6005-T5 Anodized Rooftop / Mast Structure',
      specification: `Engineered for wind velocity up to 140 km/h on ${roofType.toUpperCase()} substrate`,
      quantity: panelCount || 1,
      unitPrice: mountingPriceEach,
      totalPrice: mountingTotal,
    },
    {
      itemNo: 6,
      component: 'Balance of System & Protection',
      manufacturer: 'Suntree / Schneider / BRB',
      model: 'DC-SPD-1000V & 4mm² Solar PV Cables',
      specification: 'IP65 DC combiner box, 1000V Surge Arrester, DC isolator switch, copper earthing electrode',
      quantity: 1,
      unitPrice: electricalTotal,
      totalPrice: electricalTotal,
    },
    {
      itemNo: 7,
      component: 'Professional Engineering & Installation',
      manufacturer: 'SolarAgent Pro Certified Engineering Service',
      model: 'Turnkey Installation, Testing & Commissioning',
      specification: 'Complete array mounting, wiring, anti-islanding test, and Net Metering (NEM) synchronization',
      quantity: 1,
      unitPrice: installationTotal + setupFee,
      totalPrice: installationTotal + setupFee,
    },
  ];

  const systemDesign = {
    architectureType: `${input.type.toUpperCase()} — ${systemConfig.toUpperCase()}`,
    pvArrayStrings: panelCount > 0 ? `${Math.ceil(panelCount / 10)} strings in series (${Math.round(panelCount / Math.ceil(panelCount / 10))} panels/string)` : 'N/A',
    operatingDcVoltage: panelCount > 0 ? `${Math.round((panelCount / Math.max(1, Math.ceil(panelCount / 10))) * 42)} V DC (Within MPPT range 120V-480V)` : 'N/A',
    inverterArrangement: `Single ${selectedInverter?.name || 'Inverter'} with integrated dual MPPT controllers`,
    storageArrangement: batteryCount > 0 ? `${batteryCount} × 48V battery bank in parallel with CAN/RS485 BMS communication` : 'Direct grid-tied without storage',
    earthingAndGrounding: 'Combined array frame, rail, and SPD surge earthing connected to dedicated copper electrode (<5 Ohms)',
    gridConnectionStandard: 'Bidirectional utility meter with automatic anti-islanding disconnect adhering to Bangladesh Net Metering Guidelines 2018',
  };

  return {
    type: input.type,
    location: input.location,
    configuration: input.configuration,
    loads: itemizedLoads,
    loadSummary: {
      totalConnectedLoadW,
      totalDailyConsumptionKwh,
      peakDemandKw,
      maxSimultaneousSurgeW,
    },
    systemSizing: {
      solarCapacityKwp,
      panelCount,
      panelWattage,
      requiredRoofAreaSqFt,
      availableRoofAreaSqFt: availableArea,
      roofAreaSufficient: availableArea >= requiredRoofAreaSqFt,
      inverterCapacityKw: targetInverterKw,
      batteryCapacityKwh: requiredBatteryKwh,
      batteryCount,
      windTurbineCount: turbineCount,
      windCapacityKw: turbineCount * ((selectedTurbine?.wattage || 1000) / 1000),
      totalSystemCapacityKwp: totalCapacityKwp,
    },
    selectedProducts: {
      panel: selectedPanel ? { id: selectedPanel.id, name: selectedPanel.name, brand: selectedPanel.brand, model: selectedPanel.model, wattage: panelWattage, price: panelPriceEach, warranty: selectedPanel.warranty, efficiency: selectedPanel.efficiency } : null,
      inverter: selectedInverter ? { id: selectedInverter.id, name: selectedInverter.name, brand: selectedInverter.brand, wattage: selectedInverter.wattage, price: inverterPriceEach, warranty: selectedInverter.warranty } : null,
      battery: selectedBattery ? { id: selectedBattery.id, name: selectedBattery.name, brand: selectedBattery.brand, price: batteryPriceEach, warranty: selectedBattery.warranty } : null,
      turbine: selectedTurbine ? { id: selectedTurbine.id, name: selectedTurbine.name, brand: selectedTurbine.brand, wattage: selectedTurbine.wattage, price: turbinePriceEach, warranty: selectedTurbine.warranty } : null,
    },
    suitability: suitabilityBreakdown,
    generationEstimates: {
      dailyKwh: totalDailyGenerationKwh,
      monthlyKwh: totalMonthlyGenerationKwh,
      annualKwh: totalAnnualGenerationKwh,
      solarDailyKwh: dailySolarKwh,
      windDailyKwh: dailyWindKwh,
      assumptions: [
        `${peakSunHours} peak-sun-hours/day regional benchmark (${districtData?.name || 'Bangladesh'})`,
        `${(performanceRatio * 100).toFixed(0)}% system performance ratio accounting for thermal, wiring, and inverter losses`,
        `15% design energy reserve margin`,
        `Utility tariff benchmark: BDT ${tariffBdt.toFixed(2)}/kWh`,
      ],
      disclaimer: 'Preliminary estimate — professional site assessment required. Actual generation depends on shading, tilt angle, orientation, and annual weather variations.',
    },
    financialEstimates: {
      dailySavingsBdt,
      monthlySavingsBdt,
      annualSavingsBdt,
      paybackPeriodYears,
      estimatedTenYearSavingsBdt: Math.round(annualSavingsBdt * 10 - finalTotal),
      disclaimer: 'Financial estimates assume constant electricity tariffs and do not account for future tariff escalation or degradation over time.',
    },
    pricing: pricingBreakdown,
    billOfMaterials: bom,
    systemDesign,
  };
}

