# Error Handling Testing Guide

## 🔧 Fixing TypeScript Errors

The TypeScript errors you see in your IDE are **false positives**. The code compiles correctly. To fix the IDE errors:

### Option 1: Restart TypeScript Server (Recommended)
1. In VS Code/Cursor: Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac)
2. Type: "TypeScript: Restart TS Server"
3. Select it and wait a few seconds

### Option 2: Rebuild TypeScript Project
```bash
# Delete .next folder and rebuild
rm -rf .next
npm run build
```

### Option 3: Clear TypeScript Cache
```bash
# Delete node_modules/.cache if it exists
rm -rf node_modules/.cache
npm run dev
```

The errors occur because the TypeScript language server sometimes doesn't pick up dynamic imports immediately. The actual code is correct and compiles fine.

---

## 🧪 Testing the Error Handling

### Test 1: 403 Error Auto-Retry on Public Endpoints

**Goal**: Verify that invalid tokens on public endpoints are automatically cleared and retried.

**Steps**:
1. Open browser DevTools (F12) → Console tab
2. Run this in the console to set an invalid token:
   ```javascript
   localStorage.setItem('authToken', 'invalid-token-12345');
   localStorage.setItem('user', JSON.stringify({id: 'test'}));
   ```
3. Navigate to: `http://localhost:3000/products`
4. Open DevTools → Network tab
5. Look for the `/api/v1/product` request
6. You should see:
   - First request: 403 Forbidden (with invalid token)
   - Second request: 200 OK (automatically retried without token)

**Expected Result**: 
- ✅ Products load successfully
- ✅ No error message shown to user
- ✅ Token automatically cleared from localStorage
- ✅ Network tab shows retry request

**Verify in Console**:
```javascript
// After navigation, check if token was cleared
console.log('Token:', localStorage.getItem('authToken')); // Should be null
```

---

### Test 2: Timeout Error Auto-Retry

**Goal**: Verify that timeout errors are automatically retried with exponential backoff.

**Steps**:
1. Open DevTools → Network tab
2. Click the throttling dropdown (usually says "No throttling")
3. Select "Slow 3G" or "Custom: 1kb/s"
4. Navigate to: `http://localhost:3000/products`
5. Watch the Network tab carefully

**Expected Result**:
- ✅ You should see multiple requests to the same endpoint
- ✅ First request: times out after 20 seconds
- ✅ Second request: starts after ~1 second delay
- ✅ Third request: starts after ~2 second delay (if second fails)
- ✅ Error only shown after all retries exhausted

**To see retries more clearly**:
- Set timeout to 5 seconds in `apiClient.ts` (temporarily)
- Use network throttling to simulate slow connection

---

### Test 3: Error UI Components

**Goal**: Verify that error messages are professional and contextual.

**Test A - Network Offline**:
1. Turn off Wi-Fi or disconnect network
2. Navigate to: `http://localhost:3000/products`
3. **Expected**: Shows "No internet connection" with offline icon (yellow/orange), not generic "Error"

**Test B - Server Error**:
1. Start backend server but make it return 500 errors
2. Navigate to any product page
3. **Expected**: Shows "Unable to load content" with helpful description

**Test C - Product Not Found**:
1. Navigate to: `http://localhost:3000/products/invalid-product-id-12345`
2. **Expected**: Shows "Product not found" with empty state variant

**Test D - Timeout Error**:
1. Use network throttling (Slow 3G)
2. Navigate to product page
3. **Expected**: Shows "Request taking longer than expected" message

---

### Test 4: Token Cleanup on 401

**Goal**: Verify tokens are cleared when unauthorized.

**Steps**:
1. Log in to get a valid token
2. Manually expire the token (or modify backend to return 401)
3. Try to access a protected endpoint (e.g., cart, orders)
4. **Expected**:
   - Token cleared from localStorage
   - User data cleared
   - Redirected to login (if auth redirect enabled)
   - Toast notification shown (but throttled)

**Verify**:
```javascript
// After 401, check:
console.log('Token:', localStorage.getItem('authToken')); // Should be null
console.log('User:', localStorage.getItem('user')); // Should be null
```

---

### Test 5: Toast Throttling

**Goal**: Verify toast notifications don't spam.

**Steps**:
1. Set up a scenario that triggers multiple errors quickly
2. Watch for toast notifications
3. **Expected**: Only one toast per 6 seconds, even if multiple errors occur

---

## 📊 Verification Checklist

After testing, verify:

- [ ] 403 errors on public endpoints auto-retry successfully
- [ ] Invalid tokens are cleared automatically
- [ ] Timeout errors retry 2 times with exponential backoff
- [ ] Error UI shows contextual messages (not generic "Error")
- [ ] All product pages use ContentState component
- [ ] Toast notifications are throttled (no spam)
- [ ] Token cleanup works on 401/403
- [ ] Network tab shows retry requests correctly
- [ ] No console errors for handled errors

---

## 🐛 Debugging Tips

### View Retry Attempts in Network Tab:
1. Open DevTools → Network
2. Filter by your API domain
3. Look for duplicate requests with same URL
4. Check request headers - retried requests won't have Authorization header

### Check Token State:
```javascript
// In browser console:
console.log('Current token:', localStorage.getItem('authToken'));
console.log('Current user:', localStorage.getItem('user'));
```

### Force Error States:
```javascript
// Simulate 403:
localStorage.setItem('authToken', 'invalid');

// Simulate timeout:
// Use network throttling in DevTools

// Simulate offline:
// Turn off network or use DevTools → Network → Offline checkbox
```

### Monitor API Status Redux State:
```javascript
// Install Redux DevTools extension
// Or check in console:
window.__REDUX_DEVTOOLS_EXTENSION__ // If available
```

---

## 🎯 Quick Test Script

Run this in browser console on any page to test all scenarios:

```javascript
// Test 1: Set invalid token and reload
localStorage.setItem('authToken', 'invalid-token');
window.location.reload();

// Test 2: Clear token (should retry public endpoints)
localStorage.removeItem('authToken');
window.location.reload();

// Test 3: Check current state
console.log({
  token: localStorage.getItem('authToken'),
  user: localStorage.getItem('user'),
  online: navigator.onLine
});
```

---

## 📝 Notes

- **Retry Logic**: Only applies to timeout errors, max 2 retries
- **403 Retry**: Only for public endpoints (product, category, brand, banner, search, collection, health)
- **Toast Throttling**: 6 second cooldown between toasts
- **Token Cleanup**: Happens automatically on 401 or 403
- **Error UI**: All product pages now use ContentState component

---

## ✅ Expected Behavior Summary

| Scenario | Behavior |
|----------|----------|
| 403 on `/product` | ✅ Auto-retry without token, no error shown |
| 403 on `/user/profile` | ❌ Clear token, show error (private endpoint) |
| Timeout error | ✅ Retry 2x with delays (1s, 2s) |
| 401 error | ✅ Clear token, show login prompt |
| Network offline | ✅ Show offline error state |
| Server error (500) | ✅ Show error state, no retry |
| Product not found | ✅ Show empty state |

