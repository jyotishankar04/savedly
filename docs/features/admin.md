# Admin

This page describes the administrative tools and modules. Use this as a reference before modifying system-wide configuration or audit logs.

The `server/src/modules/admin/` directory covers:
- User management
- Analytics
- Audit logging
- Plan configuration (a single unlimited plan; enforcement code was removed rather than left dormant)
- Feature flags
- The bulk email composer

Every mutating administrative action must call `logAdminAction` (`shared/utils/audit-log.ts`) to maintain the audit log.
