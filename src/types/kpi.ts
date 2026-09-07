export type KpiPeriodType = 'monthly' | 'quarterly' | 'semester' | 'academic_year' | 'yearly' | 'custom';
export type KpiPeriodStatus = 'draft' | 'active' | 'closed' | 'archived';

export interface KpiPeriod {
  id: string;
  code: string;
  name: string;
  period_type: KpiPeriodType;
  start_date: string;
  end_date: string;
  status: KpiPeriodStatus;
  organization_unit_id: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface KpiObjective {
  id: string;
  code: string;
  name: string;
  description: string | null;
  parent_objective_id: string | null;
  organization_unit_id: string | null;
  period_id: string | null;
  objective_level: number;
  status: string;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
  // For UI tree
  children?: KpiObjective[];
}

export type KpiMeasurementType = 'number' | 'percentage' | 'currency' | 'rating' | 'boolean' | 'milestone' | 'duration';
export type KpiDirection = 'higher_is_better' | 'lower_is_better' | 'target_range' | 'exact_target';

export interface KpiDefinition {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
  measurement_type: KpiMeasurementType;
  unit_code: string | null;
  direction: KpiDirection;
  default_scoring_method: string | null;
  owner_organization_unit_id: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export type KpiScopeType = 'individual' | 'organization';
export type KpiTemplateStatus = 'draft' | 'published' | 'retired';

export interface KpiTemplate {
  id: string;
  code: string;
  name: string;
  scope_type: KpiScopeType;
  owner_organization_unit_id: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  // Join fields
  latest_version?: number;
  latest_version_status?: KpiTemplateStatus;
}

export interface KpiTemplateVersion {
  id: string;
  template_id: string;
  version_no: number;
  status: KpiTemplateStatus;
  config: any;
  published_at: string | null;
  created_by: string | null;
  created_at?: string;
}

export interface KpiTemplateItem {
  id: string;
  template_version_id: string;
  kpi_definition_id: string;
  objective_id: string | null;
  weight: number;
  target_config: any;
  scoring_config: any;
  cap_percent: number | null;
  is_required: boolean;
  sort_order: number;
  config: any;
  created_at?: string;
  
  // Joins
  definition?: KpiDefinition;
  objective?: KpiObjective;
}
