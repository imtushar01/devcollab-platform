export const QUEUES = {
  SEARCH_INDEX: 'search-index',
  NOTIFICATIONS: 'notifications',
  ANALYTICS: 'analytics',
} as const;

export const JOB_NAMES = {
  INDEX_REPOSITORY: 'index-repository',
  INDEX_ORGANIZATION: 'index-organization',
  SEND_NOTIFICATION: 'send-notification',
  TRACK_EVENT: 'track-event',
} as const;