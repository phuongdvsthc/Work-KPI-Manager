import { AIPromptDefinition, AIPromptVersion, AIPromptResolutionResult, AIPromptError, PromptErrorCodes } from '../../types/ai_prompt';

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

    let definition: AIPromptDefinition;
    let activeVersion: AIPromptVersion;

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
      definition = cached.definition;
      activeVersion = cached.activeVersion;
    } else {
      // Fetch from DB
      const { data: defData, error: defError } = await supabaseAdmin
        .from('ai_prompt_definitions')
        .select('*')
        .eq('prompt_key', promptKey)
        .single();

      if (defError || !defData) {
        throw new AIPromptError(PromptErrorCodes.NOT_FOUND, `Prompt definition not found: ${promptKey}`);
      }
      definition = defData as AIPromptDefinition;

      if (!definition.enabled) {
        throw new AIPromptError(PromptErrorCodes.DISABLED, `Prompt is disabled: ${promptKey}`);
      }

      const { data: verData, error: verError } = await supabaseAdmin
        .from('ai_prompt_versions')
        .select('*')
        .eq('prompt_definition_id', definition.id)
        .eq('status', 'active')
        .single();

      if (verError || !verData) {
        throw new AIPromptError(PromptErrorCodes.NOT_ACTIVE, `No active version found for prompt: ${promptKey}`);
      }
      activeVersion = verData as AIPromptVersion;

      // Validate schema if structured
      if (activeVersion.output_mode === 'structured') {
         if (!activeVersion.response_schema || typeof activeVersion.response_schema !== 'object') {
             throw new AIPromptError(PromptErrorCodes.INVALID_SCHEMA, `Invalid response schema for structured output in prompt: ${promptKey}`);
         }
      }

      cache.set(promptKey, { definition, activeVersion, timestamp: now });
    }

    if (!definition.enabled) {
      throw new AIPromptError(PromptErrorCodes.DISABLED, `Prompt is disabled: ${promptKey}`);
    }

    const renderedUserPrompt = this.renderPromptTemplate(activeVersion.user_prompt_template || '', variables);

    return {
      promptKey: definition.prompt_key,
      promptDefinitionId: definition.id,
      promptVersionId: activeVersion.id,
      versionNumber: activeVersion.version_number,
      systemPrompt: activeVersion.system_prompt || '',
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
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrKey);
      const col = isUUID ? 'id' : 'prompt_key';
      const { data } = await supabaseAdmin.from('ai_prompt_definitions').select('*').eq(col, idOrKey).single();
      return data;
  }
};
