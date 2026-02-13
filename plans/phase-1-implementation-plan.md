# Phase 1: Foundation & Security - Implementation Plan

## Overview

This phase focuses on establishing the foundational security and infrastructure improvements that will enable all future enhancements to be built on solid ground.

## Tasks to Complete

### 1. Create Zod Validation Schemas ✅

**Files to create in `lib/validations/`:**

#### 1.1 `auth.ts` - Authentication validations

- Login schema (email, password)
- Signup schema (email, password, full_name, confirm_password)
- Password reset schema

#### 1.2 `transactions.ts` - Transaction validations

- Create transaction schema
- Update transaction schema
- Transaction filters schema

#### 1.3 `offerings.ts` - Offering validations

- Create offering schema
- Offering member contribution schema
- Update offering schema

#### 1.4 `bills.ts` - Bill validations

- Create bill schema
- Update bill schema
- Bill payment schema

#### 1.5 `advances.ts` - Advance payment validations

- Create advance schema
- Update advance schema
- Advance repayment schema

#### 1.6 `members.ts` - Member validations

- Create member schema
- Update member schema

#### 1.7 `funds.ts` - Fund validations

- Create fund schema
- Update fund schema
- Fund transfer schema

#### 1.8 `ledger-entries.ts` - Ledger validations

- Create ledger entry schema
- Update ledger entry schema

#### 1.9 `shared.ts` - Common validations

- UUID validation
- Date validation
- Amount validation
- Pagination schema

### 2. Add Error Boundaries ✅

**Files to create:**

- `app/(dashboard)/error.tsx` - Dashboard route group error boundary
- `app/(dashboard)/transactions/error.tsx` - Transactions page error boundary
- `app/(dashboard)/admin/error.tsx` - Admin route group error boundary
- `app/error.tsx` - Root error boundary

### 3. Add Loading States ✅

**Files to create:**

- `app/(dashboard)/loading.tsx` - Dashboard loading skeleton
- `app/(dashboard)/transactions/loading.tsx` - Transactions loading skeleton
- `app/(dashboard)/offerings/loading.tsx` - Offerings loading skeleton
- `app/(dashboard)/bills/loading.tsx` - Bills loading skeleton
- `app/(dashboard)/funds/loading.tsx` - Funds loading skeleton
- `app/(dashboard)/members/loading.tsx` - Members loading skeleton
- `app/(dashboard)/admin/loading.tsx` - Admin loading skeleton

### 4. Add Custom 404 Page ✅

**File to create:**

- `app/not-found.tsx` - Custom 404 page with glass-morphism design

### 5. Fix Reconciliation Pages ✅

**Files to fix:**

- `app/(dashboard)/reconciliation/page.tsx` - Add auth, church context, dynamic export
- `app/(dashboard)/reconciliation/[id]/page.tsx` - Add auth, church context, dynamic export

### 6. Clean Up Dead Code ✅

**Directories to handle:**

- `app/(dashboard)/events/` - Add README.md placeholder or remove
- `app/api/events/` - Add README.md placeholder or remove
- `app/api/event-bills/` - Add README.md placeholder or remove
- `app/api/event-participants/` - Add README.md placeholder or remove
- `app/api/bill-images/` - Add README.md placeholder or remove

**Files to delete:**

- `app/api/advances/route.ts.bak`
- `app/api/debug-offerings/route.ts.bak`
- `app/api/funds/route.ts.bak`
- `app/api/offerings/route.ts.bak`
- `app/api/transactions/route.ts.bak`
- `app/api/document-attachments/route.ts.bak`

### 7. Remove Unused Dependencies & Consolidate Files ✅

**package.json changes:**

- Remove `react-router-dom` dependency

**File movements:**

- Move `src/components/ui/loader.tsx` to `components/ui/loader.tsx` (if not already there)
- Delete empty `src/` directory

**Root cleanup (create `scripts/archive/` and move):**

- `debug_church_filtering.sql`
- `emergency_rls_fix.sql`
- `fix_church_filtering_issue.sql`
- `fix_role_constraint_direct.sql`
- `test_rls_policies.sql`
- `test-cookie-directly.html`
- `test-cookie-flow.ts`
- `test-debug-church-isolation.js`
- `test-document-workflow.js`
- `test-file-upload.js`

**Documentation consolidation (move to `docs/archive/`):**

- `ARCHITECTURAL_FIXES_SUMMARY.md`
- `CHURCH_CONTEXT_INTEGRATION_SUMMARY.md`
- `COOKIE_SYNC_FIX_SUMMARY.md`
- `DEBUGGING_EMPTY_STATE.md`
- `INFINITE_LOOP_FIX_VERIFICATION.md`
- `VERIFICATION_STEPS.md`

**Files to delete:**

- `auth_cookies.txt`
- `cookies.txt`
- `headers.txt`
- `migration_debug.log`
- `push_error.log`
- `push_error_2.log`
- `push_error_final.log`
- `fix_history.cjs`

## Implementation Order

1. ✅ Create validation schemas (1-2 hours)
2. ✅ Add error.tsx boundary files (30 min)
3. ✅ Add loading.tsx skeleton files (1 hour)
4. ✅ Add not-found.tsx custom 404 (20 min)
5. ✅ Fix reconciliation pages auth (30 min)
6. ✅ Clean up .bak files (10 min)
7. ✅ Handle empty directories (20 min)
8. ✅ Remove unused dependencies (5 min)
9. ✅ Consolidate orphaned files (10 min)
10. ✅ Clean up root directory (30 min)
11. ✅ Apply validation to API routes (2-3 hours)
12. ✅ Test all changes (1 hour)

**Total estimated time: 8-10 hours**

## Success Criteria

- [ ] All Zod validation schemas created and exported
- [ ] All dashboard routes have error.tsx boundaries
- [ ] All dashboard routes have loading.tsx skeletons
- [ ] Custom 404 page displays correctly
- [ ] Reconciliation pages require auth and church context
- [ ] No .bak files in codebase
- [ ] Empty directories documented or removed
- [ ] react-router-dom removed from package.json
- [ ] Root directory has <15 files
- [ ] All moved files accessible in new locations
- [ ] `npm run check` passes with no errors
- [ ] Application builds successfully
- [ ] All existing functionality still works
