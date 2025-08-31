# Android Background Notifications Troubleshooting Guide

## Overview
This guide helps resolve common issues with background notifications on Android devices. Background notifications are crucial for the Timeout Reminder app to work properly when the app is closed.

## Common Issues and Solutions

### 1. Notifications Not Appearing When App is Closed

**Symptoms:**
- Notifications work when app is open
- No notifications when app is closed or browser is closed
- Timer continues but no reminders appear

**Solutions:**

#### A. Install as PWA (Progressive Web App)
1. Open the app in Chrome/Edge
2. Tap the three-dot menu (⋮)
3. Select "Add to Home screen" or "Install app"
4. Follow the prompts to install
5. Use the installed app instead of the browser version

#### B. Check Browser Settings
1. Go to Chrome Settings > Site Settings > Notifications
2. Find the app domain and ensure it's set to "Allow"
3. Also check "Background sync" is enabled

#### C. Check Android System Settings
1. Go to Android Settings > Apps & notifications
2. Find your browser (Chrome/Edge)
3. Tap "Notifications" and ensure they're enabled
4. Check "Background app refresh" is enabled

### 2. Battery Optimization Issues

**Symptoms:**
- Notifications work initially but stop after some time
- App gets killed in background
- Inconsistent notification delivery

**Solutions:**

#### A. Disable Battery Optimization
1. Go to Android Settings > Battery > Battery optimization
2. Find your browser or the installed PWA
3. Select "Don't optimize" or "Allow background activity"

#### B. Check Adaptive Battery
1. Go to Android Settings > Battery > Adaptive preferences
2. Ensure your browser/PWA is not restricted

#### C. Check Background App Refresh
1. Go to Android Settings > Apps & notifications > [Your Browser]
2. Ensure "Background app refresh" is enabled
3. Check "Allow background activity" is enabled

### 3. Service Worker Issues

**Symptoms:**
- App shows "Background notifications not available"
- Service worker not registering properly
- Inconsistent behavior

**Solutions:**

#### A. Clear Browser Data
1. Go to Chrome Settings > Privacy and security > Clear browsing data
2. Select "Cached images and files"
3. Clear data and restart browser

#### B. Force Service Worker Update
1. Open the app
2. Open Developer Tools (F12)
3. Go to Application tab > Service Workers
4. Click "Unregister" then refresh the page

#### C. Check HTTPS Requirement
- Ensure you're accessing the app via HTTPS
- Service workers require secure connections

### 4. Permission Issues

**Symptoms:**
- "Notifications blocked" message
- Permission request doesn't work
- Notifications appear in system but not as expected

**Solutions:**

#### A. Reset Notification Permissions
1. Go to Chrome Settings > Site Settings > Notifications
2. Find the app and tap "Clear & reset"
3. Reload the app and grant permissions again

#### B. Check System Notification Settings
1. Go to Android Settings > Apps & notifications > [Your Browser]
2. Tap "Notifications"
3. Ensure all notification categories are enabled
4. Check "Show notifications" is enabled

### 5. Specific Browser Issues

#### Chrome
- Ensure Chrome is up to date
- Check "Background sync" is enabled in site settings
- Try disabling Chrome's data saver feature

#### Samsung Internet
- Install as PWA for better background support
- Check "Background processing" is enabled
- Ensure "Auto-start apps" includes your browser

#### Firefox
- Background notifications have limited support
- Consider using Chrome or Edge for better compatibility

## Testing Your Setup

### 1. Use the Test Page
1. Navigate to `/test` in the app
2. Run the background notification tests
3. Check the system status indicators

### 2. Manual Testing
1. Set a short timer (1-2 minutes)
2. Close the app completely
3. Wait for the notification
4. If it doesn't appear, check the troubleshooting steps above

### 3. Check Console Logs
1. Open Developer Tools (F12)
2. Go to Console tab
3. Look for any error messages related to:
   - Service worker registration
   - Notification permissions
   - Background sync

## Advanced Solutions

### 1. Developer Options
If you have developer options enabled:
1. Go to Android Settings > Developer options
2. Ensure "Don't keep activities" is disabled
3. Check "Background process limit" is not too restrictive

### 2. Custom ROMs
Some custom Android ROMs have aggressive battery optimization:
- Check for "Doze mode" settings
- Look for "App standby" settings
- Disable any aggressive battery saving features

### 3. Third-Party Battery Apps
If you use battery optimization apps:
- Add your browser/PWA to the whitelist
- Disable aggressive optimization for the app
- Check for any notification blocking features

## Best Practices

### 1. Always Install as PWA
- Provides better background support
- More reliable notification delivery
- Better integration with Android system

### 2. Keep Browser Updated
- Use the latest version of Chrome/Edge
- Updates often include notification improvements
- Better service worker support

### 3. Regular Testing
- Test notifications weekly
- Check after system updates
- Verify after installing new apps

### 4. Monitor Battery Usage
- Check if the app is using excessive battery
- Balance between reliability and battery life
- Adjust settings as needed

## Getting Help

If you're still experiencing issues:

1. **Check the test page** (`/test`) for detailed diagnostics
2. **Review console logs** for error messages
3. **Try different browsers** (Chrome, Edge, Samsung Internet)
4. **Test on different devices** to isolate the issue
5. **Report the issue** with specific details about your setup

## Technical Details

### How Background Notifications Work
1. Service Worker registers and stays active in background
2. App schedules notifications using IndexedDB for persistence
3. Service Worker checks for scheduled notifications every 30 seconds
4. When time comes, notification is shown via service worker
5. Background sync provides additional reliability

### Android-Specific Considerations
- Android may kill background processes aggressively
- PWA installation provides better background privileges
- Battery optimization can interfere with service workers
- Different Android versions have different behaviors

### Browser Compatibility
- **Chrome**: Best support, recommended
- **Edge**: Good support, based on Chromium
- **Samsung Internet**: Good support, especially on Samsung devices
- **Firefox**: Limited background support
- **Safari**: iOS only, different implementation needed
