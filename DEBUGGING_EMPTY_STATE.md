# Debugging EmptyChurchState Issue

## Current Situation
The server is not finding the `selectedChurch` cookie, causing EmptyChurchState to display.

**Terminal Shows:**
```
[ServerChurchContext] getSelectedChurch - Cookie exists: false
[ServerChurchContext] ✗ No selectedChurch cookie found
[ServerChurchContext] Returning null - EmptyChurchState will be shown
```

## Step-by-Step Debugging

### Step 1: Check Browser Console
1. Open http://localhost:3001 in your browser
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab
4. Look for logs starting with `[ChurchContext]`

**Expected logs on page load:**
```
[ChurchContext] Loaded church from localStorage: <church-id>
[ChurchContext] Checking server cookie status...
[ChurchContext] Server cookie check: { hasServerChurch: false, ... }
[ChurchContext] Client has church but server doesn't, syncing to server: <church-id>
[ChurchContext] Cookie synced successfully: { success: true, ... }
[ChurchContext] Reloading page to refresh server components with new cookie
```

### Step 2: Check Browser Cookies
1. In DevTools, go to "Application" tab (Chrome) or "Storage" tab (Firefox)
2. Expand "Cookies" in the left sidebar
3. Click on "http://localhost:3001"
4. Look for a cookie named `selectedChurch`

**What to check:**
- Does the cookie exist?
- What is its value? (Should be a JSON string with church data)
- What is its Path? (Should be `/`)
- What is its SameSite? (Should be `Lax`)

### Step 3: Check LocalStorage
1. In DevTools Application/Storage tab
2. Expand "Local Storage"
3. Click on "http://localhost:3001"
4. Look for key `selectedChurch`

**Expected:** Should have a JSON string with church data

### Step 4: Test Cookie Sync Manually
Open the test page I created:
http://localhost:3001/test-cookie-directly.html

This will show:
1. Whether localStorage has the church
2. Whether browser cookie exists
3. Whether server API returns the church
4. Attempt to sync if there's a mismatch

### Step 5: Common Issues and Fixes

#### Issue A: localStorage has church but cookie doesn't exist
**Cause:** Client-side sync not triggering or failing
**Fix:** Clear sessionStorage and refresh:
```javascript
// In browser console:
sessionStorage.clear()
location.reload()
```

#### Issue B: Cookie exists in browser but server doesn't see it
**Cause:** Cookie path/domain mismatch or Next.js caching
**Fix:**
```javascript
// In browser console:
document.cookie = 'selectedChurch=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
localStorage.clear()
sessionStorage.clear()
location.reload()
```

#### Issue C: Infinite reload loop
**Cause:** sessionStorage guard not working
**Fix:** Already implemented - check console for reload messages

#### Issue D: No localStorage at all
**Cause:** First time visit or cleared
**Solution:** Select a church from the church selector dropdown

### Step 6: Force Clean Sync
If nothing works, do a complete reset:

```javascript
// In browser console, run:
(async function() {
    // 1. Clear all client storage
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(";").forEach(c => {
        document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
    });

    // 2. Get available churches
    const churchesRes = await fetch('/api/churches', { credentials: 'include' });
    const churchesData = await churchesRes.json();
    const firstChurch = churchesData.churches?.[0];

    if (firstChurch) {
        // 3. Set in localStorage
        localStorage.setItem('selectedChurch', JSON.stringify(firstChurch));

        // 4. Sync to server
        const syncRes = await fetch('/api/church-selection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ church: firstChurch })
        });
        const syncData = await syncRes.json();
        console.log('Sync result:', syncData);

        // 5. Reload
        location.reload();
    } else {
        console.error('No churches available');
    }
})();
```

## What Logs Should Show

### On First Load (No Cookie)
```
[ChurchContext] Loaded church from localStorage: abc-123
[ChurchContext] Checking server cookie status...
[ChurchContext] Server cookie check: { hasServerChurch: false, hasClientChurch: true }
[ChurchContext] Client has church but server doesn't, syncing to server: abc-123
[ChurchSelection API] POST - Setting cookie: { churchId: 'abc-123', ... }
[ChurchSelection API] POST - Cookie verification: { cookieSet: true, cookieValueMatches: true }
[ChurchSelection API] POST - ✓ Cookie set successfully for church: abc-123
[ChurchContext] Cookie synced successfully: { success: true, ... }
[ChurchContext] Reloading page to refresh server components with new cookie
```

### After Reload (Cookie Exists)
```
[ChurchContext] Loaded church from localStorage: abc-123
[ChurchContext] Checking server cookie status...
[ChurchSelection API] GET - Cookie exists: true
[ChurchSelection API] GET - Returning church: abc-123
[ChurchContext] Server cookie check: { hasServerChurch: true, hasClientChurch: true }
[ChurchContext] Server and client already in sync: abc-123
[ServerChurchContext] getSelectedChurch - Cookie exists: true
[ServerChurchContext] ✓ Returning valid church: abc-123 ChurchName
```

## Next Steps

Please:
1. Open http://localhost:3001 in your browser
2. Open browser DevTools Console
3. Copy and paste all logs starting with `[ChurchContext]` or `[ServerChurchContext]`
4. Share those logs so I can see exactly what's happening
