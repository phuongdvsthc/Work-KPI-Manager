import { AIPromptDefinition, AIPromptVersion, AIPromptResolutionResult, AIPromptError, PromptErrorCodes } from '../../types/ai_prompt';
import { aiPromptRegistry } from './aiPromptRegistry';

const cache = new Map<string, { definition: AIPromptDefinition; activeVersion: AIPromptVersion; timestamp: number }>();
const CACHE_TTL = 60 * 1000; // 1 minute

export const aiPromptRegistryService = {
  renderPromptTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      if (variables[trimmedKey] === undefined || variables[trimmedKey] === null) {
        throw new AIPromptError(PromptErrorCodes.VARIABLE_MISSING, `Missing required template variable: ${trimmedKey}`);
      }
      return String(variables[trimmedKey]);
    });
  },

  async resolve(supabaseAdmin: any, promptKey: string, variables: Record<string, any> = {}): Promise<AIPromptResolutionResult> {
    const now = Date.now();
    const cached = cache.get(promptKey);

    let definition: any;
    let activeVersion: any;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      definition = cached.definition;
      activeVersion = cached.activeVersion;
    } else {
      // Try DB first
      try {
        const { data: defData, error: defError } = await supabaseAdmin
          .from('ai_prompt_definitions')
          .select('*')
          .eq('prompt_key', promptKey)
          .single();

        if (defData) {
          definition = defData;
          const { data: verData } = await supabaseAdmin
            .from('ai_prompt_versions')
            .select('*')
            .eq('prompt_definition_id', definition.id)
            .eq('status', 'active')
            .single();
            
          if (verData) {
            activeVersion = verData;
          }
        }
      } catch(e) {
        // ignore DB errors
      }

      // Fallback to static registry
      if (!definition || !activeVersion) {
         const staticDef = aiPromptRegistry[promptKey];
         if (!staticDef) {
           throw new AIPromptError(PromptErrorCodes.NOT_FOUND, `Prompt definition not found: ${promptKey}`);
         }
         definition = {
           id: 'static-' + promptKey,
           prompt_key: promptKey,
           enabled: true
         };
         activeVersion = {
           id: 'static-v1-' + promptKey,
           version_number: 1,
           output_mode: 'structured',
           system_prompt: staticDef.systemInstruction,
           user_prompt_template: 'Hãy tóm tắt báo cáo công việc từ ngày {{dateFrom}} đến {{dateTo}}. Số lượng báo cáo: {{reportCount}}.',
           response_schema: staticDef.expectedSchema
         };
      }

      cache.set(promptKey, { definition, activeVersion, timestamp: now });
    }

    if (!definition.enabled) {
      throw new AIPromptError(PromptErrorCodes.DISABLED, `Prompt is disabled: ${promptKey}`);
    }

    const renderedUserPrompt = this.renderPromptTemplate(activeVersion.user_prompt_template || '', variables);
    const renderedSystemPrompt = this.renderPromptTemplate(activeVersion.system_prompt || '', variables);

    return {
      promptKey: definition.prompt_key,
      promptDefinitionId: definition.id,
      promptVersionId: activeVersion.id,
      versionNumber: activeVersion.version_number,
      systemPrompt: renderedSystemPrompt,
      renderedUserPrompt,
      outputMode: activeVersion.output_mode,
      responseSchema: activeVersion.response_schema,
      generationConfig: {
        temperature: activeVersion.default_temperature !== null ? Number(activeVersion.default_temperature) : undefined,
        maxOutputTokens: activeVersion.default_max_output_tokens !== null ? Number(activeVersion.default_max_output_tokens) : undefined
      }
    };
  },

  invalidateCache(promptKey?: string) {
    if (promptKey) {
      cache.delete(promptKey);
    } else {
      cache.clear();
    }
  },
  
  async getDefinition(supabaseAdmin: any, idOrKey: string): Promise<AIPromptDefinition | null> {
      try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
        const col = isUUID ? 'id' : 'prompt_key';
        const { data } = await supabaseAdmin.from('ai_prompt_definitions').select('*').eq(col, idOrKey).single();
        if (data) return data;
      } catch (e) {}
      
      const staticDef = aiPromptRegistry[idOrKey];
      if (staticDef) {
         return {
           id: 'static-' + idOrKey,
           prompt_key: idOrKey,
           name: idOrKey,
           enabled: true
         } as any;
      }
      return null;
  }
};
