import { AIConfigError } from '../../types/ai';

export const aiAuditService = {
  async startRequest(supabaseAdmin: any, params: {
    correlation_id?: string;
    user_id: string;
    feature_key: string;
    prompt_definition_id?: string;
    prompt_version_id?: string;
    prompt_key?: string;
    prompt_version_number?: number;
    provider: string;
    model: string;
    context_metadata?: any;
    request_metadata?: any;
  }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('ai_requests')
        .insert({
          ...params,
          status: 'started',
          started_at: new Date().toISOString()
        })
        .select('id, request_id')
        .single();
      
      if (error) {
        console.error('[aiAuditService] Failed to start request:', error);
        return null;
      }
      return data;
    } catch (err) {
      console.error('[aiAuditService] Exception starting request:', err);
      return null;
    }
  },

  async completeRequest(supabaseAdmin: any, id: string, params: {
    status: 'succeeded' | 'failed' | 'cancelled';
    input_tokens?: number;
    output_tokens?: number;
    total_tokens?: number;
    finish_reason?: string;
    error_code?: string;
    error_message_safe?: string;
    retryable?: boolean;
    usage_metadata?: any;
  }) {
    if (!id) return;
    try {
      // Get started_at to compute latency
      const { data: request } = await supabaseAdmin
        .from('ai_requests')
        .select('started_at')
        .eq('id', id)
        .single();

      const completed_at = new Date();
      let latency_ms = null;
      if (request?.started_at) {
        latency_ms = completed_at.getTime() - new Date(request.started_at).getTime();
      }

      const { error } = await supabaseAdmin
        .from('ai_requests')
        .update({
          ...params,
          completed_at: completed_at.toISOString(),
          latency_ms
        })
        .eq('id', id);

      if (error) {
        console.error('[aiAuditService] Failed to complete request:', error);
      }
    } catch (err) {
      console.error('[aiAuditService] Exception completing request:', err);
    }
  }
};
