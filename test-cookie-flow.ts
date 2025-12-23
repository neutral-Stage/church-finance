/**
 * Test script to verify cookie synchronization flow
 * Run this in browser console to test cookie operations
 */

// Test 1: Check if selectedChurch cookie exists
console.log('=== Test 1: Cookie Existence Check ===');
const cookies = document.cookie.split(';').map(c => c.trim());
const selectedChurchCookie = cookies.find(c => c.startsWith('selectedChurch='));
console.log('selectedChurch cookie exists:', !!selectedChurchCookie);
if (selectedChurchCookie) {
  try {
    const cookieValue = decodeURIComponent(selectedChurchCookie.split('=')[1]);
    const parsed = JSON.parse(cookieValue);
    console.log('Cookie value:', {
      id: parsed.id,
      name: parsed.name,
      type: parsed.type
    });
  } catch (e) {
    console.error('Failed to parse cookie:', e);
  }
}

// Test 2: Check localStorage
console.log('\n=== Test 2: LocalStorage Check ===');
const localStorageChurch = localStorage.getItem('selectedChurch');
console.log('localStorage has selectedChurch:', !!localStorageChurch);
if (localStorageChurch) {
  try {
    const parsed = JSON.parse(localStorageChurch);
    console.log('LocalStorage value:', {
      id: parsed.id,
      name: parsed.name,
      type: parsed.type
    });
  } catch (e) {
    console.error('Failed to parse localStorage:', e);
  }
}

// Test 3: Check sessionStorage sync flag
console.log('\n=== Test 3: SessionStorage Sync Flag ===');
const syncFlag = sessionStorage.getItem('churchSyncCompleted');
console.log('churchSyncCompleted flag:', syncFlag);

// Test 4: Verify server cookie via API
console.log('\n=== Test 4: Server Cookie Check ===');
fetch('/api/church-selection', {
  method: 'GET',
  credentials: 'include',
  cache: 'no-store'
})
  .then(res => res.json())
  .then(data => {
    console.log('Server has church:', !!data.church);
    if (data.church) {
      console.log('Server church:', {
        id: data.church.id,
        name: data.church.name,
        type: data.church.type
      });
    }

    // Compare client and server state
    console.log('\n=== State Comparison ===');
    const localChurch = localStorageChurch ? JSON.parse(localStorageChurch) : null;
    const cookieChurch = selectedChurchCookie ?
      JSON.parse(decodeURIComponent(selectedChurchCookie.split('=')[1])) : null;

    console.log('States match:', {
      localStorageId: localChurch?.id,
      clientCookieId: cookieChurch?.id,
      serverCookieId: data.church?.id,
      allMatch: localChurch?.id === cookieChurch?.id && cookieChurch?.id === data.church?.id
    });
  })
  .catch(err => {
    console.error('Failed to check server cookie:', err);
  });

// Test 5: Manual sync test function
(window as any).testCookieSync = async () => {
  console.log('\n=== Test 5: Manual Cookie Sync ===');
  const localStorageChurch = localStorage.getItem('selectedChurch');

  if (!localStorageChurch) {
    console.error('No church in localStorage to sync');
    return;
  }

  const church = JSON.parse(localStorageChurch);
  console.log('Syncing church to server:', church.id);

  const response = await fetch('/api/church-selection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ church })
  });

  const result = await response.json();
  console.log('Sync result:', result);

  // Verify it was set
  const verifyResponse = await fetch('/api/church-selection', {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store'
  });

  const verifyResult = await verifyResponse.json();
  console.log('Verification - Server has church:', !!verifyResult.church);
  console.log('Verification - Church ID matches:', verifyResult.church?.id === church.id);
};

console.log('\n=== Available Test Functions ===');
console.log('Run testCookieSync() to manually trigger cookie synchronization');
console.log('Example: testCookieSync()');
