import { getSupabaseClient } from '../lib/supabase';

export interface PublicSettings {
  organizationName: string;
  organizationShortName: string;
  appName: string;
  organizationAddress: string;
  organizationPhone: string;
  organizationEmail: string;
  organizationWebsite: string;
  timezone: string;
  dateFormat: string;
  locale: string;
  logoPath: string;
  logoSmallPath: string;
  faviconPath: string;
  dailyReportDeadline?: string;
  workingDays?: string;
}

export interface AdminSettingsResponse {
  rootOrg: { id: string; name: string; code: string } | null;
  settings: Record<string, string>;
}

export const DEFAULT_PUBLIC_SETTINGS: PublicSettings = {
  organizationName: 'Trường Cao đẳng Du lịch Sài Gòn',
  organizationShortName: 'STHC',
  appName: 'School Task & KPI Management',
  organizationAddress: '',
  organizationPhone: '',
  organizationEmail: '',
  organizationWebsite: '',
  timezone: 'Asia/Ho_Chi_Minh',
  dateFormat: 'dd/MM/yyyy',
  locale: 'vi-VN',
  logoPath: '',
  logoSmallPath: '',
  faviconPath: '',
  dailyReportDeadline: '17:30',
  workingDays: '1,2,3,4,5'
};

export const systemSettingsService = {
  async getPublicSettings(): Promise<PublicSettings> {
    try {
      const response = await fetch('/api/settings/public');
      if (!response.ok) {
        return DEFAULT_PUBLIC_SETTINGS;
      }
      const data = await response.json();
      return {
        ...DEFAULT_PUBLIC_SETTINGS,
        ...(data || {})
      };
    } catch (err) {
      console.warn('[SystemSettings] Could not fetch public settings, using defaults:', err);
      return DEFAULT_PUBLIC_SETTINGS;
    }
  },

  async getAdminSettings(): Promise<AdminSettingsResponse> {
    const token = await this._getAuthToken();
    const response = await fetch('/api/admin/settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi tải cấu hình quản trị');
    }
    return response.json();
  },

  async updateSystemSettings(rootOrgName: string, settings: Record<string, string>): Promise<void> {
    const token = await this._getAuthToken();
    const response = await fetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ rootOrgName, settings })
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi cập nhật cấu hình');
    }
  },

  
  async uploadSystemAsset(type: 'logo' | 'logo-small' | 'favicon', file: File): Promise<{ path: string }> {
    const token = await this._getAuthToken();
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`/api/admin/settings/assets/${type}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi tải lên file');
    }

    return response.json();
  },

  async deleteSystemAsset(type: 'logo' | 'logo-small' | 'favicon'): Promise<void> {
    const token = await this._getAuthToken();
    const response = await fetch(`/api/admin/settings/assets/${type}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Lỗi khi xóa file');
    }
  },

  getSystemAssetPublicUrl(path: string): string {
    if (!path) return '';
    const supabase = getSupabaseClient();
    if (!supabase) return '';
    const { data } = supabase.storage.from('system-assets').getPublicUrl(path);
    return data.publicUrl;
  },

  async _getAuthToken(): Promise<string> {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error('Supabase client chưa sẵn sàng');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) throw new Error('Chưa đăng nhập');
    return session.access_token;
  }
};
