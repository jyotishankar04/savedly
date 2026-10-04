# Schema Refactoring Guide: 1758 Lines → Modular Structure

**Current State:** `src/db/schema.ts` (1758 lines) - too large to maintain  
**Target State:** Modular files in `src/db/schema/` - organized and maintainable

## 📋 Module Breakdown

### Phase 1: Foundation (Already Done)
- ✅ `schema/enums.schema.ts` - All 30+ pgEnum definitions

### Phase 2: Core Authentication (70 lines)
**File:** `src/db/schema/auth.schema.ts`  
**Contains:**
- `users` - Core user table
- `authIdentities` - OAuth connections (Google, GitHub)
- `refreshTokens` - Token management
- `sessions` - User sessions
- `devices` - Device tracking

```typescript
// Copy these from original schema.ts, lines ~300-370
export const users = pgTable("users", {
  // ... fields
});

export const authIdentities = pgTable(/* ... */);
export const refreshTokens = pgTable(/* ... */);
export const sessions = pgTable(/* ... */);
export const devices = pgTable(/* ... */);
```

### Phase 3: RBAC (45 lines)
**File:** `src/db/schema/rbac.schema.ts`  
**Contains:**
- `roles` - Role definitions
- `permissions` - Permission definitions
- `rolePermissions` - M2M junction
- `userRoles` - User ↔ role mapping

### Phase 4: Core Features (150 lines)
**File:** `src/db/schema/memories.schema.ts`  
**Contains:**
- `collections` - User collections
- `memories` - Memory items
- `collectionMemories` - M2M junction
- `tags` - Tag definitions
- `memoryTags` - Memory ↔ tag mapping
- `attachments` - File attachments
- `memoryChunks` - Vector search chunks

### Phase 5: Sharing (80 lines)
**File:** `src/db/schema/sharing.schema.ts`  
**Contains:**
- `shares` - Share instances
- `shareGrants` - Access grants
- `shareAccessRequests` - Access requests
- `shareViews` - View tracking

### Phase 6: Billing (200 lines)
**File:** `src/db/schema/billing.schema.ts`  
**Contains:**
- `plans` - Plan definitions
- `planLimits` - Per-plan limits
- `userPlanAssignments` - Subscriptions
- `transactions` - Payment transactions
- `coupons` - Coupon definitions
- `couponRedemptions` - Redemption tracking
- `referralCodes` - Referral codes
- `referralConversions` - Conversion tracking
- `creditLedger` - Credit history
- `userCreditBalances` - Current credits

### Phase 7: System (100 lines)
**File:** `src/db/schema/system.schema.ts`  
**Contains:**
- `featureFlags` - Global feature toggles
- `announcements` - System announcements
- `notifications` - User notifications
- `adminAuditLogs` - Audit logging

### Phase 8: Onboarding (30 lines)
**File:** `src/db/schema/onboarding.schema.ts`  
**Contains:**
- `userOnboarding` - Onboarding state
- `userSettings` - User preferences
- `calendarConnections` - Calendar integrations
- `calendarEventLinks` - Event mapping

### Phase 9: AI (40 lines)
**File:** `src/db/schema/ai.schema.ts`  
**Contains:**
- `aiUsageLogs` - Usage tracking
- `threads` - Conversation threads

### Phase 10: Email (50 lines)
**File:** `src/db/schema/email.schema.ts`  
**Contains:**
- `emailCampaigns` - Campaign definitions
- `emailMessages` - Individual messages
- `importBatches` - Import batches
- `importItems` - Import items

### Phase 11: Relations (50 lines)
**File:** `src/db/schema/relations.ts`  
**Contains:**
- All `defineRelations()` calls
- Moved from bottom of original file

## 🚀 Step-by-Step Migration

### 1. **Create Enums Module** ✅
```bash
# Already created via script
cat src/db/schema/enums.schema.ts
```

### 2. **Create Each Module** (Repeat for each phase)
- Copy-paste relevant tables from original `schema.ts`
- Remove `export const` from enums (already in enums.schema.ts)
- Add imports for needed enums from `./enums.schema`
- Test that module compiles

**Example for auth.schema.ts:**
```typescript
import {
  boolean,
  index,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { defineRelations } from "drizzle-orm";
import { userStatusEnum, providerEnum } from "./enums.schema";

export const users = pgTable(/* ... */);
export const authIdentities = pgTable(/* ... */);
export const refreshTokens = pgTable(/* ... */);
export const sessions = pgTable(/* ... */);
export const devices = pgTable(/* ... */);

export const usersRelations = defineRelations(/*...*/);
// ... other relations
```

### 3. **Create Index File**
**File:** `src/db/schema/index.ts`
```typescript
// Re-export all tables and enums for backward compatibility
export * from "./enums.schema";
export * from "./auth.schema";
export * from "./rbac.schema";
export * from "./memories.schema";
export * from "./sharing.schema";
export * from "./billing.schema";
export * from "./system.schema";
export * from "./onboarding.schema";
export * from "./ai.schema";
export * from "./email.schema";
export * from "./relations";
```

### 4. **Update Main Schema File**
**File:** `src/db/schema.ts` (simplified)
```typescript
// Just re-export everything from ./schema directory
// This maintains backward compatibility with all existing imports
export * from "./schema";

// Keep the defineRelations calls here or in relations.ts
import { db } from "./index";
// ... rest of relations setup
```

### 5. **Verify No Breaking Changes**
```bash
# These should still work without changes:
import { users, memories, plans } from "@/db/schema";

# TypeScript should find everything
pnpm typecheck
```

## ✅ Verification Checklist

- [ ] Phase 1: enums.schema.ts created and tested
- [ ] Phase 2: auth.schema.ts created and tested  
- [ ] Phase 3: rbac.schema.ts created and tested
- [ ] Phase 4: memories.schema.ts created and tested
- [ ] Phase 5: sharing.schema.ts created and tested
- [ ] Phase 6: billing.schema.ts created and tested
- [ ] Phase 7: system.schema.ts created and tested
- [ ] Phase 8: onboarding.schema.ts created and tested
- [ ] Phase 9: ai.schema.ts created and tested
- [ ] Phase 10: email.schema.ts created and tested
- [ ] Phase 11: relations.ts created and tested
- [ ] schema/index.ts exports everything correctly
- [ ] All `pnpm typecheck` passes
- [ ] No import changes needed in other files
- [ ] All service files still work without modification
- [ ] Delete or archive original schema.ts (keep backup!)

## 📊 Size Reduction

| Before | After |
|--------|-------|
| 1 file (1758 lines) | 11 files (~160 lines avg) |
| Hard to find tables | Organized by feature |
| Merge conflicts likely | Easier to parallelize work |

## 🔗 Backward Compatibility

All existing imports continue to work:
```typescript
// ✅ Still works after refactor
import { users, memories, plans } from "../../db/schema";

// The schema/index.ts re-exports everything
// So all imports remain valid!
```

## 💡 Benefits

✅ **Faster Navigation** - Jump straight to billing.schema.ts for billing tables  
✅ **Clear Ownership** - Each module has one responsibility  
✅ **Easier Review** - Smaller diffs in PRs  
✅ **Better Collaboration** - Multiple people can work on different modules  
✅ **Quicker Search** - Find tables in specific feature module  
✅ **Maintainability** - Future changes to billing don't touch memory code  

## 🆘 Troubleshooting

**Issue:** Import not found after split  
**Solution:** Check `schema/index.ts` re-exports the symbol

**Issue:** TypeScript errors about circular imports  
**Solution:** Enums must be in separate `enums.schema.ts`, imported by all modules

**Issue:** Relations not being applied  
**Solution:** Keep `defineRelations` calls in each module or centralize in `relations.ts`

---

**Next:** Start with Phase 2 and work through systematically. Each phase is independent and can be created in parallel!
