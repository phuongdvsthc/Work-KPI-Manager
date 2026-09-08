import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar, 
  Layers, 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Clock, 
  Building2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { kpiAssignmentService } from '../../../services/kpi-assignment.service';
import { 
  KpiAssignment, 
  KpiAssignmentItem, 
  KpiAssignmentStatus 
} from '../../../types/kpi';
import { formatTargetConfig } from '../../../utils/kpiTargetFormatter';

export const StaffMyKpiView: React.FC = () => {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<KpiAssignment[]>([]);
  const [itemsMap, setItemsMap] = useState<Record<string, KpiAssignmentItem[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadMyAssignments();
    }
  }, [user?.id]);

  const loadMyAssignments = async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await kpiAssignmentService.getMyAssignments(user.id);
      if (fetchErr) throw fetchErr;

      const list = data || [];
      setAssignments(list);

      // Section 8: Log one Staff assignment for verification
      if (list.length > 0) {
        const first = list[0];
        console.log('[KPI B3] assignmentId:', first.id);
        console.log('[KPI B3] periodId:', first.periodId || first.period_id);
        console.log('[KPI B3] periodName:', first.periodName || first.period?.name);
        console.log('[KPI B3] templateId:', first.templateId || first.template_id);
        console.log('[KPI B3] templateName:', first.templateName || first.template?.name);
        console.log('[KPI B3] templateVersionId:', first.templateVersionId || first.template_version_id);
        console.log('[KPI B3] templateVersionNo:', first.templateVersionNo ?? first.template_version?.version_no);
      }

      if (list.length > 0) {
        setExpandedId(list[0].id);
        // Load items for the first assignment
        loadItemsForAssignment(list[0].id);
      }
    } catch (err: any) {
      console.error('Error loading staff KPIs:', err);
      setError(err.message || 'Không thể tải danh sách KPI của bạn');
    } finally {
      setLoading(false);
    }
  };

  const loadItemsForAssignment = async (assignmentId: string) => {
    if (itemsMap[assignmentId]) return;
    try {
      const { data, error: itemsErr } = await kpiAssignmentService.getAssignmentItems(assignmentId);
      if (itemsErr) throw itemsErr;
      setItemsMap(prev => ({ ...prev, [assignmentId]: data || [] }));
    } catch (err) {
      console.error('Error loading assignment items:', err);
    }
  };

  const toggleExpand = (assignmentId: string) => {
    if (expandedId === assignmentId) {
      setExpandedId(null);
    } else {
      setExpandedId(assignmentId);
      loadItemsForAssignment(assignmentId);
    }
  };

  const getStatusBadge = (status: KpiAssignmentStatus) => {
    switch (status) {
      case 'assigned':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">Đã giao</span>;
      case 'active':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Đang áp dụng</span>;
      case 'closed':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-zinc-100 text-zinc-700">Đã kết thúc</span>;
      case 'locked':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">Đã khóa</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">KPI của tôi</h2>
        <p className="text-xs text-slate-500 mt-1">
          Theo dõi các bộ chỉ tiêu KPI cá nhân đã được giao và áp dụng theo kỳ đánh giá
        </p>
      </div>

      {/* Notice Banner */}
      <div className="flex items-start gap-3 rounded-2xl bg-indigo-50/70 p-4 border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
        <Info className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Lưu ý:</strong> Kết quả thực hiện sẽ được bổ sung ở bước tiếp theo (v0.4.3). Hiện tại bạn có thể theo dõi các chỉ tiêu và trọng số KPI được giao cho mình.
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl bg-red-50 p-4 text-red-800 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm">Đang nạp danh sách KPI của bạn...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 border border-slate-200/80 shadow-2xs text-center space-y-3">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <User className="h-6 w-6" />
          </div>
          <div className="text-base font-bold text-slate-800">Chưa có KPI nào được giao cho bạn</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Khi cán bộ quản lý hoàn tất giao chỉ tiêu KPI cho bạn, thông tin chi tiết sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map(assignment => {
            const isExpanded = expandedId === assignment.id;
            const items = itemsMap[assignment.id] || [];
            const totalWeight = items.reduce((sum, it) => sum + (Number(it.weight) || 0), 0);

            // Normalized relation fallbacks with explicit warnings if missing
            const templateDisplayName = assignment.templateName || assignment.template?.name || 'Bộ KPI chưa xác định';
            if (!assignment.templateName && !assignment.template?.name) {
              console.warn('[StaffMyKpiView] Missing template relation for assignment:', assignment.id, 'template_id:', assignment.template_id);
            }

            const periodDisplayName = assignment.periodName || assignment.period?.name || 'Kỳ đánh giá chưa xác định';
            if (!assignment.periodName && !assignment.period?.name) {
              console.warn('[StaffMyKpiView] Missing period relation for assignment:', assignment.id, 'period_id:', assignment.period_id);
            }

            const versionNo = assignment.templateVersionNo ?? assignment.template_version?.version_no ?? null;
            if (versionNo === null) {
              console.warn('[StaffMyKpiView] Missing template version relation for assignment:', assignment.id, 'template_version_id:', assignment.template_version_id);
            }

            const snapshotUnitName = assignment.assigneeUnitSnapshotName || assignment.assignee_unit_snapshot?.name || assignment.assigneeOrganizationName || null;
            const effectiveFromDisplay = assignment.effectiveFrom || assignment.effective_from || assignment.period?.start_date || '-';
            const effectiveToDisplay = assignment.effectiveTo || assignment.effective_to || assignment.period?.end_date || '-';

            return (
              <div
                key={assignment.id}
                className="rounded-2xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden transition-all"
              >
                {/* Assignment Summary Bar */}
                <div
                  onClick={() => toggleExpand(assignment.id)}
                  className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-bold text-slate-900">
                          {templateDisplayName}
                        </h3>
                        {getStatusBadge(assignment.status)}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Kỳ: <strong className="text-slate-700 font-semibold">{periodDisplayName}</strong>
                          {assignment.period?.code && (
                            <span className="text-slate-400 text-[11px] font-mono">({assignment.period.code})</span>
                          )}
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-slate-600 font-medium">
                          {versionNo !== null ? `Phiên bản v${versionNo}` : 'Phiên bản chưa xác định'}
                        </span>
                        {snapshotUnitName && (
                          <>
                            <span className="text-slate-300">·</span>
                            <span className="flex items-center gap-1.5 text-slate-600">
                              <Building2 className="h-3.5 w-3.5 text-slate-400" />
                              {snapshotUnitName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs text-slate-400">Hiệu lực</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {effectiveFromDisplay} → {effectiveToDisplay}
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details & Items Table */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-5 space-y-4">
                    {assignment.notes && (
                      <div className="rounded-xl bg-white p-3 border border-slate-200 text-xs text-slate-600">
                        <strong className="text-slate-800">Ghi chú từ người giao:</strong> {assignment.notes}
                      </div>
                    )}

                    <div className="rounded-xl bg-white border border-slate-200/80 overflow-hidden shadow-2xs">
                      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-white">
                        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Danh sách tiêu chí KPI ({items.length})
                        </div>
                        <div className="text-xs font-bold text-indigo-600">
                          Tổng trọng số: {totalWeight}%
                        </div>
                      </div>

                      {items.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          Đang tải danh sách tiêu chí...
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider">
                              <tr>
                                <th className="px-4 py-3">Tiêu chí KPI</th>
                                <th className="px-3 py-3">Mục tiêu liên kết</th>
                                <th className="px-3 py-3 text-center">Trọng số</th>
                                <th className="px-3 py-3">Chỉ tiêu (Target)</th>
                                <th className="px-3 py-3">Cách tính điểm</th>
                                <th className="px-3 py-3 text-center">Bắt buộc</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              {items.map(item => {
                                const def = item.definition || item.definition_snapshot || {};
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/60">
                                    <td className="px-4 py-3.5">
                                      <div className="font-bold text-slate-900 text-sm">{def.name || 'Tiêu chí KPI'}</div>
                                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                        <span className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-600">
                                          {def.code || 'CODE'}
                                        </span>
                                        <span>•</span>
                                        <span>{def.measurement_type}</span>
                                        {def.unit_code && <span>({def.unit_code})</span>}
                                      </div>
                                    </td>

                                    <td className="px-3 py-3.5 text-slate-600">
                                      {item.objective ? (
                                        <div className="truncate max-w-[160px]" title={item.objective.name}>
                                          <span className="font-semibold">{item.objective.code}</span> - {item.objective.name}
                                        </div>
                                      ) : '-'}
                                    </td>

                                    <td className="px-3 py-3.5 text-center">
                                      <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold">
                                        {item.weight}%
                                      </span>
                                    </td>

                                    <td className="px-3 py-3.5">
                                      <div className="font-bold text-indigo-600 text-sm">
                                        {formatTargetConfig(
                                          item.target_config,
                                          def.measurement_type,
                                          def.direction,
                                          def.unit_code
                                        )}
                                      </div>
                                    </td>

                                    <td className="px-3 py-3.5 text-slate-600">
                                      <div>{item.scoring_config?.method || 'linear'}</div>
                                      {item.cap_percent && (
                                        <div className="text-[10px] text-slate-400">Max: {item.cap_percent}%</div>
                                      )}
                                    </td>

                                    <td className="px-3 py-3.5 text-center">
                                      {item.is_required ? (
                                        <CheckCircle className="h-4 w-4 text-emerald-500 mx-auto" />
                                      ) : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
