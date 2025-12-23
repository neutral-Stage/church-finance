# Cookie Synchronization Debugging Guide

## Issue Description
Server-rendered pages show `EmptyChurchState` even when a church is selected on the client side due to cookie synchronization issues.

## Root Cause
The previous implementation had an overly aggressive sessionStorage guard that prevented cookie synchronization from happening when:
- User refreshed the page after initial selection
- The `churchSyncCompleted` flag existed in sessionStorage
- But the server cookie had expired or was cleared

## Fix Applied

### 1. ChurchContext.tsx - Removed sessionStorage guard on sync check
**Before**: The sync only happened if `!hasSyncedThisSession`
**After**: The sync always checks server state and syncs when server doesn't have the cookie

Key changes:
- Line 116-122: Always sync to server when client has church but server doesn't
- Removed the `&& !hasSyncedThisSession` condition that was blocking legitimate syncs
- Added comprehensive logging to track sync flow

### 2. Enhanced Logging
Added detailed logging in three places:

**ChurchContext.tsx (Client)**:
- `[ChurchContext]` prefix for all logs
- Logs when loading from localStorage
- Logs server cookie status check
- Logs sync decisions and operations

**server-church-context.ts (Server)**:
- `[ServerChurchContext]` prefix for all logs
- Logs cookie existence and parsing
- Shows first 100 chars of cookie value
- Clear success/failure indicators (✓/✗)

**app/api/church-selection/route.ts (API)**:
- `[ChurchSelection API]` prefix for all logs
- Logs POST requests with church details
- Logs cookie setting operation
- Verifies cookie was set correctly

## Testing the Fix

### Step 1: Clear All State
1. Open browser DevTools → Application tab
2. Clear all cookies for localhost
3. Clear localStorage
4. Clear sessionStorage

### Step 2: Fresh Login
1. Log in to the application
2. Watch console logs for church selection
3. Verify logs show:
   ```
   [ChurchContext] Loaded church from localStorage: <church-id>
   [ChurchContext] Checking server cookie status...
   [ChurchContext] Client has church but server doesn't, syncing to server: <church-id>
   [ChurchSelection API] POST - Request: { userId: ..., churchId: ..., churchName: ... }
   [ChurchSelection API] POST - Cookie verification: { cookieSet: true, cookieValueMatches: true }
   [ChurchContext] Reloading page to refresh server components with new cookie
   ```

### Step 3: After Reload
After the automatic reload, verify:
1. Server logs show:
   ```
   [ServerChurchContext] getSelectedChurch - Cookie exists: true
   [ServerChurchContext] ✓ Returning valid church: <church-id> <church-name>
   ```
2. Page shows data, not EmptyChurchState
3. No additional reloads occur

### Step 4: Manual Refresh
1. Press F5 to refresh the page
2. Verify:
   - No reload occurs (already synced)
   - Server immediately reads the cookie
   - Page shows data immediately

### Step 5: Cookie Expiration Scenario
To test cookie recovery:
1. Open DevTools → Application → Cookies
2. Delete the `selectedChurch` cookie manually
3. Refresh the page (F5)
4. Verify:
   - Client detects missing server cookie
   - Syncs from localStorage to server
   - Page reloads with cookie restored

## Expected Log Flow

### Initial Selection
```
[ChurchContext] Loaded church from localStorage: abc-123
[ChurchContext] Checking server cookie status...
[ChurchContext] Server cookie check: { hasServerChurch: false, hasClientChurch: true, clientChurchId: 'abc-123' }
[ChurchContext] Client has church but server doesn't, syncing to server: abc-123
[ChurchSelection API] POST - Request: { userId: 'user-123', churchId: 'abc-123', churchName: 'Test Church' }
[ChurchSelection API] POST - Setting cookie: { churchId: 'abc-123', cookieLength: 523, cookiePreview: '{"id":"abc-123",...' }
[ChurchSelection API] POST - Cookie verification: { cookieSet: true, cookieValueMatches: true }
[ChurchSelection API] POST - ✓ Cookie set successfully for church: abc-123
[ChurchContext] Cookie synced successfully: { success: true, message: '...', church: {...} }
[ChurchContext] Reloading page to refresh server components with new cookie
```

### After Reload (Server Read)
```
[ServerChurchContext] getSelectedChurch - Cookie exists: true
[ServerChurchContext] Cookie value (first 100 chars): {"id":"abc-123","name":"Test Church"...
[ServerChurchContext] Parsed church data: { id: 'abc-123', name: 'Test Church', type: 'local' }
[ServerChurchContext] ✓ Returning valid church: abc-123 Test Church
```

### Subsequent Refreshes (Already Synced)
```
[ChurchContext] Loaded church from localStorage: abc-123
[ChurchContext] Checking server cookie status...
[ChurchContext] Server cookie check: { hasServerChurch: true, serverChurchId: 'abc-123', hasClientChurch: true, clientChurchId: 'abc-123' }
[ChurchContext] Server and client already in sync: abc-123
```

## Files Modified

1. `/Users/sar333/Documents/sar projects/church-finance/contexts/ChurchContext.tsx`
   - Removed overly aggressive sessionStorage guard
   - Enhanced logging throughout sync process
   - Fixed sync logic to always check server state

2. `/Users/sar333/Documents/sar projects/church-finance/lib/server-church-context.ts`
   - Added detailed logging with clear prefixes
   - Added success/failure indicators (✓/✗)
   - Shows cookie parsing details

3. `/Users/sar333/Documents/sar projects/church-finance/app/api/church-selection/route.ts`
   - Enhanced POST logging
   - Added cookie verification after setting
   - Better error logging

## Common Issues and Solutions

### Issue: Page keeps reloading infinitely
**Cause**: sessionStorage flag isn't being set
**Solution**: Verify line 135 in ChurchContext.tsx sets `sessionStorage.setItem('churchSyncCompleted', 'true')`

### Issue: Cookie not being set
**Cause**: Cookie size might be too large or domain issues
**Solution**: Check logs for `cookieLength` and verify it's under 4KB. Check cookie domain settings.

### Issue: Server still returns null
**Cause**: Cookie path or sameSite mismatch
**Solution**: Verify cookie attributes in route.ts match server expectations

### Issue: Cookie exists but server can't parse it
**Cause**: Invalid JSON or encoding issue
**Solution**: Check `[ServerChurchContext]` logs for parsing errors
