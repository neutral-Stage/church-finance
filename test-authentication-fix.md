# Authentication Role Fix Test Plan

## Issues Fixed

### 1. Database Schema Mismatch
- **Problem**: Database allowed `'member'` role but TypeScript expected `'viewer'`
- **Fix**: Created migration `fix_user_role_constraint.sql` to:
  - Update all `'member'` roles to `'viewer'`
  - Update constraint to match TypeScript: `('admin', 'treasurer', 'viewer')`
  - Set default role to `'viewer'`

### 2. Silent Role Assignment Failures
- **Problem**: API route `/api/auth/me` silently defaulted to `"viewer"` when database queries failed
- **Fix**: Updated route to:
  - Return proper error responses (404, 500) instead of silent fallbacks
  - Detect and report duplicate user records
  - Log successful role fetches
  - Provide detailed error logging

### 3. Authentication Context Error Handling
- **Problem**: AuthContext didn't distinguish between different error types
- **Fix**: Enhanced error handling to:
  - Log successful user loads with role information
  - Differentiate between network errors and server errors
  - Provide better debugging information

### 4. Role Fetching During Sign-in
- **Problem**: Sign-in response didn't include role information
- **Fix**: Updated `/api/auth/signin` to:
  - Fetch user role immediately after authentication
  - Include role in sign-in response
  - Provide fallback handling with proper logging

## Test Steps

### 1. Database Migration Test
```sql
-- Run these commands in Supabase SQL editor to verify fixes
SELECT 
  role, 
  COUNT(*) as count
FROM users 
GROUP BY role
ORDER BY role;

-- Should show only 'admin', 'treasurer', 'viewer' roles
```

### 2. API Endpoint Test
```bash
# Test /api/auth/me endpoint
curl -X GET 'http://localhost:3000/api/auth/me' \
  -H 'Cookie: church-auth-minimal=...' \
  -v

# Should return user with proper role, not "viewer" fallback
```

### 3. Application Test
1. Log in as admin user
2. Check browser console for proper role logging
3. Verify admin user shows "admin" role in UI, not "viewer"
4. Check that admin-specific functionality is accessible

### 4. Error Handling Test
1. Temporarily break database connection
2. Verify proper error responses (not silent failures)
3. Check console logs for detailed error information

## Files Modified

1. `/supabase/migrations/fix_user_role_constraint.sql` - Database schema fix
2. `/supabase/migrations/fix_duplicate_users.sql` - Duplicate records cleanup
3. `/app/api/auth/me/route.ts` - Proper error handling
4. `/app/api/auth/signin/route.ts` - Role fetching during sign-in
5. `/contexts/AuthContext.tsx` - Enhanced error logging

## Expected Results

- Admin users should see "admin" role consistently
- No more silent fallbacks to "viewer" role
- Proper error messages for authentication issues
- Clear logging for debugging role assignment problems
- Database constraint matches TypeScript definitions