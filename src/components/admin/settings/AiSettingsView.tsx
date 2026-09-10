import { AiUsageAuditView } from './AiUsageAuditView';
import { AiPromptRegistryView } from './AiPromptRegistryView';
import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle2, Loader2, Bot, Shield, KeyRound, Network, RefreshCw } from 'lucide-react';
import { getSupabaseClient } from '../../../lib/supabase';

export const AiSettingsView: React.FC = () => {
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'provider' | 'registry' | 'audit'>('provider');
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const [formData, setFormData] = useState({
    enabled: false,
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiKey: '',
  });

  const [initialData, setInitialData] = useState<{ apiKeyConfigured: boolean; apiKeyMasked?: string }>({
    apiKeyConfigured: false,
  });

  const [isChangingKey, setIsChangingKey] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/ai-config', {
        headers: { Authorization: `Bearer ${(await getSupabaseClient().auth.getSession()).data.session?.access_token}` },
      });
      if (!res.ok) throw new Error('Không thể tải cấu hình AI');
      const data = await res.json();
      setFormData({
        enabled: data.enabled || false,
        provider: data.provider || 'gemini',
        model: data.model || 'gemini-2.5-flash',
        apiKey: '',
      });
      setInitialData({
        apiKeyConfigured: data.apiKeyConfigured,
        apiKeyMasked: data.apiKeyMasked,
      });
      setIsChangingKey(!data.apiKeyConfigured);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (formData.enabled) {
      if (!formData.model.trim()) {
        setError('Vui lòng nhập Model AI');
        return;
      }
      if (isChangingKey && !formData.apiKey.trim() && !initialData.apiKeyConfigured) {
        setError('Vui lòng nhập API Key');
        return;
      }
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      const payload: any = {
        enabled: formData.enabled,
        provider: formData.provider,
        model: formData.model,
      };
      
      // Only send API key if they are changing it and provided a non-empty string
      if (isChangingKey && formData.apiKey.trim()) {
        payload.apiKey = formData.apiKey.trim();
      }

      const res = await fetch('/api/admin/ai-config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await getSupabaseClient().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Lỗi khi lưu cấu hình');
      }
      
      const data = await res.json();
      
      setInitialData({
        apiKeyConfigured: data.apiKeyConfigured,
        apiKeyMasked: data.apiKeyMasked,
      });
      setIsChangingKey(false);
      setFormData(prev => ({ ...prev, apiKey: '' }));
      setSuccess('Đã lưu cấu hình thành công');
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setError(null);
    setSuccess(null);
    setTestResult(null);

    try {
      const payload: any = {
        provider: formData.provider,
        model: formData.model,
      };
      
      if (isChangingKey && formData.apiKey.trim()) {
        payload.apiKey = formData.apiKey.trim();
      }

      const res = await fetch('/api/admin/ai-config/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await getSupabaseClient().auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setTestResult({ success: false, message: data.error || 'Lỗi kết nối' });
      } else {
        setTestResult({ success: true, message: data.message || 'Kết nối thành công' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: 'Lỗi khi thực hiện kiểm tra' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex border-b border-slate-200 mb-6">
        <button 
          onClick={() => setActiveTab('provider')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'provider' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}
        >
          Nhà cung cấp AI
        </button>
        <button 
          onClick={() => setActiveTab('registry')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'registry' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}
        >
          Prompt Registry
        </button>
        <button 
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'audit' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-indigo-600 hover:border-indigo-600 border-b-2 border-transparent'}`}
        >
          Usage / Audit
        </button>
      </div>

      {activeTab === 'provider' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2">
                <Bot className="w-6 h-6 text-indigo-600" /> Cấu hình AI
              </h1>
              <p className="text-sm text-slate-500 mt-1">Cấu hình nhà cung cấp AI dùng chung cho toàn bộ hệ thống</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving || testing}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Đang lưu...' : 'Lưu cấu hình'}
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              {success}
            </div>
          )}

          <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-6 space-y-6">
              <label className="flex items-center gap-3 cursor-pointer p-4 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({...formData, enabled: e.target.checked})}
                />
                <div>
                  <div className="font-medium text-slate-900">Bật AI cho hệ thống</div>
                  <div className="text-sm text-slate-500">Cho phép các module sử dụng tính năng phân tích và tổng hợp bằng AI</div>
                </div>
              </label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <Network className="w-4 h-4" /> Nhà cung cấp AI
                  </label>
                  <select
                    value={formData.provider}
                    onChange={e => setFormData({...formData, provider: e.target.value})}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                  >
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Model AI <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="VD: gemini-2.5-flash"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                  <KeyRound className="w-4 h-4" /> API Key <span className="text-red-500">*</span>
                </label>
                
                {isChangingKey ? (
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={formData.apiKey}
                      onChange={e => setFormData({...formData, apiKey: e.target.value})}
                      placeholder="Nhập API Key mới..."
                      autoComplete="new-password"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                    {initialData.apiKeyConfigured && (
                      <button 
                        type="button"
                        onClick={() => {
                          setIsChangingKey(false);
                          setFormData(prev => ({...prev, apiKey: ''}));
                        }}
                        className="px-4 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
                      >
                        Hủy
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg">
                    <Shield className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-emerald-800">Đã cấu hình an toàn</div>
                      <div className="text-xs text-emerald-600 mt-0.5 font-mono">{initialData.apiKeyMasked}</div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setIsChangingKey(true)}
                      className="px-3 py-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors"
                    >
                      Thay đổi
                    </button>
                  </div>
                )}
                <p className="text-xs text-slate-500 mt-2">API Key được mã hóa trước khi lưu và không bao giờ hiển thị ở giao diện.</p>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <div className="flex-1">
                  {testResult && (
                    <div className={`text-sm flex items-center gap-2 ${testResult.success ? 'text-emerald-600' : 'text-red-600'}`}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                      {testResult.message}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testing || saving || (isChangingKey && !formData.apiKey.trim() && !initialData.apiKeyConfigured)}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  Kiểm tra kết nối
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'registry' ? (
        <AiPromptRegistryView />
      ) : (
        <AiUsageAuditView />
      )}
    </div>
  );
};
