import { Request, Response } from 'express';

export function registerAiAuditRoutes(app: any, authenticateAdmin: any, getSupabaseAdminClient: any) {
  app.get('/api/admin/ai-requests', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const supabaseAdmin = getSupabaseAdminClient(req);
      const { data, error } = await supabaseAdmin
        .from('ai_requests')
        .select('*')
        .order('started_at', { ascending: false })
        .limit(100);
        
      if (error) throw error;
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
