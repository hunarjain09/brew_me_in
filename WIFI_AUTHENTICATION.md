# WiFi Authentication Enforcement

This document describes the strict WiFi authentication system implemented in brew_me_in to ensure only customers physically present at the cafe can access the platform.

## Overview

**Strict WiFi Enforcement Mode** validates that users are connected to the cafe's WiFi network on every API request and WebSocket connection. This ensures:

- Only customers physically present at the cafe can participate
- No remote access to customer features (chat, messaging, pokes, etc.)
- Enhanced security and community authenticity
- Protection against unauthorized access

## How It Works

### Authentication Flow

1. **Initial Join** (existing flow - unchanged)
   - Barista generates username and join token
   - Customer provides WiFi SSID or GPS coordinates
   - System validates location during account creation

2. **Continuous Validation** (NEW)
   - Every HTTP API request requires WiFi validation
   - Every WebSocket connection requires WiFi validation
   - Users disconnected from cafe WiFi immediately lose access

### Validation Methods

The system supports two validation methods (in order of preference):

1. **WiFi SSID Matching** (Primary)
   - Client sends WiFi SSID via `x-wifi-ssid` header
   - Server compares against cafe's configured WiFi SSID
   - Most reliable method

2. **GPS Geofencing** (Fallback)
   - Client sends latitude/longitude via `x-latitude` and `x-longitude` headers
   - Server calculates distance from cafe location
   - User must be within configured radius (default: 100 meters)

## Implementation Guide

### For Frontend/Mobile Apps

#### HTTP API Requests

Add the following headers to **every** API request:

```typescript
// Primary method: WiFi SSID
headers: {
  'Authorization': 'Bearer <access_token>',
  'x-wifi-ssid': '<current_wifi_ssid>',
}

// Fallback method: GPS coordinates
headers: {
  'Authorization': 'Bearer <access_token>',
  'x-latitude': '<user_latitude>',
  'x-longitude': '<user_longitude>',
}

// Best practice: Send both for maximum reliability
headers: {
  'Authorization': 'Bearer <access_token>',
  'x-wifi-ssid': '<current_wifi_ssid>',
  'x-latitude': '<user_latitude>',
  'x-longitude': '<user_longitude>',
}
```

#### Example: Axios Configuration

```typescript
import axios from 'axios';

// Get WiFi SSID (platform-specific)
async function getCurrentWifiSsid(): Promise<string | undefined> {
  // Web: Use Network Information API (limited support)
  if ('connection' in navigator) {
    // Note: WiFi SSID not available in web browsers for security
    // Use GPS as fallback for web clients
    return undefined;
  }

  // React Native: Use wifi library
  // const ssid = await WifiManager.getCurrentWifiSSID();
  // return ssid;

  return undefined;
}

// Get GPS coordinates
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      () => resolve(undefined)
    );
  });
}

// Configure axios instance
const apiClient = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Add interceptor to include location headers
apiClient.interceptors.request.use(async (config) => {
  // Add auth token
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Add WiFi SSID if available
  const wifiSsid = await getCurrentWifiSsid();
  if (wifiSsid) {
    config.headers['x-wifi-ssid'] = wifiSsid;
  }

  // Add GPS coordinates as fallback
  const location = await getCurrentLocation();
  if (location) {
    config.headers['x-latitude'] = location.latitude.toString();
    config.headers['x-longitude'] = location.longitude.toString();
  }

  return config;
});

export default apiClient;
```

#### WebSocket Connections

Include location data in the Socket.IO handshake auth:

```typescript
import { io } from 'socket.io-client';

async function connectToChat() {
  const token = localStorage.getItem('access_token');
  const wifiSsid = await getCurrentWifiSsid();
  const location = await getCurrentLocation();

  const socket = io('http://localhost:3000', {
    auth: {
      token,
      wifiSsid,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
  });

  socket.on('connect_error', (error) => {
    if (error.message.includes('Location validation failed')) {
      // Show user-friendly message
      alert('You must be connected to the cafe WiFi to use this feature');
    }
  });

  return socket;
}

// Agent namespace
async function connectToAgent() {
  const token = localStorage.getItem('access_token');
  const wifiSsid = await getCurrentWifiSsid();
  const location = await getCurrentLocation();

  const socket = io('http://localhost:3000/agent', {
    auth: {
      token,
      wifiSsid,
      latitude: location?.latitude,
      longitude: location?.longitude,
    },
  });

  return socket;
}
```

### For React Native Apps

```typescript
import WifiManager from 'react-native-wifi-reborn';
import Geolocation from '@react-native-community/geolocation';

// Get WiFi SSID
async function getCurrentWifiSsid(): Promise<string | undefined> {
  try {
    const ssid = await WifiManager.getCurrentWifiSSID();
    return ssid;
  } catch (error) {
    console.error('Failed to get WiFi SSID:', error);
    return undefined;
  }
}

// Get GPS location
async function getCurrentLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
  return new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      }),
      (error) => {
        console.error('Failed to get location:', error);
        resolve(undefined);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  });
}
```

## Error Handling

### HTTP API Errors

When WiFi validation fails, the API returns:

```json
{
  "error": "Location validation failed",
  "message": "WiFi network does not match cafe network",
  "method": "wifi",
  "details": {
    "required": "You must be physically present at the cafe",
    "hint": "Please connect to the cafe WiFi network or ensure location services are enabled"
  }
}
```

Status code: `403 Forbidden`

### WebSocket Errors

When WiFi validation fails during connection:

```javascript
socket.on('connect_error', (error) => {
  // error.message: "Location validation failed: WiFi network does not match cafe network"
});
```

### Handling Validation Failures

```typescript
// Example error handler for API requests
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403 &&
        error.response?.data?.error === 'Location validation failed') {
      // Show location error dialog
      showLocationErrorDialog(error.response.data);
    }
    return Promise.reject(error);
  }
);

function showLocationErrorDialog(data: any) {
  const message = data.method === 'wifi'
    ? 'Please connect to the cafe WiFi network'
    : 'Please enable location services and ensure you are at the cafe';

  alert(`Access Denied\n\n${message}`);
}
```

## Protected Endpoints

### HTTP API Routes (require WiFi)

All customer-facing endpoints now require WiFi validation:

- `/api/chat/*` - All chat operations
- `/api/users/*` - User profile and settings
- `/api/matching/*` - Interest matching and discovery
- `/api/pokes/*` - Poke system
- `/api/dm/*` - Direct messaging
- `/api/badges/status` - Badge status
- `/api/location/validate` - Location validation
- `/api/location/update` - Presence updates
- `/api/agent/query` - AI agent queries

### WebSocket Namespaces (require WiFi)

- `/` (default namespace) - Chat and real-time features
- `/agent` - AI agent streaming

### Unprotected Endpoints

These endpoints do NOT require WiFi (by design):

- `/api/auth/barista/generate-username` - Barista portal
- `/api/auth/join` - Initial join (has its own validation)
- `/api/auth/refresh` - Token refresh
- `/api/auth/login` - Moderator login
- `/api/admin/*` - Admin dashboard (moderators need remote access)
- `/api/location/cafes/nearby` - Public cafe discovery
- `/api/health` - Health check

## Configuration

### Cafe WiFi Settings

Moderators can configure cafe WiFi and geofencing in the cafe settings:

```typescript
interface CafeSettings {
  wifiSsid: string;           // WiFi network name
  latitude?: number;          // Cafe GPS latitude
  longitude?: number;         // Cafe GPS longitude
  geofenceRadius?: number;    // Radius in meters (default: 100)
}
```

### Environment Variables

No additional environment variables required. WiFi enforcement is always active.

## Testing

### Testing WiFi Validation Locally

1. **Set up test cafe with known WiFi SSID**
   ```sql
   UPDATE cafes SET wifi_ssid = 'TestCafeWiFi' WHERE id = 'your-cafe-id';
   ```

2. **Test with correct WiFi**
   ```bash
   curl -H "Authorization: Bearer <token>" \
        -H "x-wifi-ssid: TestCafeWiFi" \
        http://localhost:3000/api/chat/messages/cafe-id
   ```

3. **Test with incorrect WiFi** (should fail)
   ```bash
   curl -H "Authorization: Bearer <token>" \
        -H "x-wifi-ssid: WrongWiFi" \
        http://localhost:3000/api/chat/messages/cafe-id
   ```

4. **Test with GPS coordinates**
   ```bash
   curl -H "Authorization: Bearer <token>" \
        -H "x-latitude: 37.7749" \
        -H "x-longitude: -122.4194" \
        http://localhost:3000/api/chat/messages/cafe-id
   ```

### Unit Tests

Example test for WiFi validation middleware:

```typescript
import { enforceWifiConnection } from '../middleware/wifiValidation';
import { NetworkValidator } from '../utils/networkValidation';

describe('WiFi Validation Middleware', () => {
  it('should allow access with valid WiFi SSID', async () => {
    const req = {
      user: { userId: '123', cafeId: 'cafe-1', username: 'testuser' },
      headers: { 'x-wifi-ssid': 'CafeWiFi' },
    };
    const res = { status: jest.fn(), json: jest.fn() };
    const next = jest.fn();

    jest.spyOn(NetworkValidator, 'validateUserLocation').mockResolvedValue({
      valid: true,
      method: 'wifi',
    });

    await enforceWifiConnection(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('should deny access with invalid WiFi SSID', async () => {
    const req = {
      user: { userId: '123', cafeId: 'cafe-1', username: 'testuser' },
      headers: { 'x-wifi-ssid': 'WrongWiFi' },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const next = jest.fn();

    jest.spyOn(NetworkValidator, 'validateUserLocation').mockResolvedValue({
      valid: false,
      method: 'wifi',
      message: 'WiFi network does not match cafe network',
    });

    await enforceWifiConnection(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Platform-Specific Considerations

### Web Browsers

- **WiFi SSID Not Available**: Browsers don't expose WiFi SSID for security
- **Use GPS Only**: Web clients must rely on Geolocation API
- **Permission Prompts**: Users must grant location permissions
- **Accuracy**: GPS may be less accurate indoors

### iOS

- **WiFi SSID Requires Permissions**: Needs location permission + entitlements
- **GPS Fallback**: Recommended to implement GPS as backup
- **Background Location**: May need "Always" permission for background updates

### Android

- **WiFi SSID Available**: Can read WiFi SSID with location permission
- **Android 10+**: Requires fine location permission
- **GPS Alternative**: Fused Location Provider recommended

## Security Considerations

1. **SSID Spoofing**: Attackers could create fake WiFi with same SSID
   - Mitigated by: Combining with GPS validation
   - Recommendation: Use both WiFi and GPS when possible

2. **GPS Spoofing**: Attackers could fake GPS coordinates
   - Mitigated by: Using WiFi SSID as primary method
   - Recommendation: WiFi SSID preferred over GPS

3. **Network Transit**: Location data sent in headers
   - Mitigated by: HTTPS encryption required
   - Recommendation: Always use HTTPS in production

## Troubleshooting

### Common Issues

**Issue**: "Location validation failed" error
- **Cause**: Not connected to cafe WiFi or outside geofence
- **Solution**: Connect to cafe WiFi or move closer to cafe

**Issue**: GPS validation always fails
- **Cause**: Location services disabled or inaccurate
- **Solution**: Enable high-accuracy location services

**Issue**: WiFi validation works on Android but not iOS
- **Cause**: iOS requires additional permissions/entitlements
- **Solution**: Add location permissions and WiFi entitlements

**Issue**: Validation fails intermittently
- **Cause**: Network switching or GPS drift
- **Solution**: Implement retry logic with exponential backoff

## Future Enhancements

Potential improvements to the WiFi enforcement system:

1. **Periodic Re-validation**: Check WiFi every N minutes instead of every request
2. **Grace Period**: Allow brief disconnections (e.g., 30 seconds)
3. **WiFi Fingerprinting**: Use BSSID instead of just SSID
4. **Bluetooth Beacons**: Use Bluetooth LE for more precise location
5. **Machine Learning**: Detect patterns of legitimate vs. spoofed locations
6. **Multi-location Cafes**: Support cafe chains with multiple locations

## Support

For questions or issues with WiFi authentication:
- File an issue on GitHub
- Contact the development team
- Review logs in `/backend/logs` for debugging
