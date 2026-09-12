/**
 * Typed Dashboard API Client (v0.7-B1)
 * Safely calls GET /api/dashboard/reporting with staff-safe filters and authentication.
 */

import { getSupabaseClient } from './supabaseClient';
import { UnifiedDashboardResponse } from './dashboardReportingService';

export interface StaffDashboardFilters {
  date_from?: string;
  date_to?: string;
  source_id?: string;
  metric_id?: string;
  kpi_id?: string;
  status?: string;
}

async function getAuthToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

export const dashboardApiClient = {
  async getStaffDashboard(filters: StaffDashboardFilters = {}): Promise<UnifiedDashboardResponse> {
    const token = await getAuthToken();
    const params = new URLSearchParams();

    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.source_id) params.append('source_id', filters.source_id);
    if (filters.metric_id) params.append('metric_id', filters.metric_id);
    if (filters.kpi_id) params.append('kpi_id', filters.kpi_id);
    if (filters.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `/api/dashboard/reporting${queryString ? `?${queryString}` : ''}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!res.ok) {
      let errorMessage = 'Không thể tải dữ liệu bảng điều khiển cá nhân.';
      try {
        const errJson = await res.json();
        if (errJson && errJson.error) {
          errorMessage = errJson.error;
        }
      } catch {
        // fallback
      }
      const err: any = new Error(errorMessage);
      err.status = res.status;
      throw err;
    }

    const data: UnifiedDashboardResponse = await res.json();
    return data;
  }
};
