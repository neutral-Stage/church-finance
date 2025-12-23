# Cookie Sync Fix - Verification Steps

## Quick Verification Checklist

Run through these steps to verify the fix is working:

### 1. Clear All State (Start Fresh)
```javascript
// Run in browser console
localStorage.clear();
sessionStorage.clear();
// Then manually delete all cookies in DevTools → Application → Cookies
```

### 2. Login and Initial Church Selection
1. Log in to the application
2. Open browser console
3. Look for these log messages:
   ```
   [ChurchContext] Loaded church from localStorage: <church-id>
   [ChurchContext] Checking server cookie status...
   [ChurchContext] Client has church but server doesn't, syncing to server: <church-id>
   [ChurchSelection API] POST - Setting cookie: ...
   [ChurchContext] Reloading page to refresh server components with new cookie
   ```
4. After automatic reload, look for:
   ```
   [ServerChurchContext] getSelectedChurch - Cookie exists: true
   [ServerChurchContext] ✓ Returning valid church: <church-id> <church-name>
   ```
5. ✅ Verify page shows data (not EmptyChurchState)

### 3. Page Refresh Test
1. Press F5 to refresh the page
2. Look for logs:
   ```
   [ChurchContext] Server and client already in sync: <church-id>
   ```
3. ✅ Verify NO page reload occurs
4. ✅ Verify data displays immediately

### 4. Cookie Expiration Recovery Test
1. Open DevTools → Application → Cookies
2. Find and delete the `selectedChurch` cookie
3. Refresh the page (F5)
4. Look for logs showing re-sync:
   ```
   [ChurchContext] Client has church but server doesn't, syncing to server
   [ChurchContext] Reloading page to refresh server components with new cookie
   ```
5. ✅ Verify page reloads and data displays

### 5. Manual Church Switch Test
1. Click the church selector in the header
2. Select a different church
3. Look for logs:
   ```
   [ChurchContext] Changing church from <old-id> to <new-id>
   [ChurchSelection API] POST - Cookie set successfully
   [ChurchContext] Reloading page with new church context
   ```
4. ✅ Verify page reloads
5. ✅ Verify data for new church displays

### 6. Server Cookie Verification
Run this in browser console to verify cookie state:
```javascript
// Check cookie exists
const cookies = document.cookie.split(';');
const churchCookie = cookies.find(c => c.trim().startsWith('selectedChurch='));
console.log('Cookie exists:', !!churchCookie);

// Verify server can read it
fetch('/api/church-selection', {
  method: 'GET',
  credentials: 'include',
  cache: 'no-store'
})
.then(r => r.json())
.then(data => {
  console.log('Server has church:', !!data.church);
  console.log('Server church ID:', data.church?.id);
  console.log('Server church name:', data.church?.name);
});
```

## Expected Results Summary

| Test | Expected Behavior | Log Indicators |
|------|------------------|----------------|
| Fresh Login | Auto-sync → Reload → Data shows | `[ChurchContext] Reloading page...` |
| Page Refresh | No reload, immediate data | `[ChurchContext] Server and client already in sync` |
| Cookie Deleted | Auto-recover → Reload → Data shows | `[ChurchContext] Client has church but server doesn't` |
| Church Switch | Sync → Reload → New data shows | `[ChurchContext] Changing church from...` |
| Server Read | Cookie exists and valid | `[ServerChurchContext] ✓ Returning valid church` |

## Common Issues and Debugging

### Issue: Infinite Reload Loop
**Symptom:** Page keeps reloading continuously

**Debug:**
```javascript
// Check if sync flag is being set
console.log('Sync flag:', sessionStorage.getItem('churchSyncCompleted'));

// Check if cookie is actually being set
fetch('/api/church-selection', { credentials: 'include', cache: 'no-store' })
  .then(r => r.json())
  .then(d => console.log('Server has church:', d.church?.id));
```

**Fix:**
- Verify `sessionStorage.setItem('churchSyncCompleted', 'true')` is being called
- Check network tab for POST `/api/church-selection` success

### Issue: EmptyChurchState Still Showing
**Symptom:** Page shows EmptyChurchState even after church selection

**Debug:**
1. Check browser console for logs with `[ServerChurchContext]` prefix
2. Run cookie verification script above
3. Check Network tab for `/api/church-selection` response

**Common Causes:**
- Cookie not being set (check POST response)
- Cookie being set with wrong domain/path
- Server not reading cookie (check server logs)
- Cookie value is invalid JSON

**Fix:**
```javascript
// Manually trigger sync
const church = JSON.parse(localStorage.getItem('selectedChurch'));
fetch('/api/church-selection', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ church })
}).then(r => r.json()).then(console.log);
```

### Issue: Cookie Exists But Server Returns Null
**Symptom:** Cookie visible in DevTools but server logs show null

**Debug:**
1. Check server logs for `[ServerChurchContext]` errors
2. Verify cookie name is exactly `selectedChurch`
3. Check cookie value is valid JSON

**Fix:**
- Check `cookies().get('selectedChurch')` in server-church-context.ts
- Verify cookie sameSite and path settings match

## Log Patterns to Watch For

### ✅ Healthy Flow
```
[ChurchContext] Loaded church from localStorage: abc-123
[ChurchContext] Checking server cookie status...
[ChurchContext] Server cookie check: { hasServerChurch: false, ... }
[ChurchContext] Client has church but server doesn't, syncing to server: abc-123
[ChurchSelection API] POST - Request: { userId: '...', churchId: 'abc-123', ... }
[ChurchSelection API] POST - Cookie verification: { cookieSet: true, cookieValueMatches: true }
[ChurchContext] Cookie synced successfully
[ChurchContext] Reloading page to refresh server components with new cookie
--- PAGE RELOADS ---
[ServerChurchContext] getSelectedChurch - Cookie exists: true
[ServerChurchContext] ✓ Returning valid church: abc-123 Test Church
```

### ❌ Problem Indicators
```
[ServerChurchContext] ✗ No selectedChurch cookie found
[ChurchContext] Failed to sync cookie to server: 403
[ChurchSelection API] POST - Access denied
[ChurchContext] Error syncing with server church selection: ...
```

## Quick Test Commands

Copy/paste these into browser console:

```javascript
// 1. Check all state
console.log({
  localStorage: localStorage.getItem('selectedChurch'),
  sessionStorage: sessionStorage.getItem('churchSyncCompleted'),
  cookies: document.cookie.includes('selectedChurch')
});

// 2. Verify server state
fetch('/api/church-selection', { credentials: 'include', cache: 'no-store' })
  .then(r => r.json())
  .then(d => console.log('Server:', d));

// 3. Force sync
const church = JSON.parse(localStorage.getItem('selectedChurch') || 'null');
if (church) {
  fetch('/api/church-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ church })
  }).then(r => r.json()).then(console.log);
}

// 4. Clear everything and start fresh
localStorage.clear();
sessionStorage.clear();
document.cookie.split(';').forEach(c => {
  document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
});
console.log('Cleared all state');
```

## Files to Monitor

When debugging, keep an eye on:

1. **Browser Console** - Client-side logs with `[ChurchContext]` prefix
2. **Server Logs** - Server-side logs with `[ServerChurchContext]` and `[ChurchSelection API]` prefixes
3. **Network Tab** - `/api/church-selection` GET/POST requests
4. **Application Tab** - Cookies, localStorage, sessionStorage values

## Success Criteria

The fix is working correctly when:

- ✅ Fresh login → Data shows (no EmptyChurchState)
- ✅ Page refresh → No unnecessary reloads
- ✅ Cookie expiration → Auto-recovers
- ✅ Manual switch → Syncs and reloads
- ✅ Server logs show cookie exists and is valid
- ✅ Only ONE reload happens per sync operation
- ✅ EmptyChurchState ONLY shows when no churches available
