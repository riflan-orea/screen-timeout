# Android Notifications Troubleshooting Guide

## Common Issues and Solutions

### 1. Notifications Not Showing on Android

#### Check Browser Settings
1. **Chrome Settings**:
   - Open Chrome
   - Go to Settings > Site Settings > Notifications
   - Make sure your site is allowed
   - If blocked, click on your site and select "Allow"

2. **Firefox Settings**:
   - Open Firefox
   - Go to Settings > Privacy & Security > Permissions > Notifications
   - Make sure your site is allowed

#### Check Android System Settings
1. **App Notifications**:
   - Go to Settings > Apps > [Your Browser] > Notifications
   - Make sure notifications are enabled
   - Check if "Show notifications" is turned on

2. **Battery Optimization**:
   - Go to Settings > Battery > Battery optimization
   - Find your browser and set it to "Don't optimize"
   - This prevents the system from killing background processes

3. **Do Not Disturb**:
   - Make sure Do Not Disturb is not enabled
   - Check if notifications are allowed during Do Not Disturb

#### Check PWA Installation
1. **Install as PWA**:
   - Open the app in Chrome
   - Tap the menu (three dots) > "Add to Home screen"
   - This gives the app more permissions and better background support

2. **Launch from Home Screen**:
   - Use the installed PWA instead of opening in browser
   - PWAs have better notification support

### 2. Service Worker Issues

#### Clear Service Worker Cache
1. **In Chrome**:
   - Open Developer Tools (F12)
   - Go to Application > Service Workers
   - Click "Unregister" for any existing service workers
   - Refresh the page

2. **Clear Browser Data**:
   - Go to Settings > Privacy and security > Clear browsing data
   - Select "Cached images and files"
   - Clear data and restart browser

#### Check Service Worker Registration
1. **Open Developer Tools**:
   - Press F12 or right-click > Inspect
   - Go to Console tab
   - Look for service worker registration messages
   - Check for any error messages

2. **Test Service Worker**:
   - Visit `/test-notifications.html` on your site
   - Use the test buttons to check service worker status

### 3. Permission Issues

#### Request Permissions Properly
1. **User Interaction Required**:
   - Permissions must be requested after a user interaction (button click)
   - Cannot be requested automatically on page load

2. **Check Permission Status**:
   - Open browser console
   - Type: `Notification.permission`
   - Should return "granted", "denied", or "default"

#### Handle Permission Denial
1. **If Permission is Denied**:
   - User must manually enable in browser settings
   - Cannot be programmatically changed
   - Show instructions to user

### 4. Android-Specific Issues

#### Chrome on Android
1. **Background Restrictions**:
   - Android may kill background tabs
   - Use PWA installation for better background support
   - Consider using scheduled notifications instead of real-time

2. **Chrome Version**:
   - Ensure Chrome is up to date
   - Older versions may have notification issues

#### Samsung Internet
1. **Additional Settings**:
   - Samsung Internet has additional notification settings
   - Check Samsung Internet settings for notification permissions

### 5. Testing and Debugging

#### Use Test Page
1. **Visit Test Page**:
   - Go to `/test-notifications.html`
   - Use the test buttons to verify each component
   - Check console for error messages

#### Debug Information
1. **Check Debug Panel**:
   - In development mode, check the debug information panel
   - Verify all components are working correctly

#### Console Logs
1. **Monitor Console**:
   - Open browser console
   - Look for notification-related log messages
   - Check for any error messages

### 6. Best Practices for Android

#### PWA Installation
1. **Always recommend PWA installation**:
   - Better background support
   - More reliable notifications
   - Better user experience

#### Fallback Strategies
1. **Multiple Notification Methods**:
   - Try service worker first
   - Fall back to direct notifications
   - Consider alternative methods (email, SMS)

#### User Education
1. **Clear Instructions**:
   - Explain why notifications are needed
   - Provide step-by-step setup instructions
   - Include troubleshooting steps

### 7. Code Fixes Applied

#### Service Worker Updates
- Added Android-specific notification options
- Improved error handling
- Better service worker registration process
- Added vibration patterns for Android

#### Notification Hook Updates
- Added Android device detection
- Improved fallback strategies
- Better error handling
- Android-specific icon handling

#### Manifest Updates
- Added notification permissions
- Added background sync permissions
- Updated cache versions

### 8. Testing Checklist

- [ ] Notifications work in foreground
- [ ] Notifications work in background (PWA)
- [ ] Service worker is registered
- [ ] Permissions are granted
- [ ] No console errors
- [ ] Test on different Android versions
- [ ] Test on different browsers (Chrome, Firefox, Samsung Internet)

### 9. Common Error Messages

#### "Service Worker registration failed"
- Check if HTTPS is enabled
- Clear browser cache
- Check for syntax errors in service worker

#### "Notification permission denied"
- User must manually enable in settings
- Cannot be programmatically changed

#### "Service worker not ready"
- Wait for service worker to activate
- Check registration process
- Clear and re-register service worker

### 10. Additional Resources

- [Chrome PWA Documentation](https://web.dev/progressive-web-apps/)
- [Web Push Notifications](https://web.dev/push-notifications/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Notification API](https://developer.mozilla.org/en-US/docs/Web/API/Notification)

## Background Notifications

### Testing Background Notifications

1. **Use Background Test Page**:
   - Visit `/test-background-notifications.html`
   - Schedule a test notification
   - Close the browser/tab completely
   - Wait for notification to appear

2. **PWA Installation Required**:
   - Background notifications work best when installed as PWA
   - Add to home screen for better reliability
   - Launch from home screen instead of browser

3. **Service Worker Status**:
   - Check if service worker is active
   - Verify background sync is registered
   - Monitor console for any errors

### Background Notification Features

- **Scheduled Notifications**: Work even when app is closed
- **Recurring Notifications**: Automatically schedule next reminder
- **Snooze Function**: 5-minute snooze option in notifications
- **Background Sync**: Multiple fallback mechanisms for reliability

## Quick Fix Commands

If you're still having issues, try these steps in order:

1. **Clear all data and reinstall PWA**:
   - Clear browser data
   - Uninstall PWA
   - Reinstall PWA from home screen

2. **Check all permissions**:
   - Browser notifications
   - Android app notifications
   - Battery optimization

3. **Test with different browsers**:
   - Chrome
   - Firefox
   - Samsung Internet

4. **Use test pages**:
   - Visit `/test-notifications.html` for basic notification tests
   - Visit `/test-background-notifications.html` for background notification tests
   - Run all tests and check console for errors

5. **Verify background functionality**:
   - Schedule a test notification
   - Close the app completely
   - Wait for notification to appear
   - Check if recurring notifications work
