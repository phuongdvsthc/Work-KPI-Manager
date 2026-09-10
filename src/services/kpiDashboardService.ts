import { getSupabaseClient } from './supabaseClient';
import { kpiService } from './kpi.service';
import {
  KpiPeriod,
  KpiDashboardFilters,
  KpiDashboardSummary,
  KpiDashboardUnitBreakdown,
  KpiDashboardAssignmentItem,
  KpiDashboardKpiBreakdown,
} from '../types/kpi';

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

/**
 * Normalize shared Dashboard filters into URLSearchParams.
 * Used consistently across getSummary, getUnitBreakdown, getAssignments, and getKpiBreakdown.
 */
export function normalizeDashboardFilters(filters: KpiDashboardFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.periodId) params.append('period_id', filters.periodId);
  if (filters.unitId) params.append('unit_id', filters.unitId);
  if (filters.parentUnitId) params.append('parent_unit_id', filters.parentUnitId);
  if (filters.assigneeType && filters.assigneeType !== 'all') params.append('assignee_type', filters.assigneeType);
  if (filters.assignmentStatus && filters.assignmentStatus !== 'all') params.append('assignment_status', filters.assignmentStatus);
  if (filters.resultMode) params.append('result_mode', filters.resultMode);
  if (filters.limit !== undefined) params.append('limit', String(filters.limit));
  if (filters.offset !== undefined) params.append('offset', String(filters.offset));
  if (filters.search && filters.search.trim()) params.append('search', filters.search.trim());
  return params;
}

/**
 * Centralized service for KPI Dashboard Read Model operations.
 * Architecture Rules:
 * - Locked Assignment: must use Official Snapshot.
 * - Non-locked Assignment: must use live Scoring Resolver.
 * - Do not mix live and official results.
 * - Do not calculate business values in frontend code.
 */
export const kpiDashboardService = {
  /**
   * Fetch KPI periods for dashboard initialization and filtering.
   */
  async getPeriods(): Promise<{ data: KpiPeriod[] | null; error: Error | null }> {
    return kpiService.getPeriods();
  },

  /**
   * Fetch aggregate summary metrics for KPI dashboard.
   * Calls the server read model endpoint which resolves live scores for active assignments
   * and reads frozen snapshots for locked assignments.
   */
  async getSummary(filters: KpiDashboardFilters): Promise<{ data: KpiDashboardSummary | null; error: Error | null }> {
    if (!filters?.periodId) {
      return { data: null, error: new Error('periodId is required for dashboard summary') };
    }

    try {
      const token = await getAuthToken();
      const params = normalizeDashboardFilters(filters);

      const res = await fetch(`/api/kpi/dashboard/summary?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed to fetch dashboard summary: status ${res.status}`);
      }

      const json = await res.json();
      return { data: json as KpiDashboardSummary, error: null };
    } catch (err: any) {
      console.error('[kpiDashboardService] getSummary error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch unit-level breakdown for the dashboard.
   * Method signature prepared for read model aggregation.
   */
  async getUnitBreakdown(filters: KpiDashboardFilters): Promise<{ data: KpiDashboardUnitBreakdown[] | null; error: Error | null }> {
    if (!filters?.periodId) {
      return { data: null, error: new Error('periodId is required for unit breakdown') };
    }

    try {
      const token = await getAuthToken();
      const params = normalizeDashboardFilters(filters);

      const res = await fetch(`/api/kpi/dashboard/unit-breakdown?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        // If aggregation endpoint is not yet wired in backend in A1, return empty breakdown
        if (res.status === 404) {
          return { data: [], error: null };
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed to fetch unit breakdown: status ${res.status}`);
      }

      const json = await res.json();
      return { data: json as KpiDashboardUnitBreakdown[], error: null };
    } catch (err: any) {
      console.error('[kpiDashboardService] getUnitBreakdown error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch assignments read model list for dashboard.
   * Each assignment has its score resolved according to its status:
   * - Locked: from official snapshot (frozen).
   * - Non-locked: from live scoring resolver.
   */
  async getAssignments(filters: KpiDashboardFilters): Promise<{ data: KpiDashboardAssignmentItem[] | null; totalCount?: number; error: Error | null }> {
    if (!filters?.periodId) {
      return { data: null, error: new Error('periodId is required for dashboard assignments') };
    }

    try {
      const token = await getAuthToken();
      const params = normalizeDashboardFilters(filters);

      const res = await fetch(`/api/kpi/dashboard/assignments?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed to fetch dashboard assignments: status ${res.status}`);
      }

      const json = await res.json();
      let items: KpiDashboardAssignmentItem[] = Array.isArray(json) ? json : (json.items || []);
      const totalCount = (json && typeof json.total_count === 'number') ? json.total_count : items.length;

      // Client fallback filter for resultMode if needed
      if (filters.resultMode === 'live') {
        items = items.filter(a => a.result_mode === 'live');
      } else if (filters.resultMode === 'official') {
        items = items.filter(a => a.result_mode === 'official');
      }

      if (filters.search && filters.search.trim()) {
        const s = filters.search.trim().toLowerCase();
        items = items.filter(a => 
          a.assignee_name.toLowerCase().includes(s) || 
          (a.unit_name && a.unit_name.toLowerCase().includes(s))
        );
      }

      return { data: items, totalCount, error: null };
    } catch (err: any) {
      console.error('[kpiDashboardService] getAssignments error:', err);
      return { data: null, error: err };
    }
  },

  /**
   * Fetch KPI definition breakdown for dashboard.
   * Method signature prepared for read model aggregation.
   */
  async getKpiBreakdown(filters: KpiDashboardFilters): Promise<{ data: KpiDashboardKpiBreakdown[] | null; error: Error | null }> {
    if (!filters?.periodId) {
      return { data: null, error: new Error('periodId is required for KPI breakdown') };
    }

    try {
      const token = await getAuthToken();
      const params = normalizeDashboardFilters(filters);

      const res = await fetch(`/api/kpi/dashboard/kpi-breakdown?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!res.ok) {
        if (res.status === 404) {
          return { data: [], error: null };
        }
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || errJson.error || `Failed to fetch KPI breakdown: status ${res.status}`);
      }

      const json = await res.json();
      return { data: json as KpiDashboardKpiBreakdown[], error: null };
    } catch (err: any) {
      console.error('[kpiDashboardService] getKpiBreakdown error:', err);
      return { data: null, error: err };
    }
  }
};
