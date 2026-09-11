import { AIProviderConfig, AIPublicConfig, AIConfigError } from '../../types/ai';
import { aiCrypto } from './aiCrypto';

export const aiConfigService = {
  _cachedConfig: null as AIProviderConfig | null,
  _lastFetch: 0,
  _cacheTtlMs: 5 * 60 * 1000,

  async resolve(supabaseAdmin: any, forceRefresh = false): Promise<AIProviderConfig> {
    const now = Date.now();
    if (!forceRefresh && this._cachedConfig && (now - this._lastFetch < this._cacheTtlMs)) {
      return this._cachedConfig;
    }

    let dbConfig: Partial<AIProviderConfig> | null = null;
    
    try {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_global_config')
        .single();
        
      if (data && data.setting_value) {
        let raw = data.setting_value;
        if (typeof raw === 'string') {
          try {
            raw = JSON.parse(raw);
          } catch (e) {
            console.error('[aiConfigService] Failed to parse setting_value JSON string', e);
          }
        }
        dbConfig = {
          provider: raw?.provider,
          model: raw?.model,
          enabled: raw?.enabled
        };

        if (raw?.apiKeyEncrypted && raw?.apiKeyIv && raw?.apiKeyAuthTag) {
          try {
            dbConfig.apiKey = aiCrypto.decrypt(raw.apiKeyEncrypted, raw.apiKeyIv, raw.apiKeyAuthTag);
          } catch (e) {
            console.error('[aiConfigService] Failed to decrypt API key from DB');
          }
        }
      }
    } catch (e) {
      // Ignored
    }

    const envConfig = {
      provider: process.env.AI_PROVIDER || 'gemini',
      model: process.env.AI_MODEL || 'gemini-3.8-flash',
      apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || '',
      enabled: process.env.AI_ENABLED === 'true' || process.env.AI_ENABLED === '1' || (process.env.AI_ENABLED !== 'false' && !!(process.env.AI_API_KEY || process.env.GEMINI_API_KEY))
    };

    const resolvedConfig: AIProviderConfig = {
      provider: dbConfig?.provider || envConfig.provider,
      model: dbConfig?.model || envConfig.model,
      apiKey: dbConfig?.apiKey || envConfig.apiKey,
      enabled: dbConfig?.enabled !== undefined ? !!dbConfig.enabled : envConfig.enabled
    };

    this._cachedConfig = resolvedConfig;
    this._lastFetch = now;

    return resolvedConfig;
  },

  invalidateCache() {
    this._cachedConfig = null;
    this._lastFetch = 0;
  },

  async getPublicConfig(supabaseAdmin: any): Promise<AIPublicConfig> {
    const config = await this.resolve(supabaseAdmin);
    
    let masked = undefined;
    if (config.apiKey && config.apiKey.length > 4) {
      const start = config.apiKey.substring(0, 4);
      const end = config.apiKey.substring(config.apiKey.length - 4);
      masked = `${start}${'•'.repeat(Math.min(15, config.apiKey.length - 8))}${end}`;
    }

    return {
      provider: config.provider,
      model: config.model,
      enabled: config.enabled,
      apiKeyConfigured: !!config.apiKey,
      apiKeyMasked: masked
    };
  },

  async saveConfig(supabaseAdmin: any, payload: { enabled: boolean; provider: string; model: string; apiKey?: string }): Promise<void> {
    // 1. Fetch existing setting to preserve secret if omitted
    let existingRaw: any = {};
    try {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_global_config')
        .single();
      if (data && data.setting_value) {
        try {
          existingRaw = typeof data.setting_value === 'string' ? JSON.parse(data.setting_value) : data.setting_value;
        } catch (e) {
          existingRaw = {};
        }
      }
    } catch (e) {
      // No existing config
    }

    const newSettingValue: any = {
      ...existingRaw,
      enabled: payload.enabled,
      provider: payload.provider,
      model: payload.model,
      updated_at: new Date().toISOString()
    };

    // 2. Encrypt and store new key if provided
    if (payload.apiKey !== undefined && payload.apiKey.trim() !== '') {
      const encrypted = aiCrypto.encrypt(payload.apiKey.trim());
      newSettingValue.apiKeyEncrypted = encrypted.encryptedText;
      newSettingValue.apiKeyIv = encrypted.iv;
      newSettingValue.apiKeyAuthTag = encrypted.authTag;
    }

    // 3. Upsert to DB
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        setting_key: 'ai_global_config',
        setting_value: newSettingValue,
        description: 'Global AI Service Configuration'
      });
      
    if (error) throw new Error('Failed to save AI configuration to database');

    this.invalidateCache();
  }
};
