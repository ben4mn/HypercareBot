# Production Deployment Guide

## Current Issue Analysis

The deployment is working locally but not on your domain `hypercare.zyroi.com`. Here's the diagnosis:

### Issue: Domain Access
- **Working**: `http://your-server-ip:3051` (direct access to frontend container)
- **Not Working**: `http://hypercare.zyroi.com` (should go through nginx on port 80)

### Root Cause
The nginx container failed to start due to port 443 conflict, so nginx proxy is not running.

## Quick Fix

1. **Rebuild with fixed configuration:**
```bash
./deploy-prod.sh
```

2. **Verify nginx is running:**
```bash
docker-compose -f docker-compose.prod.yml ps nginx
```

3. **If nginx is running, test access:**
   - ✅ `http://hypercare.zyroi.com` should work (via nginx proxy)
   - ✅ `http://your-server-ip` should work (via nginx proxy) 
   - ✅ `http://your-server-ip:3051` still works (direct frontend access)

## DNS Configuration Required

Make sure your domain DNS is configured:
```
A record: hypercare.zyroi.com → your-server-ip
```

## Port Access Pattern

- **Port 80** (nginx): Routes to frontend + `/api` routes to backend
- **Port 3050** (backend): Direct backend API access
- **Port 3051** (frontend): Direct frontend access (development)

## Troubleshooting

### Check nginx logs:
```bash
docker-compose -f docker-compose.prod.yml logs nginx
```

### Check if nginx is properly routing:
```bash
curl -H "Host: hypercare.zyroi.com" http://localhost/health
```

### Manual nginx restart:
```bash
docker-compose -f docker-compose.prod.yml restart nginx
```

## Expected URLs After Fix

- ✅ `http://hypercare.zyroi.com` → Main app via nginx
- ✅ `http://hypercare.zyroi.com/api/health` → Backend health via nginx
- ✅ `http://hypercare.zyroi.com/admin` → Admin interface via nginx