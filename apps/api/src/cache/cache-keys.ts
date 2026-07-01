export const CacheKeys = {
  org: (handle: string) => `org:${handle}`,
  orgRepos: (handle: string) => `org:${handle}:repos`,
  repo: (orgHandle: string, repoName: string) => `repo:${orgHandle}:${repoName}`,
  search: (query: string, type?: string) => `search:${type ?? 'all'}:${query.toLowerCase().trim()}`,
  userOrgs: (userId: string) => `user:${userId}:orgs`,
} as const;

// Invalidation patterns — use with deleteByPattern
export const CachePatterns = {
  org: (handle: string) => `org:${handle}*`,      // invalidates org + orgRepos + all repos under it
  allOrgRepos: (handle: string) => `org:${handle}:repos`,
  search: () => `search:*`,
} as const;