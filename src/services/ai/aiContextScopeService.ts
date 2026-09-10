import { AIContextError } from '../../types/ai_errors';
import { getSupabaseClient } from '../supabaseClient';
import { SystemRole } from '../../types/database';

export interface AIContextActor {
  userId: string;
  role: string;
  primaryUnitId?: string;
}

export interface AIContextScope {
  scopeType: 'self' | 'unit_descendants' | 'system' | 'read_only_system';
  unitIds: string[];
  systemWide: boolean;
}

export const aiContextScopeService = {
  async resolve(supabaseAdmin: any, userId: string, requestedUnitId?: string): Promise<{ actor: AIContextActor, scope: AIContextScope }> {
    // 1. Resolve User Profile & Role
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id, 
        system_role,
        organization_members (
          organization_unit_id,
          is_primary,
          member_role
        )
      `)
      .eq('id', userId)
      .single();

    if (error || !profile) {
      throw new AIContextError('AI_CONTEXT_UNAUTHORIZED', 'Could not resolve user profile for AI Context.');
    }

    const sysRole = profile.system_role as SystemRole;
    const primaryMember = profile.organization_members?.find((m: any) => m.is_primary);
    const primaryUnitId = primaryMember?.organization_unit_id;

    const actor: AIContextActor = {
      userId: profile.id,
      role: sysRole,
      primaryUnitId
    };

    let scope: AIContextScope = {
      scopeType: 'self',
      unitIds: [],
      systemWide: false
    };

    // 2. Resolve Scope by Role
    if (sysRole === 'admin') {
      scope.scopeType = 'system';
      scope.systemWide = true;
      if (requestedUnitId) {
        scope.unitIds = [requestedUnitId];
      }
    } else if (sysRole === 'executive') {
      scope.scopeType = 'read_only_system';
      scope.systemWide = true;
      if (requestedUnitId) {
        scope.unitIds = [requestedUnitId];
      }
    } else if (sysRole === 'manager') {
      scope.scopeType = 'unit_descendants';
      if (!primaryUnitId) {
        throw new AIContextError('AI_CONTEXT_INVALID_SCOPE', 'Manager must have a primary unit.');
      }
      
      // Fetch descendants using RPC if requestedUnitId is empty, otherwise check if requestedUnitId is within descendants
      // Delegate to authoritative backend helpers or REST
      // The easiest way to bypass repeating the unit logic is to call a local API or just implement the tree builder.
      // But we have access to supabaseAdmin. Let's do a fast query for all units and build the tree.
      // Delegate to authoritative backend helpers
      const { resolveManagerScopeUnits } = require('../managerScopeService');
      const scopeData = await resolveManagerScopeUnits(supabaseAdmin, userId, sysRole);
      
      let targetUnitIds: string[] = [];
      if (scopeData && scopeData.scopeUnitIds) {
         targetUnitIds = Array.from(scopeData.scopeUnitIds);
      } else {
         throw new AIContextError('AI_CONTEXT_INVALID_SCOPE', 'Manager must have a primary unit.');
      }

      if (requestedUnitId) {
        if (!targetUnitIds.includes(requestedUnitId)) {
          throw new AIContextError('AI_CONTEXT_UNAUTHORIZED', 'Requested unit is outside manager scope.');
        }
        scope.unitIds = [requestedUnitId];
      } else {
        scope.unitIds = targetUnitIds;
      }
    } else if (sysRole === 'staff') {
      scope.scopeType = 'self';
      if (requestedUnitId && requestedUnitId !== primaryUnitId) {
        throw new AIContextError('AI_CONTEXT_UNAUTHORIZED', 'Staff can only access their own unit data.');
      }
      if (primaryUnitId) {
         scope.unitIds = [primaryUnitId];
      }
    }

    return { actor, scope };
  }
};
