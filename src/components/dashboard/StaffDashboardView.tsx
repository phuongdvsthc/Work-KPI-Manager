/**
 * Staff Dashboard Page Shell (v0.7-B1)
 * Personal dashboard foundation for Staff users.
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { 
  RefreshCw, 
  Calendar, 
  AlertCircle, 
  CheckSquare, 
  FileText, 
  Target, 
  BarChart2, 
  Bell, 
  Loader2,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { dashboardApiClient, StaffDashboardFilters } from '../../services/dashboardApiClient';
import { UnifiedDashboardResponse } from '../../services/dashboardReportingService';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const StaffDashboardView: React.FC = () => {
  const [data, setData] = useState<UnifiedDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Default dates: start of current month and today (or use contract defaults)
  const today = new Date().toISOString().split('T')[0];
  const firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState<string>(firstDayOfMonth);
  const [dateTo, setDateTo] = useState<string>(today);
  const [dateError, setDateError] = useState<string | null>(null);

  const requestIdRef = useRef<number>(0);

  const validateAndNormalizeDates = (from: string, to: string): boolean => {
    setDateError(null);
    if (from && !DATE_REGEX.test(from)) {
      setDateError('Định dạng từ ngày không hợp lệ (YYYY-MM-DD).');
      return false;
    }
    if (to && !DATE_REGEX.test(to)) {
      setDateError('Định dạng đến ngày không hợp lệ (YYYY-MM-DD).');
      return false;
    }
    if (from && to && from > to) {
      setDateError('Khoảng thời gian không hợp lệ: "Từ ngày" không được sau "Đến ngày".');
      return false;
    }
    return true;
  };

  const loadDashboard = useCallback(async (customFilters?: StaffDashboardFilters) => {
    const currentRequestId = ++requestIdRef.current;
    
    const fFrom = customFilters?.date_from ?? dateFrom;
    const fTo = customFilters?.date_to ?? dateTo;

    if (!validateAndNormalizeDates(fFrom, fTo)) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const filters: StaffDashboardFilters = {
        date_from: fFrom,
        date_to: fTo,
      };

      const result = await dashboardApiClient.getStaffDashboard(filters);

      if (currentRequestId === requestIdRef.current) {
        setData(result);
        setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        setLoading(false);
      }
    } catch (err: any) {
      if (currentRequestId === requestIdRef.current) {
        setError(err.message || 'Không thể tải dữ liệu bảng điều khiển.');
        setLoading(false);
      }
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    loadDashboard();
  };

  const handleRefresh = () => {
    loadDashboard();
  };

  // Determine if response is empty (no tasks, no daily reports, no metrics, no kpis)
  const isDataEmpty = data && 
    (!data.summary?.operations?.tasks || data.summary.operations.tasks.total === 0) &&
    (!data.summary?.operations?.daily_reports || data.summary.operations.daily_reports.total === 0) &&
    (!data.summary?.metrics || data.summary.metrics.total_entries === 0) &&
    (!data.summary?.kpis || data.summary.kpis.total_assignments === 0);

  const hasPartialWarning = data?.warnings?.some(w => w.code === 'partial_data_unavailable');

  return (
    <div id="staff-dashboard-view" className="space-y-6 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Header & Title Area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tổng quan công việc</h1>
          <p className="text-sm text-slate-500 mt-1">
            Thông tin phản ánh công việc, báo cáo và kết quả KPI cá nhân của bạn.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastUpdated && (
            <span className="hidden md:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
              <Clock className="h-3.5 w-3.5" />
              Cập nhật lúc: {lastUpdated}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer"
            aria-label="Làm mới dữ liệu"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Reporting Period Filter Area */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <form onSubmit={handleApplyFilter} className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1 lg:mb-0 lg:mr-2">
            <Calendar className="h-4 w-4 text-indigo-600" />
            <span>Kỳ báo cáo:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
            <div>
              <label htmlFor="date-from" className="block text-xs font-medium text-slate-600 mb-1">
                Từ ngày
              </label>
              <input
                id="date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
            <div>
              <label htmlFor="date-to" className="block text-xs font-medium text-slate-600 mb-1">
                Đến ngày
              </label>
              <input
                id="date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-slate-50/50"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-all cursor-pointer self-end lg:self-auto"
          >
            Áp dụng
          </button>
        </form>

        {dateError && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-700" role="alert">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{dateError}</span>
          </div>
        )}
      </div>

      {/* Partial Response Warning Banner */}
      {hasPartialWarning && (
        <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs font-medium text-amber-800" role="status">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
          <span>Một số thành phần dữ liệu không phản hồi đầy đủ. Hệ thống đang hiển thị dữ liệu khả dụng.</span>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-2xl bg-rose-50 border border-rose-200 p-6 text-center" role="alert">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 mb-3">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-rose-900">Không thể tải dữ liệu</h3>
          <p className="text-sm text-rose-700 mt-1 max-w-md mx-auto">{error}</p>
          <button
            type="button"
            onClick={() => loadDashboard()}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-rose-500 transition-all cursor-pointer"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Thử lại</span>
          </button>
        </div>
      )}

      {/* LOADING STATE */}
      {loading && !data && !error && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200/80 shadow-xs">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
          <p className="text-sm font-medium text-slate-600">Đang tổng hợp dữ liệu cá nhân...</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && isDataEmpty && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Chưa có dữ liệu trong khoảng thời gian này</h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Không tìm thấy công việc, báo cáo hoặc KPI nào trong khoảng thời gian từ {dateFrom} đến {dateTo}.
          </p>
        </div>
      )}

      {/* DATA LOADED / PAGE SHELL CONTENT */}
      {(!loading || data) && data && !isDataEmpty && (
        <div className="space-y-6">
          {/* 5 Reserved Semantic Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Section 1: Công việc */}
            <section aria-labelledby="section-tasks" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <CheckSquare className="h-5 w-5" />
                    </div>
                    <h2 id="section-tasks" className="text-base font-semibold text-slate-900">Công việc</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {data.summary?.operations?.tasks?.total || 0} tổng số
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Tổng quan tiến độ thực hiện công việc cá nhân trong kỳ báo cáo.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-xs text-slate-500">
                Khu vực nội dung chi tiết công việc (v0.7-B2)
              </div>
            </section>

            {/* Section 2: Báo cáo hằng ngày */}
            <section aria-labelledby="section-daily-reports" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h2 id="section-daily-reports" className="text-base font-semibold text-slate-900">Báo cáo hằng ngày</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {data.summary?.operations?.daily_reports?.total || 0} báo cáo
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Trạng thái nộp báo cáo và lịch sử làm việc hằng ngày.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-xs text-slate-500">
                Khu vực nội dung chi tiết báo cáo hằng ngày (v0.7-B3)
              </div>
            </section>

            {/* Section 3: Chỉ số công việc */}
            <section aria-labelledby="section-metrics" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <BarChart2 className="h-5 w-5" />
                    </div>
                    <h2 id="section-metrics" className="text-base font-semibold text-slate-900">Chỉ số công việc</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {data.summary?.metrics?.total_entries || 0} bản ghi
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Dữ liệu ghi nhận chỉ số thực hiện định lượng.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-xs text-slate-500">
                Khu vực nội dung chi tiết chỉ số (v0.7-B4)
              </div>
            </section>

            {/* Section 4: KPI cá nhân */}
            <section aria-labelledby="section-kpis" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <h2 id="section-kpis" className="text-base font-semibold text-slate-900">KPI cá nhân</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {data.summary?.kpis?.total_assignments || 0} chỉ tiêu
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Kết quả đánh giá và tiến độ hoàn thành chỉ tiêu KPI được giao.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-xs text-slate-500">
                Khu vực nội dung chi tiết KPI cá nhân (v0.7-B5)
              </div>
            </section>

            {/* Section 5: Cần chú ý */}
            <section aria-labelledby="section-attention" className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between lg:col-span-2">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                      <Bell className="h-5 w-5" />
                    </div>
                    <h2 id="section-attention" className="text-base font-semibold text-slate-900">Cần chú ý & Cảnh báo</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                    {data.warnings?.length || 0} cảnh báo
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Các thông báo quan trọng, công việc quá hạn hoặc cần xác nhận ngay.
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4 border border-slate-100 text-center text-xs text-slate-500">
                Khu vực cảnh báo và chú ý vận hành
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
