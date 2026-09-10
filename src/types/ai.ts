/**
 * AI Service Contracts for Cross-Module Integration
 * Defines the strict boundaries between business data, AI contexts, and external AI providers.
 */

export interface AIContextRequest {
  userId: string;
  userRole: string;
  targetUnitId?: string;
  targetPeriodId?: string;
  targetAssignmentIds?: string[];
  targetTaskIds?: string[];
  featureKey: 'kpi_summary' | 'risk_detection' | 'task_breakdown';
}

export interface AIContextData {
  authorizedScope: {
    unitIds: string[];
    isExecutive: boolean;
  };
  period?: any;
  kpiAssignments?: any[];
  tasks?: any[];
  metrics?: any[];
  timestamp: string;
  userPrompt?: string;
}

export interface AIProviderOptions {
  modelAlias?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIProvider {
  generateText(prompt: string, contextData: AIContextData, options?: AIProviderOptions): Promise<{ text: string, usage?: ProviderUsageMetadata }>;
  generateStructured<T>(prompt: string, contextData: AIContextData, schema: Record<string, any>, options?: AIProviderOptions): Promise<{ data: T, usage?: ProviderUsageMetadata }>;
  healthCheck(): Promise<boolean>;
}

export interface ProviderUsageMetadata {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  finish_reason?: string;
}

export interface AIPromptDefinition {
  key: string;
  version: string;
  purpose: string;
  systemInstruction: string;
  expectedSchema?: Record<string, any>;
}

export interface AIStructuredResponse {
  summary: string;
  highlights: string[];
  risks: {
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
  suggested_actions: {
    title: string;
    assigneeRole?: string;
  }[];
  evidence: {
    type: 'kpi_assignment' | 'task' | 'metric';
    id: string;
    reference_value?: string;
  }[];
}

export interface AIAuditLog {
  user_id: string;
  feature_key: string;
  prompt_version: string;
  provider: string;
  model: string;
  request_timestamp: string;
  response_timestamp: string;
  status: 'success' | 'error' | 'timeout';
  error_code?: string;
}

// 7. Configuration Contracts
export interface AIProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
  enabled: boolean;
}

export interface AIPublicConfig {
  provider: string;
  model: string;
  enabled: boolean;
  apiKeyConfigured: boolean;
  apiKeyMasked?: string;
}

export class AIConfigError extends Error {
  constructor(public code: 'AI_DISABLED' | 'AI_NOT_CONFIGURED', message: string) {
    super(message);
    this.name = 'AIConfigError';
  }
}
