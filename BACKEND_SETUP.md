# Backend Setup Guide

## The Problem

The `TypeError: Failed to fetch` error occurs when the frontend React application cannot connect to the backend SamplePacker gateway server. This typically happens when:

1. The backend gateway server is not running
2. The backend is running on a different port than expected
3. Network connectivity issues between frontend and backend

## Solution Applied

The following improvements have been implemented to handle this error gracefully:

### 1. Enhanced API Client (`samplePackerAPI.ts`)
- **Automatic retry logic** with exponential backoff (3 attempts by default)
- **Request timeouts** (10 seconds) to prevent hanging requests
- **Clear error messages** that explain what went wrong
- **Health status tracking** to detect backend availability

### 2. Improved Hook (`useSamplePackGenerator.ts`)
- **Backend health check** on component mount
- **Exponential backoff for polling** to reduce server load during issues
- **Consecutive error tracking** - stops polling after 3 failures
- **Connection retry method** to check backend status
- **Better error state management** with user-friendly messages

## Starting the Backend

The backend consists of two Docker services that need to be running:

### Option 1: Start with Docker Compose (Recommended)

Navigate to the samplepacker.ai directory and run:

```powershell
cd t:\automatic1111\samplepacker.ai
docker-compose up -d
```

This will start:
- **ComfyUI** on port 8188 (AI generation engine)
- **Gateway** on port 3003 (API server)

### Option 2: Check if Services are Running

```powershell
docker ps
```

You should see:
- `comfy` container on port 8188
- `gateway` container on port 3003

### Option 3: View Logs

If services are running but not responding:

```powershell
# Check gateway logs
docker logs gateway -f

# Check ComfyUI logs
docker logs comfy -f
```

## Verifying the Backend

Once the backend is running, verify it's accessible:

### 1. Check Health Endpoint

Open your browser or use curl:
```
http://localhost:3003/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-10T...",
  "uptime": 123
}
```

### 2. Frontend Integration

The Vite dev server (port 5173) automatically proxies `/api/*` requests to `http://localhost:3003`, so:
- Frontend requests to `/api/health` → Backend `http://localhost:3003/health`
- Frontend requests to `/api/packs` → Backend `http://localhost:3003/packs`

## Development Workflow

1. **Start Backend First**:
   ```powershell
   cd t:\automatic1111\samplepacker.ai
   docker-compose up -d
   ```

2. **Wait for Services to be Healthy** (can take 2-3 minutes):
   ```powershell
   docker ps  # Check both services show "healthy" status
   ```

3. **Start Frontend**:
   ```powershell
   cd t:\BITCOINAUDIO.AI\inspira
   npm run dev
   ```

4. **Access Application**:
   ```
   http://localhost:5173
   ```

## Troubleshooting

### "Cannot connect to backend server" Error

**Symptom**: Error message appears immediately when trying to generate

**Solutions**:
1. Verify gateway is running: `docker ps | findstr gateway`
2. Check gateway logs: `docker logs gateway`
3. Restart gateway: `docker restart gateway`
4. Check port 3003 is not in use: `netstat -ano | findstr 3003`

### "Connection lost" During Generation

**Symptom**: Generation starts but fails with "Connection lost" after polling

**Solutions**:
1. Check ComfyUI is healthy: `docker ps | findstr comfy`
2. View ComfyUI logs: `docker logs comfy`
3. Verify GPU availability (ComfyUI requires NVIDIA GPU)
4. Check disk space in `t:\automatic1111\samplepacker.ai\data\output`

### Polling Takes Too Long

**Symptom**: Status checks seem slow or hang

**Result of Fix**:
- Initial polling: every 2 seconds
- After errors: exponential backoff (4s → 8s → stops)
- Automatic reconnection attempts with clear feedback

## Configuration

### Change Backend URL

If your backend is on a different machine:

1. Create `.env.local` in the inspira directory:
   ```env
   VITE_GATEWAY_SERVER_URL=http://your-server-ip:3003
   ```

2. Restart the frontend dev server

### Adjust Retry Settings

In `samplePackerAPI.ts`, the constructor accepts optional parameters:
```typescript
new SamplePackerAPI(
  '/api',        // baseURL
  3,             // retryAttempts
  1000           // retryDelay in ms
)
```

## What Changed

### Files Modified

1. **`src/utils/samplePackerAPI.ts`**
   - Added `fetchWithRetry()` method with timeout and retry logic
   - Added health status tracking
   - Improved error messages

2. **`src/hooks/useSamplePackGenerator.ts`**
   - Added `isBackendHealthy` state
   - Added health check on mount
   - Implemented exponential backoff for polling
   - Added consecutive error tracking
   - Added `retryConnection()` method

### Benefits

- ✅ No more silent failures
- ✅ Clear error messages guide users to solutions
- ✅ Automatic recovery from transient network issues
- ✅ Reduced server load with smart polling
- ✅ Better user experience with connection status

## Next Steps

Consider adding a UI indicator showing backend connection status:
```typescript
const { isBackendHealthy, retryConnection } = useSamplePackGenerator();

{isBackendHealthy === false && (
  <div className="alert alert-error">
    Backend not connected. 
    <button onClick={retryConnection}>Retry</button>
  </div>
)}
```
