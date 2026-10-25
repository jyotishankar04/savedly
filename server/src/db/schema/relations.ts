import { defineRelations } from "drizzle-orm";

export const  relations = defineRelations({
  users: {
    authIdentities: { relation: "hasMany", foreignKey: "userId" },
    refreshTokens: { relation: "hasMany", foreignKey: "userId" },
    sessions: { relation: "hasMany", foreignKey: "userId" },
    devices: { relation: "hasMany", foreignKey: "userId" },
    userRoles: { relation: "hasMany", foreignKey: "userId" },
    aiUsageLogs: { relation: "hasMany", foreignKey: "userId" },
    collections: { relation: "hasMany", foreignKey: "userId" },
    planAssignments: { relation: "hasMany", foreignKey: "userId" },
    aiCredentials: { relation: "hasMany", foreignKey: "userId" },
    aiRoleAssignments: { relation: "hasMany", foreignKey: "userId" },
    shares: { relation: "hasMany", foreignKey: "ownerId" },
    shareGrants: { relation: "hasMany", foreignKey: "userId" },
    notifications: { relation: "hasMany", foreignKey: "userId" },
    emailCampaigns: { relation: "hasMany", foreignKey: "createdBy" },
    emailMessages: { relation: "hasMany", foreignKey: "recipientUserId" },
    importBatches: { relation: "hasMany", foreignKey: "userId" },
    calendarConnections: { relation: "hasMany", foreignKey: "userId" },
    calendarEventLinks: { relation: "hasMany", foreignKey: "userId" },
  },
  collections: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  shares: {
    owner: { relation: "belongsTo", foreignKey: "ownerId" },
    grants: { relation: "hasMany", foreignKey: "shareId" },
    accessRequests: { relation: "hasMany", foreignKey: "shareId" },
    views: { relation: "hasMany", foreignKey: "shareId" },
  },
  shareGrants: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    user: { relation: "belongsTo", foreignKey: "userId" },
    invitedByUser: { relation: "belongsTo", foreignKey: "invitedBy" },
  },
  shareAccessRequests: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    requester: { relation: "belongsTo", foreignKey: "requesterUserId" },
    decidedByUser: { relation: "belongsTo", foreignKey: "decidedBy" },
  },
  shareViews: {
    share: { relation: "belongsTo", foreignKey: "shareId" },
    viewer: { relation: "belongsTo", foreignKey: "viewerUserId" },
  },
  notifications: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  plans: {
    limits: { relation: "hasMany", foreignKey: "planId" },
    assignments: { relation: "hasMany", foreignKey: "planId" },
  },
  planLimits: {
    plan: { relation: "belongsTo", foreignKey: "planId" },
  },
  userPlanAssignments: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    plan: { relation: "belongsTo", foreignKey: "planId" },
    assignedByUser: { relation: "belongsTo", foreignKey: "assignedBy" },
  },
  featureFlags: {
    updatedByUser: { relation: "belongsTo", foreignKey: "updatedBy" },
  },
  announcements: {
    createdByUser: { relation: "belongsTo", foreignKey: "createdBy" },
  },
  reports: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  aiUsageLogs: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    thread: { relation: "belongsTo", foreignKey: "threadId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  adminAuditLogs: {
    adminUser: { relation: "belongsTo", foreignKey: "adminUserId" },
  },
  emailCampaigns: {
    createdByUser: { relation: "belongsTo", foreignKey: "createdBy" },
    messages: { relation: "hasMany", foreignKey: "campaignId" },
  },
  emailMessages: {
    campaign: { relation: "belongsTo", foreignKey: "campaignId" },
    recipient: { relation: "belongsTo", foreignKey: "recipientUserId" },
  },
  importBatches: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    items: { relation: "hasMany", foreignKey: "batchId" },
  },
  importItems: {
    batch: { relation: "belongsTo", foreignKey: "batchId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  roles: {
    userRoles: { relation: "hasMany", foreignKey: "roleId" },
    rolePermissions: { relation: "hasMany", foreignKey: "roleId" },
  },
  permissions: {
    rolePermissions: { relation: "hasMany", foreignKey: "permissionId" },
  },
  authIdentities: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  calendarConnections: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  calendarEventLinks: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    memory: { relation: "belongsTo", foreignKey: "memoryId" },
  },
  refreshTokens:
  {
    user: { relation: "belongsTo", foreignKey: "userId" },
    sessions: { relation: "hasMany", foreignKey: "refreshTokenId" },
  },
  sessions: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    refreshToken: { relation: "belongsTo", foreignKey: "refreshTokenId" },
  },
  devices: {
    user: { relation: "belongsTo", foreignKey: "userId" },
  },
  userRoles: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    role: { relation: "belongsTo", foreignKey: "roleId" },
  },
  rolePermissions: {
    role: { relation: "belongsTo", foreignKey: "roleId" },
    permission: { relation: "belongsTo", foreignKey: "permissionId" },
  },
  aiCredentials: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    roleAssignments: { relation: "hasMany", foreignKey: "credentialId" },
  },
  aiRoleAssignments: {
    user: { relation: "belongsTo", foreignKey: "userId" },
    credential: { relation: "belongsTo", foreignKey: "credentialId" },
  },
});
