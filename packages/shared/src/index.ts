export type RequirementStatus =
  | 'unknown'
  | 'inferred'
  | 'user_provided'
  | 'evidence_extracted'
  | 'survey_verified'
  | 'engineer_verified'
  | 'rejected';

export type RequirementSource =
  | 'user'
  | 'bill_ocr'
  | 'photo_ai'
  | 'map'
  | 'survey'
  | 'sensor'
  | 'engineer'
  | 'admin';

export type PackageObjective = 'budget' | 'balanced' | 'performance' | 'backup' | 'hybrid' | 'expandable' | 'premium';

export type ProductStatus = 'preferred' | 'approved' | 'conditional' | 'blocked';

export interface LeadInput {
  name: string;
  phone: string;
  email?: string;
  source: string;
  location?: string;
}

export interface RecommendationCase {
  id: string;
  customerName: string;
  objective: PackageObjective;
  summary: string;
  facts: Array<{ key: string; value: string; status: RequirementStatus; source: RequirementSource; confidence: number }>; 
}

export interface EngineeringResult {
  traceId: string;
  engine: string;
  formulaVersion: string;
  inputsHash: string;
  result: Record<string, unknown>;
  warnings: string[];
  assumptions: string[];
}
