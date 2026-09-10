/**
 * KPI Manager Dashboard View Shell (v0.4.6-B1)
 *
 * Provides page shell, route wiring, shared filter state,
 * and service integration foundation for the Manager KPI Dashboard.
 *
 * In accordance with B1 scope:
 * - Structural layout containers establish placeholders for B2-B5
 * - No detailed Summary Cards, Unit Breakdown tables, Assignment tables, or Charts rendered yet
 * - Centralized Dashboard data orchestration via kpiDashboardService
 * - No direct Supabase queries inside React components
 * - No client-side business calculations
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  Calendar,
  Filter,
  Building2,
  BarChart2,
  AlertCircle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Clock,
  Layers,
  Inbox,
  Target,
  Activity,
  FileCheck2,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  Eye,
  User,
  Users
} from 'lucide-react';
import { kpiDashboardService } from '../../../services/kpiDashboardService';
import { managerReportService } from '../../../services/manager-report.service';
import { ManagerScopeOrgUnit } from '../../../types/manager-report';
import {
  KpiPeriod,
  KpiDashboardFilters,
  KpiDashboardSummary,
  KpiDashboardUnitBreakdown,
  KpiDashboardAssignmentItem,
  KpiDashboardKpiBreakdown,
  KpiDashboardResultMode,
  KpiAssignmentStatus
} from '../../../types/kpi';
import { KpiAssignmentDetailView } from '../assignments/KpiAssignmentDetailView';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface KpiManagerDashboardViewProps {
  onNavigateToAssignments?: () => void;
}

export const KpiManagerDashboardView: React.FC<KpiManagerDashboardViewProps> = () => {
  // --- 1. Periods & Filter State ---
  const [periods, setPeriods] = useState<KpiPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState<boolean>(true);

  const [scopeUnits, setScopeUnits] = useState<ManagerScopeOrgUnit[]>([]);
  const [scopeLoading, setScopeLoading] = useState<boolean>(true);

  const [filters, setFilters] = useState<KpiDashboardFilters>({
    periodId: '',
    unitId: undefined,
    assignmentStatus: 'all',
    resultMode: 'all',
  });

  // --- 2. Data State from Read Models ---
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [unitBreakdownError, setUnitBreakdownError] = useState<string | null>(null);

  const [summary, setSummary] = useState<KpiDashboardSummary | null>(null);
  const [unitBreakdown, setUnitBreakdown] = useState<KpiDashboardUnitBreakdown[] | null>(null);
  const [kpiBreakdown, setKpiBreakdown] = useState<KpiDashboardKpiBreakdown[] | null>(null);

  // --- Assignments Pagination & Detail State ---
  const [assignments, setAssignments] = useState<KpiDashboardAssignmentItem[] | null>(null);
  const [assignmentsLoading, setAssignmentsLoading] = useState<boolean>(false);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const [assignmentPage, setAssignmentPage] = useState<number>(1);
  const [assignmentTotal, setAssignmentTotal] = useState<number>(0);
  const assignmentPageSize = 20;

  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  // --- 3. Period & Scope Initialization ---
  const initializePeriods = useCallback(async () => {
    setPeriodsLoading(true);
    setError(null);
    setUnitBreakdownError(null);
    try {
      const { data, error: periodErr } = await kpiDashboardService.getPeriods();
      if (periodErr) {
        throw periodErr;
      }

      const periodList = data || [];
      setPeriods(periodList);

      if (periodList.length > 0) {
        // Prioritize active period if exists, otherwise first available
        const activePeriod = periodList.find((p) => p.status === 'active');
        const defaultPeriod = activePeriod || periodList[0];
        setFilters((prev) => ({
          ...prev,
          periodId: defaultPeriod.id,
        }));
      } else {
        setFilters((prev) => ({
          ...prev,
          periodId: '',
        }));
      }
    } catch (err: any) {
      console.error('[KpiManagerDashboardView] Error initializing periods:', err);
      setError('Không thể tải dữ liệu KPI. Vui lòng thử lại.');
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  const initializeScope = useCallback(async () => {
    setScopeLoading(true);
    try {
      const { scope_units } = await managerReportService.getManagerScopeStaff();
      setScopeUnits(scope_units || []);
    } catch (err) {
      console.error('[KpiManagerDashboardView] Error initializing scope:', err);
    } finally {
      setScopeLoading(false);
    }
  }, []);

  useEffect(() => {
    initializePeriods();
    initializeScope();
  }, [initializePeriods, initializeScope]);

  // --- 4. Orchestrate Dashboard Service Read Models ---
  const fetchDashboardData = useCallback(async (activeFilters: KpiDashboardFilters) => {
    if (!activeFilters.periodId) {
      setSummary(null);
      setUnitBreakdown(null);
      setKpiBreakdown(null);
      return;
    }

    setLoading(true);
    setError(null);
    setUnitBreakdownError(null);

    try {
      // Parallel orchestrator for aggregates
      const [sumRes, unitRes, kpiRes] = await Promise.all([
        kpiDashboardService.getSummary(activeFilters),
        kpiDashboardService.getUnitBreakdown(activeFilters),
        kpiDashboardService.getKpiBreakdown(activeFilters),
      ]);

      if (sumRes.error) throw sumRes.error;
      
      if (unitRes.error) {
        console.error('[KpiManagerDashboardView] Fetch unit breakdown error:', unitRes.error);
        setUnitBreakdownError('Không thể tải dữ liệu KPI theo đơn vị.');
        setUnitBreakdown(null);
      } else {
        setUnitBreakdownError(null);
        setUnitBreakdown(unitRes.data);
      }

      setSummary(sumRes.data);
      setKpiBreakdown(kpiRes.data);
    } catch (err: any) {
      console.error('[KpiManagerDashboardView] Fetch dashboard data error:', err);
      setError('Không thể tải số liệu tổng quan KPI.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAssignmentsData = useCallback(async (activeFilters: KpiDashboardFilters, page: number) => {
    if (!activeFilters.periodId) {
      setAssignments(null);
      return;
    }

    setAssignmentsLoading(true);
    setAssignmentsError(null);

    try {
      const pagedFilters: KpiDashboardFilters = {
        ...activeFilters,
        limit: assignmentPageSize,
        offset: (page - 1) * assignmentPageSize
      };
      
      const asgnRes = await kpiDashboardService.getAssignments(pagedFilters);
      
      if (asgnRes.error) {
        throw asgnRes.error;
      }

      setAssignments(asgnRes.data);
      setAssignmentTotal(asgnRes.totalCount ?? 0);
    } catch (err: any) {
      console.error('[KpiManagerDashboardView] Fetch assignments error:', err);
      setAssignmentsError('Không thể tải danh sách KPI.');
      setAssignments(null);
    } finally {
      setAssignmentsLoading(false);
    }
  }, [assignmentPageSize]);

  // Reset pagination on filter change
  useEffect(() => {
    setAssignmentPage(1);
  }, [filters.periodId, filters.unitId, filters.assignmentStatus, filters.resultMode]);

  useEffect(() => {
    if (filters.periodId) {
      fetchDashboardData(filters);
    }
  }, [filters, fetchDashboardData]);

  useEffect(() => {
    if (filters.periodId) {
      fetchAssignmentsData(filters, assignmentPage);
    }
  }, [filters, assignmentPage, fetchAssignmentsData]);

  // --- Filter Handlers ---
  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPeriodId = e.target.value;
    setFilters((prev) => ({
      ...prev,
      periodId: newPeriodId,
    }));
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnitId = e.target.value;
    setFilters((prev) => ({
      ...prev,
      unitId: newUnitId || undefined,
    }));
  };

  const handleResultModeChange = (mode: KpiDashboardResultMode) => {
    setFilters((prev) => ({
      ...prev,
      resultMode: mode,
    }));
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const status = e.target.value as KpiAssignmentStatus | 'all';
    setFilters((prev) => ({
      ...prev,
      assignmentStatus: status,
    }));
  };

  const handleRetry = () => {
    if (!filters.periodId && periods.length === 0) {
      initializePeriods();
    } else {
      fetchDashboardData(filters);
    }
  };

  const getStatusBadge = (status: KpiAssignmentStatus) => {
    switch (status) {
      case 'draft':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">Bản nháp</span>;
      case 'assigned':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Đã giao</span>;
      case 'active':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Đang thực hiện</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-zinc-100 text-zinc-700 border border-zinc-200">Đã đóng</span>;
      case 'locked':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Đã khóa</span>;
      case 'cancelled':
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">Đã hủy</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  const getReviewStatusText = (status: string | null) => {
    switch (status) {
      case 'in_review': return 'Đang đánh giá';
      case 'returned': return 'Yêu cầu điều chỉnh';
      case 'approved': return 'Đã phê duyệt';
      default: return null;
    }
  };

  // If detail view is open, render detail view component over the dashboard
  if (selectedAssignmentId) {
    return (
      <KpiAssignmentDetailView
        assignmentId={selectedAssignmentId}
        onBack={() => setSelectedAssignmentId(null)}
      />
    );
  }

  // --- Render State Checks ---
  const hasNoPeriods = !periodsLoading && periods.length === 0;
  const isPeriodEmpty = !loading && !error && summary && summary.assignment_count === 0;

  return (
    <div id="kpi-manager-dashboard-page" className="space-y-6">
      {/* SECTION 1: Page Header */}
      <div id="kpi-dashboard-header" className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100">
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Tổng quan KPI
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi tình hình thực hiện KPI theo kỳ và đơn vị
          </p>
        </div>

        {/* Global Action / Refresh */}
        <div className="flex items-center gap-2">
          <button
            id="kpi-dashboard-refresh-button"
            onClick={handleRetry}
            disabled={loading || periodsLoading}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50 transition-colors cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>
      </div>

      {/* SECTION 2: Filter Area Placeholder / Container */}
      <div
        id="kpi-dashboard-filter-section"
        className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Period Selector */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
              <label htmlFor="dashboard-period-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Kỳ:
              </label>
              <select
                id="dashboard-period-select"
                value={filters.periodId}
                onChange={handlePeriodChange}
                disabled={periodsLoading || periods.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                {periods.length === 0 ? (
                  <option value="">(Không có kỳ KPI)</option>
                ) : (
                  periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.status === 'active' ? '• (Đang hoạt động)' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Unit Filter */}
            <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l sm:border-slate-200">
              <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
              <label htmlFor="dashboard-unit-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Đơn vị:
              </label>
              <select
                id="dashboard-unit-select"
                value={filters.unitId || ''}
                onChange={handleUnitChange}
                disabled={scopeLoading || scopeUnits.length === 0}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">Tất cả đơn vị</option>
                {scopeUnits.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Assignment Status Filter */}
            <div className="flex items-center gap-2 pl-0 sm:pl-3 sm:border-l sm:border-slate-200">
              <Filter className="h-4 w-4 text-slate-400 shrink-0" />
              <label htmlFor="dashboard-status-select" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Trạng thái:
              </label>
              <select
                id="dashboard-status-select"
                value={filters.assignmentStatus || 'all'}
                onChange={handleStatusChange}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 shadow-xs focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="assigned">Mới giao (Assigned)</option>
                <option value="active">Đang thực hiện (Active)</option>
                <option value="closed">Đã đóng (Closed)</option>
                <option value="locked">Đã khóa (Locked)</option>
              </select>
            </div>
          </div>

          {/* Result Mode Segmented Control: All / Live / Official */}
          <div className="flex items-center gap-1 self-start lg:self-auto rounded-lg bg-slate-100 p-1 border border-slate-200/80">
            <button
              id="btn-filter-result-mode-all"
              onClick={() => handleResultModeChange('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filters.resultMode === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả kết quả
            </button>
            <button
              id="btn-filter-result-mode-live"
              onClick={() => handleResultModeChange('live')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filters.resultMode === 'live'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kết quả Live
            </button>
            <button
              id="btn-filter-result-mode-official"
              onClick={() => handleResultModeChange('official')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                filters.resultMode === 'official'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kết quả chính thức
            </button>
          </div>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div
          id="kpi-dashboard-error-state"
          className="rounded-xl border border-red-200 bg-red-50/80 p-5 text-red-800 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <div>
              <p className="font-semibold text-sm">{error}</p>
              <p className="text-xs text-red-600/90 mt-0.5">Vui lòng kiểm tra kết nối mạng hoặc quyền truy cập của tài khoản.</p>
            </div>
          </div>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-red-700 border border-red-200 shadow-xs hover:bg-red-50 cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* EMPTY STATE 1: No KPI periods in system */}
      {hasNoPeriods && (
        <div
          id="kpi-dashboard-no-periods-state"
          className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Calendar className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Chưa có kỳ KPI để hiển thị.</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Hệ thống chưa thiết lập kỳ đánh giá KPI nào. Vui lòng liên hệ Quản trị viên để khởi tạo kỳ đánh giá.
          </p>
        </div>
      )}

      {/* EMPTY STATE 2: Period has no assignments */}
      {isPeriodEmpty && (
        <div
          id="kpi-dashboard-empty-period-state"
          className="rounded-xl border border-slate-200 bg-white p-12 text-center shadow-xs"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <Inbox className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">Chưa có dữ liệu KPI trong kỳ này.</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Chưa có bản giao KPI nào được phân bổ trong phạm vi quản lý của bạn.
          </p>
        </div>
      )}

      {/* SUMMARY AREA */}
      {!hasNoPeriods && !isPeriodEmpty && !error && (
        <div className="space-y-6">
          {/* SECTION 3: Summary Cards */}
          <div
            id="kpi-dashboard-summary-section"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden"
          >
            {/* Summary Loading Skeleton */}
            {(loading || periodsLoading) && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                 <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium text-slate-600">Đang tải dữ liệu...</span>
                 </div>
              </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Chỉ số tổng hợp
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Card 1: Tổng số KPI */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Tổng số KPI được giao
                  </span>
                  <Target className="h-4 w-4 text-indigo-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">
                    {summary?.assignment_count ?? '—'}
                  </span>
                </div>
              </div>

              {/* Card 2: Đang thực hiện */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Đang thực hiện
                  </span>
                  <Activity className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">
                    {summary?.active_count ?? '—'}
                  </span>
                </div>
              </div>

              {/* Card 3: Chờ/đang hoàn thiện */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Chờ hoàn thiện
                  </span>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">
                    {summary?.partial_count ?? '—'}
                  </span>
                  <span className="text-xs font-medium text-slate-500 mt-1">
                    + {summary?.unscored_count ?? 0} chưa có điểm
                  </span>
                </div>
              </div>

              {/* Card 4: Đã khóa */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Đã khóa
                  </span>
                  <FileCheck2 className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl font-bold text-slate-900">
                    {summary?.locked_count ?? '—'}
                  </span>
                </div>
              </div>

              {/* Card 5: Điểm KPI Tạm tính */}
              <div className={`rounded-lg border p-4 shadow-sm transition-opacity ${filters.resultMode === 'official' ? 'opacity-50 border-slate-200 bg-slate-100' : 'border-indigo-200 bg-indigo-50/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-700'}`}>
                    Điểm KPI Tạm tính
                  </span>
                  <Clock className={`h-4 w-4 ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-500'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-2xl font-bold ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-900'}`}>
                     {filters.resultMode === 'official' ? '—' : (summary?.live_average_score === null || summary?.live_average_score === undefined ? '—' : summary.live_average_score)}
                  </span>
                  <span className={`text-xs font-medium mt-1 ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-600/80'}`}>
                    {summary?.live_scored_count ?? 0} hồ sơ có điểm
                  </span>
                </div>
              </div>

              {/* Card 6: Điểm KPI Chính thức */}
              <div className={`rounded-lg border p-4 shadow-sm transition-opacity ${filters.resultMode === 'live' ? 'opacity-50 border-slate-200 bg-slate-100' : 'border-emerald-200 bg-emerald-50/50'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-700'}`}>
                    Điểm KPI Chính thức
                  </span>
                  <Award className={`h-4 w-4 ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-500'}`} />
                </div>
                <div className="flex flex-col">
                  <span className={`text-2xl font-bold ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-900'}`}>
                     {filters.resultMode === 'live' ? '—' : (summary?.official_average_score === null || summary?.official_average_score === undefined ? '—' : summary.official_average_score)}
                  </span>
                  <span className={`text-xs font-medium mt-1 ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-600/80'}`}>
                    {summary?.official_scored_count ?? 0} hồ sơ có điểm
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: Unit Breakdown Area */}
          <div
            id="kpi-dashboard-unit-breakdown-section"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden"
          >
            {(loading || periodsLoading) && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                 <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium text-slate-600">Đang tải dữ liệu...</span>
                 </div>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  KPI theo đơn vị
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Tổng hợp tình hình KPI của các đơn vị trong phạm vi quản lý</span>
            </div>

            {unitBreakdownError ? (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-5 text-red-800 shadow-xs flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="font-medium text-sm">{unitBreakdownError}</p>
              </div>
            ) : (!unitBreakdown || unitBreakdown.length === 0) ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                 <p className="text-sm font-medium text-slate-600">Chưa có dữ liệu KPI theo đơn vị trong kỳ này.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Đơn vị</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Số KPI được giao</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Đang cập nhật</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Chính thức</th>
                      <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Chưa đủ dữ liệu</th>
                      <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-700'}`}>Điểm tạm tính</th>
                      <th className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-right whitespace-nowrap ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-700'}`}>Điểm chính thức</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {[...unitBreakdown].sort((a, b) => a.unit_name.localeCompare(b.unit_name)).map((row) => (
                      <tr key={row.unit_id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{row.unit_name}</div>
                          {row.unit_code && <div className="text-xs text-slate-500 font-mono mt-0.5">{row.unit_code}</div>}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-900">
                          {row.assignment_count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {row.live_assignment_count}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {row.official_assignment_count}
                        </td>
                        <td className="px-4 py-3 text-right">
                           <div className="text-amber-600 font-medium text-sm whitespace-nowrap">
                             {(row.partial_count ?? 0) + (row.unscored_count ?? 0) > 0 ? (
                               <>
                                 <span title="Một phần">{row.partial_count ?? 0} một phần</span> <span className="text-amber-400 mx-1">·</span> <span title="Chưa có điểm">{row.unscored_count ?? 0} chưa có điểm</span>
                               </>
                             ) : (
                               <span className="text-slate-400">—</span>
                             )}
                           </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${filters.resultMode === 'official' ? 'text-slate-400' : 'text-indigo-600'}`}>
                            {filters.resultMode === 'official' ? '—' : (row.live_average_score === null || row.live_average_score === undefined ? '—' : row.live_average_score)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${filters.resultMode === 'live' ? 'text-slate-400' : 'text-emerald-600'}`}>
                            {filters.resultMode === 'live' ? '—' : (row.official_average_score === null || row.official_average_score === undefined ? '—' : row.official_average_score)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* SECTION 5: Assignment List Area */}
          <div
            id="kpi-dashboard-assignments-section"
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative overflow-hidden"
          >
            {assignmentsLoading && (
              <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                 <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                    <span className="text-sm font-medium text-slate-600">Đang tải danh sách KPI...</span>
                 </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 mb-4 gap-2">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                  Danh sách KPI
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-medium">Chi tiết KPI đã giao trong kỳ đang chọn</span>
            </div>

            {assignmentsError ? (
              <div className="rounded-lg border border-red-200 bg-red-50/80 p-5 text-red-800 shadow-xs flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                <p className="font-medium text-sm">{assignmentsError}</p>
              </div>
            ) : (!assignments || assignments.length === 0) ? (
              <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                 <p className="text-sm font-medium text-slate-600">
                    {filters.assignmentStatus !== 'all' || filters.unitId || filters.resultMode !== 'all'
                      ? 'Chưa có KPI phù hợp với bộ lọc hiện tại.'
                      : 'Chưa có KPI được giao trong kỳ này.'}
                 </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[1000px]">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Đối tượng</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Đơn vị</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Kỳ KPI</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Thời gian áp dụng</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Trạng thái</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">Kết quả</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Điểm</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-right whitespace-nowrap">Mức hoàn thành</th>
                        <th className="px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider text-center whitespace-nowrap">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {assignments.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
                                row.assignee_type === 'individual' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                              }`}>
                                {row.assignee_type === 'individual' ? <User className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-semibold text-sm text-slate-900">{row.assignee_name}</span>
                                <span className="text-xs font-medium text-slate-500 mt-0.5">
                                  {row.assignee_type === 'individual' ? 'Nhân viên' : 'Đơn vị'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-slate-700">
                              {row.assignee_type === 'individual' ? (row.assignee_unit_name || row.assignee_organization_unit_name || '—') : (row.assignee_unit_name || row.unit_name || '—')}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span className="text-sm font-medium text-slate-700">{row.period_name || '—'}</span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col text-xs text-slate-600 font-medium">
                              <span>{row.effective_from ? row.effective_from.split('T')[0] : '—'}</span>
                              <span className="text-slate-400">đến {row.effective_to ? row.effective_to.split('T')[0] : '—'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col items-start gap-1">
                              {getStatusBadge(row.status)}
                              {getReviewStatusText(row.review_status) && (
                                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                  {getReviewStatusText(row.review_status)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className={`text-xs font-semibold ${row.result_mode === 'official' ? 'text-emerald-700' : 'text-indigo-700'}`}>
                                {row.result_mode === 'official' ? 'Chính thức' : 'Tạm tính'}
                              </span>
                              <span className={`text-xs mt-0.5 font-medium ${row.result_status === 'complete' ? 'text-emerald-600' : row.result_status === 'partial' ? 'text-amber-600' : 'text-slate-500'}`}>
                                {row.result_status === 'complete' ? 'Hoàn thành' : row.result_status === 'partial' ? 'Chưa đủ dữ liệu' : 'Chưa có điểm'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={`text-base font-bold ${row.result_mode === 'official' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                              {row.total_score === null ? '—' : row.total_score}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-bold text-slate-700">
                                {row.total_weight > 0 ? Math.round((row.scored_weight / row.total_weight) * 100) : 0}%
                              </span>
                              <span className="text-[10px] font-medium text-slate-500 mt-0.5">
                                {row.scored_weight} / {row.total_weight} trọng số
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center">
                            <button
                              onClick={() => setSelectedAssignmentId(row.id)}
                              className="inline-flex items-center justify-center p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                              title="Xem chi tiết"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {assignmentTotal > assignmentPageSize && (
                  <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
                    <span className="text-xs font-medium text-slate-500">
                      Hiển thị {(assignmentPage - 1) * assignmentPageSize + 1} - {Math.min(assignmentPage * assignmentPageSize, assignmentTotal)} trong số {assignmentTotal}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setAssignmentPage(p => Math.max(1, p - 1))}
                        disabled={assignmentPage === 1}
                        className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setAssignmentPage(p => p + 1)}
                        disabled={assignmentPage * assignmentPageSize >= assignmentTotal}
                        className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* SECTION 6: Chart Area */}
          <div
            id="kpi-dashboard-chart-section"
            className="grid grid-cols-1 lg:grid-cols-2 gap-4"
          >
            {/* Chart 1: Assignment Status Distribution */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative flex flex-col h-full">
              {loading && (
                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                   <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium text-slate-600">Đang tải biểu đồ...</span>
                   </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                    Phân bố trạng thái KPI
                  </h2>
                </div>
              </div>
              
              <div className="flex-1 min-h-[300px]">
                {error ? (
                  <div className="h-full flex items-center justify-center text-sm font-medium text-red-600 bg-red-50 rounded-lg">
                    Không thể hiển thị biểu đồ KPI.
                  </div>
                ) : !summary || summary.assignment_count === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm font-medium text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-lg">
                    Chưa có dữ liệu để hiển thị biểu đồ.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={[
                        { name: 'Đang thực hiện', value: summary.active_count },
                        { name: 'Đã đóng', value: summary.closed_count },
                        { name: 'Đã khóa', value: summary.locked_count },
                      ].filter(d => d.value > 0)}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={{ stroke: '#cbd5e1' }} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => [value, 'Số lượng']}
                      />
                      <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Chart 2: KPI Score by Unit */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs relative flex flex-col h-full lg:col-span-1">
              {loading && (
                <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                   <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200">
                      <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
                      <span className="text-sm font-medium text-slate-600">Đang tải biểu đồ...</span>
                   </div>
                </div>
              )}
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-indigo-600" />
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                    Điểm KPI theo đơn vị
                  </h2>
                </div>
              </div>

              <div className="flex-1 min-h-[300px]">
                {unitBreakdownError ? (
                  <div className="h-full flex items-center justify-center text-sm font-medium text-red-600 bg-red-50 rounded-lg">
                    Không thể hiển thị biểu đồ KPI.
                  </div>
                ) : !unitBreakdown || unitBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm font-medium text-slate-500 bg-slate-50/60 border border-dashed border-slate-200 rounded-lg">
                    Chưa có dữ liệu để hiển thị biểu đồ.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={unitBreakdown.map(u => ({
                        name: u.unit_name,
                        live: u.live_average_score !== null ? Number(u.live_average_score) : null,
                        official: u.official_average_score !== null ? Number(u.official_average_score) : null,
                      }))}
                      margin={{ top: 20, right: 10, left: 0, bottom: 25 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="name" 
                        tick={{ fontSize: 11, fill: '#64748b' }} 
                        axisLine={{ stroke: '#cbd5e1' }} 
                        tickLine={false} 
                        angle={-45} 
                        textAnchor="end" 
                        height={60}
                      />
                      <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: '#f8fafc' }}
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number, name: string) => {
                          if (value === null) return ['—', name === 'live' ? 'Điểm tạm tính' : 'Điểm chính thức'];
                          return [value, name === 'live' ? 'Điểm tạm tính' : 'Điểm chính thức'];
                        }}
                        labelStyle={{ color: '#0f172a', fontWeight: 600, marginBottom: '8px' }}
                      />
                      <Legend 
                        verticalAlign="top" 
                        height={36} 
                        iconType="circle"
                        formatter={(value) => <span className="text-sm font-medium text-slate-700 ml-1 mr-3">{value === 'live' ? 'Điểm tạm tính' : 'Điểm chính thức'}</span>}
                      />
                      {(filters.resultMode === 'all' || filters.resultMode === 'live') && (
                        <Bar dataKey="live" name="live" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      )}
                      {(filters.resultMode === 'all' || filters.resultMode === 'official') && (
                        <Bar dataKey="official" name="official" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

