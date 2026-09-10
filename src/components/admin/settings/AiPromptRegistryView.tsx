import React, { useState, useEffect } from 'react';
import { getSupabaseClient } from '../../../lib/supabase';

interface PromptDefinition {
  id: string;
  prompt_key: string;
  name: string;
  description: string;
  feature_group: string;
  enabled: boolean;
  ai_prompt_versions: any[];
}

export const AiPromptRegistryView: React.FC = () => {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state: 'list', 'edit_def', 'versions', 'edit_version'
  const [viewState, setViewState] = useState<'list' | 'edit_def' | 'versions' | 'edit_version'>('list');
  const [selectedDefId, setSelectedDefId] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (viewState === 'list') {
      fetchPrompts();
    }
  }, [viewState]);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/prompt-registry', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setPrompts(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDefinition = async () => {
    const prompt_key = window.prompt("Enter unique prompt_key (e.g. system.test_echo):");
    if (!prompt_key) return;
    
    try {
      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      const res = await fetch('/api/admin/prompt-registry', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
            prompt_key,
            name: "New Prompt",
            description: "",
            feature_group: "general"
        })
      });
      if (!res.ok) throw new Error(await res.text());
      fetchPrompts();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    try {
      const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
      const res = await fetch(`/api/admin/prompt-registry/${id}/status`, {
        method: 'PUT',
        headers: { 
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ enabled: !current })
      });
      if (!res.ok) throw new Error(await res.text());
      fetchPrompts();
    } catch (err: any) {
      alert("Error: " + err.message);
    }
  };

  const openVersions = (id: string) => {
    setSelectedDefId(id);
    setViewState('versions');
  };

  if (viewState === 'versions' && selectedDefId) {
    return <PromptVersionsView defId={selectedDefId} onBack={() => setViewState('list')} />;
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-medium text-slate-800">Prompt Registry</h3>
        <button onClick={createDefinition} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
          Tạo Prompt
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded mb-4">{error}</div>}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-sm">
              <th className="p-3 text-slate-600 font-semibold">Key</th>
              <th className="p-3 text-slate-600 font-semibold">Tên</th>
              <th className="p-3 text-slate-600 font-semibold">Trạng thái</th>
              <th className="p-3 text-slate-600 font-semibold">Active Version</th>
              <th className="p-3 text-slate-600 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">Đang tải...</td></tr>
            ) : prompts.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-slate-500">Chưa có prompt nào.</td></tr>
            ) : prompts.map(p => {
              const activeV = p.ai_prompt_versions?.find(v => v.status === 'active');
              return (
                <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3 text-sm text-slate-800">{p.prompt_key}</td>
                  <td className="p-3 text-sm text-slate-600">{p.name}</td>
                  <td className="p-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${p.enabled ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>
                      {p.enabled ? 'Đang bật' : 'Đã tắt'}
                    </span>
                  </td>
                  <td className="p-3 text-sm text-slate-600">
                    {activeV ? `v${activeV.version_number}` : <span className="text-slate-400">Không có</span>}
                  </td>
                  <td className="p-3 text-sm text-right space-x-2">
                    <button onClick={() => toggleStatus(p.id, p.enabled)} className="text-slate-500 hover:text-indigo-600">
                      {p.enabled ? 'Tắt' : 'Bật'}
                    </button>
                    <button onClick={() => openVersions(p.id)} className="text-indigo-600 hover:text-indigo-800">
                      Versions
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const PromptVersionsView: React.FC<{ defId: string; onBack: () => void }> = ({ defId, onBack }) => {
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingVersion, setEditingVersion] = useState<any | null>(null);

    useEffect(() => {
        if (!editingVersion) fetchVersions();
    }, [defId, editingVersion]);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
            const res = await fetch(`/api/admin/prompt-registry/${defId}/versions`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await res.text());
            setVersions(await res.json());
        } catch (e: any) {
            alert(e.message);
        } finally {
            setLoading(false);
        }
    };

    const createDraft = async () => {
        try {
            const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
            const res = await fetch(`/api/admin/prompt-registry/${defId}/versions`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await res.text());
            fetchVersions();
        } catch (e: any) {
            alert(e.message);
        }
    };

    const activateVersion = async (vId: string) => {
        if (!window.confirm('Kích hoạt phiên bản này? Phiên bản cũ sẽ bị vô hiệu hóa.')) return;
        try {
            const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
            const res = await fetch(`/api/admin/prompt-registry/versions/${vId}/activate`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(await res.text());
            fetchVersions();
        } catch (e: any) {
            alert(e.message);
        }
    };

    if (editingVersion) {
        return <PromptEditor version={editingVersion} onBack={() => setEditingVersion(null)} />;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">
                    &larr; Quay lại
                </button>
                <button onClick={createDraft} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                    Tạo Bản Nháp
                </button>
            </div>
            
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-sm">
                  <th className="p-3 text-slate-600 font-semibold">Version</th>
                  <th className="p-3 text-slate-600 font-semibold">Status</th>
                  <th className="p-3 text-slate-600 font-semibold">Created At</th>
                  <th className="p-3 text-slate-600 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                  {versions.map(v => (
                      <tr key={v.id} className="border-b border-slate-100">
                          <td className="p-3 text-sm">v{v.version_number}</td>
                          <td className="p-3 text-sm">
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  v.status === 'active' ? 'bg-green-100 text-green-700' : 
                                  v.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                                  {v.status.toUpperCase()}
                              </span>
                          </td>
                          <td className="p-3 text-sm text-slate-500">{new Date(v.created_at).toLocaleString()}</td>
                          <td className="p-3 text-sm text-right space-x-3">
                              {v.status === 'draft' && (
                                  <button onClick={() => activateVersion(v.id)} className="text-green-600 hover:text-green-800">Kích hoạt</button>
                              )}
                              <button onClick={() => setEditingVersion(v)} className="text-indigo-600 hover:text-indigo-800">
                                  {v.status === 'draft' ? 'Chỉnh sửa' : 'Xem'}
                              </button>
                          </td>
                      </tr>
                  ))}
              </tbody>
            </table>
        </div>
    );
};

const PromptEditor: React.FC<{ version: any; onBack: () => void }> = ({ version, onBack }) => {
    const isDraft = version.status === 'draft';
    const [sys, setSys] = useState(version.system_prompt || '');
    const [userTpl, setUserTpl] = useState(version.user_prompt_template || '');
    const [mode, setMode] = useState(version.output_mode || 'text');
    const [schema, setSchema] = useState(version.response_schema ? JSON.stringify(version.response_schema, null, 2) : '');
    const [saving, setSaving] = useState(false);

    const save = async () => {
        setSaving(true);
        try {
            const token = (await getSupabaseClient().auth.getSession()).data.session?.access_token;
            let parsedSchema = null;
            if (schema) {
                try { parsedSchema = JSON.parse(schema); } catch (e) { throw new Error('Schema is invalid JSON'); }
            }
            const res = await fetch(`/api/admin/prompt-registry/versions/${version.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    system_prompt: sys,
                    user_prompt_template: userTpl,
                    output_mode: mode,
                    response_schema: parsedSchema
                })
            });
            if (!res.ok) throw new Error(await res.text());
            alert('Saved');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200 space-y-4">
             <div className="flex justify-between items-center mb-4">
                <button onClick={onBack} className="text-slate-500 hover:text-slate-700 text-sm">
                    &larr; Quay lại
                </button>
                <div className="text-sm font-medium text-slate-700">v{version.version_number} ({version.status})</div>
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">System Prompt</label>
                <textarea 
                    value={sys} onChange={e => setSys(e.target.value)} disabled={!isDraft}
                    className="w-full border border-slate-300 rounded p-2 text-sm font-mono" rows={4} 
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">User Prompt Template</label>
                <textarea 
                    value={userTpl} onChange={e => setUserTpl(e.target.value)} disabled={!isDraft}
                    className="w-full border border-slate-300 rounded p-2 text-sm font-mono" rows={4} 
                />
            </div>

            <div className="flex space-x-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Output Mode</label>
                    <select value={mode} onChange={e => setMode(e.target.value)} disabled={!isDraft} className="w-full border border-slate-300 rounded p-2 text-sm">
                        <option value="text">Text</option>
                        <option value="structured">Structured (JSON)</option>
                    </select>
                </div>
            </div>

            {mode === 'structured' && (
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Response Schema (JSON)</label>
                    <textarea 
                        value={schema} onChange={e => setSchema(e.target.value)} disabled={!isDraft}
                        className="w-full border border-slate-300 rounded p-2 text-sm font-mono" rows={6} 
                    />
                </div>
            )}

            {isDraft && (
                <div className="pt-4 flex justify-end">
                    <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm">
                        {saving ? 'Saving...' : 'Save Draft'}
                    </button>
                </div>
            )}
        </div>
    );
};
