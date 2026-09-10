const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Add the helper function
const helperFn = `
async function applyAdvancedFiltersAndBatchResolve(supabaseAdmin: any, assignments: any[], filters: any) {
  let filtered = [...assignments];
  const { reviewStatus, completionStatus } = filters;

  const allIds = filtered.map(a => a.id);
  const revMap = new Map<string, any>();
  if (allIds.length > 0) {
    try {
      // Chunking to be safe if large, but we'll do 1 query for now
      const { data: reviews } = await supabaseAdmin
        .from('kpi_assignment_reviews')
        .select('id, assignment_id, status, official_total_score')
        .in('assignment_id', allIds);
      (reviews || []).forEach((r: any) => revMap.set(r.assignment_id, r));
    } catch (e) {
      // Fallback
    }
  }

  if (reviewStatus && reviewStatus !== 'all') {
    filtered = filtered.filter(a => {
      const isLocked = a.status === 'locked';
      const rev = revMap.get(a.id);
      let rs = rev?.status || a.config?.review?.status || null;
      if (!rs && isLocked) rs = 'approved';
      if (!rs) rs = 'not_started';
      return rs === reviewStatus;
    });
  }

  const liveAssignments = filtered.filter(a => a.status !== 'locked');
  const officialAssignments = filtered.filter(a => a.status === 'locked');
  
  const liveScoreMap = await resolveLiveScoresBatch(supabaseAdmin, liveAssignments);
  const officialScoreMap = await resolveOfficialScoresBatch(supabaseAdmin, officialAssignments);

  if (completionStatus && completionStatus !== 'all') {
    filtered = filtered.filter(a => {
      const isLocked = a.status === 'locked';
      let resStatus = 'not_scored';
      if (isLocked) {
        const off = officialScoreMap.get(a.id);
        if (off && off.status) resStatus = off.status;
      } else {
        const live = liveScoreMap.get(a.id);
        if (live && live.total_score !== null) {
           resStatus = live.status === 'partial' ? 'partial' : 'complete';
        }
      }
      if (completionStatus === 'unscored' && resStatus === 'not_scored') return true;
      return resStatus === completionStatus;
    });
  }

  return { finalAssignments: filtered, liveScoreMap, officialScoreMap, revMap };
}
`;

if (!content.includes('applyAdvancedFiltersAndBatchResolve')) {
    content = content.replace(/async function resolveOfficialScoresBatch/g, helperFn + '\nasync function resolveOfficialScoresBatch');
}

fs.writeFileSync('server.ts', content);
