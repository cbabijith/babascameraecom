# Error Handling Testing Guide

This document outlines how to test the improved error handling features.

## Overview of Improvements

1. **403 Error Handling**: Automatically clears invalid tokens for public endpoints and retries without auth
2. **Timeout Handling**: Retries timeout errors with exponential backoff (1s, 2s delays)
3. **Professional Error UI**: Replaced generic "Error" messages with contextual ContentState component

## Testing Scenarios

### 1. Testing 403 Error Handling on Public Endpoints

**Scenario**: Invalid/expired token causes 403 on public endpoints

**Steps to Test**:
1. Open browser DevTools → Application → Local Storage
2. Set an invalid token: `localStorage.setItem('authToken', 'invalid-token-123')`
3. Navigate to `/products` or any product listing page
4. The app should:
   - Automatically clear the invalid token
   - Retry the request without the auth header
   - Successfully load the products without showing an error

**Expected Result**: Products load successfully, no 403 error shown to user

---

### 2. Testing Timeout Handling with Retry

**Scenario**: Slow server response causes timeout

**Steps to Test (Option A - Network Throttling)**:
1. Open browser DevTools → Network tab
2. Set throttling to "Slow 3G" or "Custom: 1kb/s"
3. Navigate to `/products`
4. The app should:
   - Automatically retry the request after 1 second
   - Retry again after 2 seconds if still failing
   - Show error only after retries are exhausted

**Steps to Test (Option B - Mock Server Delay)**:
1. If you have control over backend, temporarily add a 25-second delay to product endpoints
2. Make a request
3. Observe automatic retries in Network tab

**Expected Result**: Request retries automatically (2 attempts), only shows error if all retries fail

---

### 3. Testing Error UI Components

**Scenario**: Various error states display correctly

**Steps to Test**:
1. **Network Error**:
   - Turn off Wi-Fi/Ethernet
   - Navigate to `/products`
   - Should show "No internet connection" with offline variant

2. **Timeout Error**:
   - Use network throttling or slow server
   - Should show "Request taking longer than expected" with timeout variant

3. **Generic Error**:
   - Modify API endpoint to return 500 error
   - Should show "Unable to load content" with error variant

4. **Empty State**:
   - Navigate to a product page with invalid ID
   - Should show "Product not found" with empty variant

**Expected Result**: 
- No generic "Error" heading
- Contextual, helpful messages
- Professional iconography
- Retry and Home buttons where appropriate

---

### 4. Testing Token Cleanup on 401

**Scenario**: Unauthorized access (401 error)

**Steps to Test**:
1. Log in to get a valid token
2. Manually expire/invalidate the token on backend
3. Try to access a protected endpoint
4. The app should:
   - Clear the token from localStorage
   - Clear user data
   - Redirect to login (if auth redirect enabled)

**Expected Result**: Token cleared, user logged out gracefully

---

### 5. Testing Token Cleanup on 403 (Private Endpoints)

**Scenario**: Forbidden access (403 on private endpoints)

**Steps to Test**:
1. Use a token that doesn't have permission for an endpoint
2. Make request to that endpoint
3. The app should:
   - Clear the token from localStorage
   - Show appropriate error message

**Expected Result**: Token cleared, error shown (not retried since it's not a public endpoint)

---

## Manual Testing Checklist

### Browser DevTools Testing

- [ ] **Console**: Check for proper error logging (no stack traces for handled errors)
- [ ] **Network Tab**: Verify retry attempts are visible for timeout errors
- [ ] **Application → Local Storage**: Verify tokens are cleared on 401/403
- [ ] **Network Throttling**: Test timeout retry logic

### Error State Testing

- [ ] Product list page shows ContentState on error
- [ ] Category product list shows ContentState on error
- [ ] Brand product list shows ContentState on error
- [ ] Product details shows ContentState on error/not found
- [ ] Error messages are contextual (not generic "Error")
- [ ] Retry buttons work correctly
- [ ] Home buttons work correctly

### Integration Testing

- [ ] 403 on public endpoint auto-retries successfully
- [ ] Timeout errors retry automatically (2 attempts)
- [ ] Invalid tokens are cleared automatically
- [ ] GlobalNetworkBanner shows appropriate status
- [ ] Toast notifications are throttled (not spamming)

---

## Automated Testing (Future)

Consider adding unit tests for:
- `isPublicEndpoint()` function
- `isTimeoutOrNoResponse()` function
- `isLikelyCORS()` function
- Retry logic with exponential backoff
- Token cleanup logic

---

## Troubleshooting

### If 403 retry doesn't work:
- Check browser console for errors
- Verify the endpoint is in the `publicPaths` array
- Check Network tab to see if retry request is made

### If timeout retry doesn't work:
- Verify `MAX_RETRY_ATTEMPTS` is set to 2
- Check Network tab to see retry requests
- Verify `_retryCount` is being tracked

### If TypeScript errors appear:
- These are likely IDE false positives
- Run `npx tsc --noEmit` to verify actual compilation
- Restart TypeScript server in VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

---

## Test Data

### Invalid Tokens for Testing:
```javascript
// Completely invalid
localStorage.setItem('authToken', 'invalid-token')

// Expired format (if your backend validates JWT expiry)
localStorage.setItem('authToken', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.invalid')
```

### Network Conditions:
- Fast 3G: Good for normal testing
- Slow 3G: Good for timeout testing
- Offline: Good for offline error testing

---

## Notes

- The retry logic only applies to timeout errors, not all errors
- 403 retry only applies to public endpoints (product, category, brand, banner, etc.)
- Private endpoints (user data, orders, etc.) will not retry on 403
- Toast notifications are throttled to prevent spam (6 second cooldown)

