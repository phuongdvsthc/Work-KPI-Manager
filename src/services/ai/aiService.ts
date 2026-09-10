import { AIContextRequest, AIStructuredResponse, AIAuditLog, AIConfigError } from '../../types/ai';
import { createAIProvider, NullAIProvider } from './aiProvider';
import { aiContextService } from './aiContextService';
import { aiPromptRegistry } from './aiPromptRegistry';
import { aiConfigService } from './aiConfigService';

/**
 * Core AI Application Service
 * Orchestrates: Config -> Request -> Context Auth -> Prompt Resolution -> Provider LLM -> Audit Logging
 */
export const aiService = {
  
  
  async execute(supabaseAdmin: any, req: { promptKey: string; variables: Record<string, any>; context: any; userId: string; userRole: string; featureKey: string }) {
    const { aiAuditService } = await import('./aiAuditService');
    const { aiPromptRegistryService } = await import('./aiPromptRegistry.service');
    
    let config;
    try {
      config = await aiConfigService.resolve(supabaseAdmin);
    } catch (e: any) {
      if (e instanceof AIConfigError) {
        // Audit config error
        const audit = await aiAuditService.startRequest(supabaseAdmin, {
          user_id: req.userId,
          feature_key: req.featureKey,
          provider: 'unknown',
          model: 'unknown'
        });
        if (audit) {
           await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
             status: 'failed',
             error_code: e.code,
             error_message_safe: e.message
           });
        }
      }
      throw e;
    }

    if (!config.enabled) {
      const audit = await aiAuditService.startRequest(supabaseAdmin, {
          user_id: req.userId,
          feature_key: req.featureKey,
          provider: config.provider || 'unknown',
          model: config.model || 'unknown'
      });
      if (audit) {
          await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
             status: 'failed',
             error_code: 'AI_DISABLED',
             error_message_safe: 'AI disabled.'
          });
      }
      throw new AIConfigError('AI_DISABLED', 'AI disabled.');
    }
    
    if (!config.apiKey) {
      const audit = await aiAuditService.startRequest(supabaseAdmin, {
          user_id: req.userId,
          feature_key: req.featureKey,
          provider: config.provider || 'unknown',
          model: config.model || 'unknown'
      });
      if (audit) {
          await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
             status: 'failed',
             error_code: 'AI_NOT_CONFIGURED',
             error_message_safe: 'AI unconfigured.'
          });
      }
      throw new AIConfigError('AI_NOT_CONFIGURED', 'AI unconfigured.');
    }

    let promptRes;
    try {
      promptRes = await aiPromptRegistryService.resolve(supabaseAdmin, req.promptKey, req.variables);
    } catch (e: any) {
      const audit = await aiAuditService.startRequest(supabaseAdmin, {
          user_id: req.userId,
          feature_key: req.featureKey,
          prompt_key: req.promptKey,
          provider: config.provider || 'unknown',
          model: config.model || 'unknown'
      });
      if (audit) {
          await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
             status: 'failed',
             error_code: e.code || 'PROMPT_RESOLUTION_FAILED',
             error_message_safe: e.message
          });
      }
      throw e;
    }

    const context_metadata = {
      scope_type: req.context?.scope?.scopeType || 'unknown',
      unit_count: req.context?.scope?.unitIds?.length || 0,
      has_period: !!req.context?.request?.periodId,
      truncated: req.context?.metadata?.truncated || false
    };

    const audit = await aiAuditService.startRequest(supabaseAdmin, {
      user_id: req.userId,
      feature_key: req.featureKey,
      prompt_definition_id: promptRes.promptDefinitionId,
      prompt_version_id: promptRes.promptVersionId,
      prompt_key: promptRes.promptKey,
      prompt_version_number: promptRes.versionNumber,
      provider: config.provider,
      model: config.model,
      context_metadata
    });

    const provider = createAIProvider(config);
    
    let result;
    try {
      if (promptRes.outputMode === 'structured') {
        const { data, usage } = await provider.generateStructured(promptRes.systemPrompt, { ...req.context, userPrompt: promptRes.renderedUserPrompt }, promptRes.responseSchema || {});
        result = data;
        if (audit) {
          await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
            status: 'succeeded',
            ...usage
          });
        }
      } else {
        const { text, usage } = await provider.generateText(promptRes.systemPrompt, { ...req.context, userPrompt: promptRes.renderedUserPrompt });
        result = text;
        if (audit) {
          await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
            status: 'succeeded',
            ...usage
          });
        }
      }
      return result;
    } catch (error: any) {
      if (audit) {
        await aiAuditService.completeRequest(supabaseAdmin, audit.id, {
          status: 'failed',
          error_code: error.code || 'PROVIDER_ERROR',
          error_message_safe: error.message
        });
      }
      throw error;
    }
  },
async generateSummary(supabaseAdmin: any, req: AIContextRequest): Promise<AIStructuredResponse> {
    let configProviderName = 'unknown';
    let configModelName = 'unknown';
    let requestTimestamp = new Date().toISOString();

    try {
      // 1. Resolve Global Configuration
      const config = await aiConfigService.resolve(supabaseAdmin);
      configProviderName = config.provider;
      configModelName = config.model;

      if (!config.enabled) {
        throw new AIConfigError('AI_DISABLED', 'AI features are currently disabled.');
      }
      if (!config.apiKey) {
        throw new AIConfigError('AI_NOT_CONFIGURED', 'AI provider is not configured.');
      }

      // 2. Gather Authorized Context
      const contextData = await aiContextService.buildContext(supabaseAdmin, req);
      requestTimestamp = contextData.request?.generatedAt || requestTimestamp;

      // 3. Resolve Prompt
      const promptDef = aiPromptRegistry['kpi_summary_v1'];
      if (!promptDef) throw new Error('Prompt definition not found.');

      // 4. Provider Call
      const provider = createAIProvider(config);
      
      const { data: result } = await provider.generateStructured<AIStructuredResponse>(
        promptDef.systemInstruction, 
        contextData, 
        promptDef.expectedSchema || {}
      );

      // 5. Async Audit Log (Fire and Forget conceptually)
      this.logAudit({
        user_id: req.userId,
        feature_key: req.featureKey,
        prompt_version: promptDef.version,
        provider: config.provider,
        model: config.model,
        request_timestamp: requestTimestamp,
        response_timestamp: new Date().toISOString(),
        status: 'success'
      });

      return result;
    } catch (error: any) {
      // Handle known config errors safely without crashing core functionality
      if (error instanceof AIConfigError) {
        console.warn(`[aiService] Bypassed AI Generation: ${error.code}`);
        return {
          summary: "AI analysis is currently unavailable.",
          highlights: [],
          risks: [],
          suggested_actions: [],
          evidence: []
        };
      }

      console.error('[aiService] Generation failed:', error);
      
      this.logAudit({
        user_id: req.userId,
        feature_key: req.featureKey,
        prompt_version: 'unknown',
        provider: configProviderName,
        model: configModelName,
        request_timestamp: requestTimestamp,
        response_timestamp: new Date().toISOString(),
        status: 'error',
        error_code: error.message
      });

      throw new Error('AI Service generation failed.');
    }
  },

  logAudit(log: AIAuditLog) {
    // Audit payload intentionally excludes API keys and raw data
    console.log('[AI Audit Log]', JSON.stringify(log));
  }
};
