# Cache Version Management

## Current Version: v7

## Before Each Deployment:

1. **Update Service Worker Cache Version** in `public/sw.js`:
   ```javascript
   const CACHE_NAME = 'droplogik-static-v8'; // Increment this number
   ```

2. **Deploy to AWS**:
   ```bash
   eb deploy
   ```

3. **How it works**:
   - When users visit the site, their browser checks for a new service worker
   - If cache version changed, they see "New version available!" banner
   - Clicking "Update Now" refreshes with the latest version
   - All cached files (JS, CSS, images) are replaced automatically

## Version History:
- v7 - 2026-02-06: Added update notification system + Google Maps URL storage
- v6 - Previous version
