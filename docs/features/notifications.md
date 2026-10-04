# Notifications

This page describes the in-app notification feed. Use this as a reference before adding new notification types or changing feed logic.

The `server/src/modules/notification/notification.service.ts` file manages a straightforward per-user feed (`createNotification`, `listNotifications`, `markRead`, `getUnreadCount`). Other modules write to this feed.

There are two sources of notifications:
- Share invites and access requests (`share.notify.ts`)
- AI-detected events (`memory.notify.ts`)
