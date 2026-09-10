import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';
import { Loader2, Search, Filter, Eye, RefreshCw } from 'lucide-react';

interface AiRequestAudit {
  id: string;
  request_id: string;
  feature_key: string;
  user_id: string;
  prompt_key: string;
  prompt_version_number: number;
  provider: string;
  model: string;
  status: string;
  started_at: string;
  latency_ms: number;
  total_tokens: number;
  error_code: string;
  error_message_safe: string;
  context_metadata: any;
}

export const AiUsageAuditView: React.FC = () => {
  const [requests, setRequests] = useState<AiRequestAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedReq, setSelectedReq] = useState<AiRequestAudit | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/ai-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (selectedReq) {
    return (
      <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
        <button onClick={() => setSelectedReq(null)} className="mb-4 text-sm text-indigo-600 hover:text-indigo-800">
          &larr; Quay lại danh sách
        </button>
        <h3 className="text-lg font-medium text-slate-800 mb-4">Chi tiết AI Request</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500 block">Request ID</span> <span className="font-mono">{selectedReq.request_id}</span></div>
          <div><span className="text-slate-500 block">Feature</span> {selectedReq.feature_key}</div>
          <div><span className="text-slate-500 block">Status</span> 
            <span className={`px-2 py-1 rounded text-xs font-medium ${selectedReq.status === 'succeeded' ? 'bg-green-100 text-green-700' : selectedReq.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
              {selectedReq.status}
            </span>
          </div>
          <div><span className="text-slate-500 block">Time</span> {new Date(selectedReq.started_at).toLocaleString()}</div>
          <div><span className="text-slate-500 block">Provider / Model</span> {selectedReq.provider} / {selectedReq.model}</div>
          <div><span className="text-slate-500 block">Prompt</span> {selectedReq.prompt_key} (v{selectedReq.prompt_version_number})</div>
          <div><span className="text-slate-500 block">Latency</span> {selectedReq.latency_ms} ms</div>
          <div><span className="text-slate-500 block">Tokens (Total)</span> {selectedReq.total_tokens || '-'}</div>
          {selectedReq.error_code && (
            <div className="col-span-2">
               <span className="text-slate-500 block">Error</span> 
               <div className="text-red-600 font-mono text-xs mt-1 bg-red-50 p-2 rounded">{selectedReq.error_code}: {selectedReq.error_message_safe}</div>
            </div>
          )}
          <div className="col-span-2">
            <span className="text-slate-500 block">Context Metadata</span>
            <pre className="bg-slate-50 p-3 rounded text-xs overflow-x-auto border border-slate-200 mt-1">
              {JSON.stringify(selectedReq.context_metadata, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-slate-800">Lịch sử & Lượt dùng AI</h3>
        <button onClick={fetchRequests} className="text-slate-500 hover:text-indigo-600">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
              <th className="p-3 text-slate-600 font-semibold">Thời gian</th>
              <th className="p-3 text-slate-600 font-semibold">Feature</th>
              <th className="p-3 text-slate-600 font-semibold">Prompt</th>
              <th className="p-3 text-slate-600 font-semibold">Model</th>
              <th className="p-3 text-slate-600 font-semibold">Status</th>
              <th className="p-3 text-slate-600 font-semibold text-right">Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-center text-slate-500">Chưa có request nào.</td></tr>
            ) : requests.map(req => (
              <tr key={req.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3 text-sm text-slate-600">{new Date(req.started_at).toLocaleString()}</td>
                <td className="p-3 text-sm text-slate-800 font-medium">{req.feature_key}</td>
                <td className="p-3 text-sm text-slate-600">{req.prompt_key} <span className="text-slate-400">v{req.prompt_version_number}</span></td>
                <td className="p-3 text-sm text-slate-600">{req.provider} / {req.model}</td>
                <td className="p-3 text-sm">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${req.status === 'succeeded' ? 'bg-green-100 text-green-700' : req.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                    {req.status}
                  </span>
                </td>
                <td className="p-3 text-sm text-right">
                  <button onClick={() => setSelectedReq(req)} className="text-indigo-600 hover:text-indigo-800">
                    <Eye className="w-4 h-4 inline" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
