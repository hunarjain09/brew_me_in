# Brew Me In - Network Validation & Location Services

A comprehensive location-based cafe social networking platform with WiFi SSID detection, geofencing, and real-time presence tracking.

## 📋 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Features](#features)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Mobile Integration](#mobile-integration)
- [WebSocket Events](#websocket-events)
- [Database Schema](#database-schema)
- [Security](#security)
- [Testing](#testing)

## 🎯 Overview

Brew Me In is a location-based social networking platform designed for cafes. It uses a combination of WiFi SSID detection and GPS geofencing to verify that users are actually present in a cafe before granting access to cafe-specific features.

### Key Components

1. **Backend Services** (Node.js + TypeScript + Express)
   - Location validation API
   - Real-time presence tracking with Socket.io
   - Background jobs for periodic presence checks
   - PostgreSQL database with TypeORM

2. **Mobile App** (React Native + Expo)
   - WiFi SSID detection
   - GPS geofencing
   - Real-time Socket.io connection
   - Location tracking services

## 🏗️ Architecture

```
┌─────────────────┐
│  Mobile App     │
│  (React Native) │
└────────┬────────┘
         │
         ├─── WiFi SSID Detection
         ├─── GPS Location
         └─── Socket.io Connection
                │
                ▼
┌────────────────────────────┐
│  Backend API (Express)     │
│                            │
│  ├─ Location Validation    │
│  ├─ Geofence Checking      │
│  ├─ Presence Management    │
│  └─ Access Control         │
└────────┬───────────────────┘
         │
         ├─── PostgreSQL Database
         ├─── Socket.io Server
         └─── Background Jobs
```

## ✨ Features

### Network Validation

- ✅ **WiFi SSID Detection**: Primary validation method using network SSID matching
- ✅ **Geofencing**: Fallback validation using GPS coordinates and radius checking
- ✅ **Graceful Degradation**: Falls back to geofencing if WiFi SSID is unavailable
- ✅ **Real-time Updates**: Socket.io for instant presence notifications

### Location Services

- 📍 **GPS Tracking**: Real-time location monitoring
- 🗺️ **Nearby Cafes**: Find cafes within a specified radius
- 🚧 **Geofence Boundaries**: Configurable radius for each cafe
- 📊 **Distance Calculation**: Haversine formula for accurate distance measurements

### Presence Management

- 👥 **In Cafe Status**: Track which users are currently in each cafe
- ⏰ **Last Seen Tracking**: Record when users were last in a cafe
- 🔄 **Periodic Validation**: Background job checks presence every 5 minutes
- 🚨 **Suspicious Activity Detection**: Identify unusual access patterns

### Access Control

- 🔐 **Network-based Access**: Only allow access to users physically in the cafe
- 📝 **Access Logging**: Track all access attempts with method and success status
- ⚠️ **Manual Override**: Support for testing and demo scenarios
- 🛡️ **Privacy Protection**: Location data only collected when app is active

## 📁 Project Structure

```
brew_me_in/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.ts           # Database configuration
│   │   ├── controllers/
│   │   │   └── locationController.ts # API endpoint handlers
│   │   ├── jobs/
│   │   │   └── presenceCheckJob.ts   # Background presence validation
│   │   ├── migrations/
│   │   │   └── 1700000000000-CreateLocationTables.ts
│   │   ├── models/
│   │   │   ├── CafeLocation.ts       # Cafe location entity
│   │   │   ├── UserPresence.ts       # User presence entity
│   │   │   └── AccessLog.ts          # Access log entity
│   │   ├── routes/
│   │   │   └── location.ts           # Location API routes
│   │   ├── services/
│   │   │   └── locationService.ts    # Core location logic
│   │   ├── types/
│   │   │   ├── location.ts           # Location type definitions
│   │   │   └── network.ts            # Network type definitions
│   │   ├── utils/
│   │   │   └── geolocation.ts        # Geolocation utilities
│   │   ├── websocket/
│   │   │   └── locationEvents.ts     # Socket.io event handlers
│   │   └── index.ts                  # Express app setup
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
└── mobile/
    ├── src/
    │   ├── hooks/
    │   │   ├── useLocationTracking.ts  # Location tracking hook
    │   │   └── useSocket.ts            # Socket.io hook
    │   └── services/
    │       ├── cafeAccessService.ts    # Cafe access validation
    │       ├── locationService.ts      # Location utilities
    │       └── networkService.ts       # Network detection
    ├── package.json
    └── tsconfig.json
```

## 🚀 Installation

### Prerequisites

- Node.js >= 18.0.0
- PostgreSQL >= 13
- npm or yarn
- Expo CLI (for mobile development)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your database credentials
# DB_HOST=localhost
# DB_PORT=5432
# DB_USERNAME=postgres
# DB_PASSWORD=your_password
# DB_DATABASE=brew_me_in

# Run migrations
npm run migration:run

# Start development server
npm run dev
```

### Mobile Setup

```bash
cd mobile

# Install dependencies
npm install

# Start Expo development server
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

## ⚙️ Configuration

### Environment Variables (Backend)

```env
# Server
NODE_ENV=development
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=brew_me_in

# Location Services
GEOFENCE_DEFAULT_RADIUS=50
LOCATION_UPDATE_INTERVAL=300000
PRESENCE_CHECK_INTERVAL=300000

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3001,http://localhost:19006
```

### Required Permissions (Mobile)

#### iOS (Info.plist)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>We need your location to verify you're in the cafe</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>We need your location to verify you're in the cafe</string>
```

#### Android (AndroidManifest.xml)

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 📡 API Documentation

### Endpoints

#### POST /api/location/validate

Validate if user has access to a cafe.

**Request:**
```json
{
  "cafeId": "uuid",
  "userId": "uuid",
  "ssid": "CafeWiFi",
  "coordinates": {
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "inCafe": true,
    "method": "wifi",
    "message": "Access granted via WiFi SSID"
  }
}
```

#### PUT /api/location/update

Update user presence status.

**Request:**
```json
{
  "userId": "uuid",
  "cafeId": "uuid",
  "inCafe": true,
  "ssid": "CafeWiFi",
  "coordinates": {
    "lat": 37.7749,
    "lng": -122.4194
  }
}
```

#### GET /api/location/cafes/nearby

Get nearby cafes.

**Query Parameters:**
- `lat`: Latitude (required)
- `lng`: Longitude (required)
- `radiusMeters`: Search radius in meters (default: 5000)
- `limit`: Maximum number of results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "cafeId": "uuid",
      "name": "Coffee Shop",
      "distance": 150,
      "latitude": 37.7749,
      "longitude": -122.4194,
      "wifiSSID": "CafeWiFi",
      "radiusMeters": 50
    }
  ]
}
```

#### GET /api/location/presence/:userId

Get user's current presence status.

#### GET /api/location/cafes/:cafeId/users

Get all users currently in a specific cafe.

#### POST /api/location/cafes/:cafeId/geofence/check

Check if coordinates are within cafe geofence.

## 📱 Mobile Integration

### Basic Usage Example

```typescript
import { useLocationTracking } from './hooks/useLocationTracking';
import { useSocket } from './hooks/useSocket';

function CafeScreen({ cafe, userId }) {
  // Location tracking
  const {
    coordinates,
    cafeAccess,
    requestPermissions,
    startMonitoring,
    stopMonitoring,
  } = useLocationTracking(cafe);

  // Socket connection
  const {
    connected,
    inCafe,
    joinCafe,
    leaveCafe,
    subscribeToEvents,
  } = useSocket(userId, cafe.id);

  useEffect(() => {
    // Request permissions
    requestPermissions();

    // Start monitoring
    startMonitoring();

    // Subscribe to events
    const unsubscribe = subscribeToEvents({
      onUserJoined: (data) => console.log('User joined:', data),
      onUserLeft: (data) => console.log('User left:', data),
      onPresenceChanged: (data) => console.log('Presence changed:', data),
    });

    return () => {
      stopMonitoring();
      unsubscribe?.();
    };
  }, []);

  return (
    <View>
      <Text>Status: {inCafe ? 'In Cafe' : 'Outside Cafe'}</Text>
      <Text>Method: {cafeAccess?.method}</Text>
      <Text>Connected: {connected ? 'Yes' : 'No'}</Text>
    </View>
  );
}
```

## 🔌 WebSocket Events

### Client → Server

| Event | Payload | Description |
|-------|---------|-------------|
| `cafe:join` | `{ userId, cafeId, ssid?, coordinates? }` | Join a cafe room |
| `cafe:leave` | `{ userId, cafeId }` | Leave a cafe room |
| `location:update` | `{ userId, cafeId, ssid?, coordinates? }` | Send location update |
| `location:subscribe-nearby` | `{ userId, radius }` | Subscribe to nearby updates |

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `cafe:joined` | `{ cafeId, usersInCafe, method }` | Successfully joined cafe |
| `cafe:join-failed` | `{ reason, method }` | Failed to join cafe |
| `presence:user-joined` | `{ userId, timestamp }` | Another user joined |
| `presence:user-left` | `{ userId, timestamp }` | Another user left |
| `presence:changed` | `{ userId, inCafe, timestamp, method }` | User presence changed |
| `location:update-ack` | `{ inCafe, timestamp }` | Location update acknowledged |

## 🗄️ Database Schema

### cafe_locations

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| cafe_id | UUID | Reference to cafe |
| wifi_ssid | VARCHAR(100) | WiFi network name |
| latitude | DECIMAL(10,8) | GPS latitude |
| longitude | DECIMAL(11,8) | GPS longitude |
| radius_meters | INTEGER | Geofence radius (default: 50) |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### user_presence

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User identifier |
| cafe_id | UUID | Current cafe (nullable) |
| in_cafe | BOOLEAN | Currently in cafe |
| last_seen_in_cafe | TIMESTAMP | Last seen timestamp |
| current_ssid | VARCHAR(100) | Current WiFi SSID |
| last_latitude | DECIMAL(10,8) | Last known latitude |
| last_longitude | DECIMAL(11,8) | Last known longitude |
| validation_method | VARCHAR(20) | wifi/geofence/manual |
| created_at | TIMESTAMP | Creation timestamp |
| updated_at | TIMESTAMP | Last update timestamp |

### access_logs

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | User identifier |
| cafe_id | UUID | Cafe identifier |
| validation_method | VARCHAR(20) | wifi/geofence/manual |
| access_granted | BOOLEAN | Access granted |
| ssid_matched | VARCHAR(100) | Matched SSID |
| distance_meters | DECIMAL(10,2) | Distance from cafe |
| suspicious | BOOLEAN | Flagged as suspicious |
| reason | TEXT | Failure/warning reason |
| metadata | JSONB | Additional data |
| created_at | TIMESTAMP | Log timestamp |

## 🔒 Security

### Access Control Features

1. **Dual Validation**: WiFi SSID (primary) + Geofencing (fallback)
2. **Access Logging**: All attempts logged with success/failure
3. **Suspicious Activity Detection**:
   - Rapid location changes
   - Multiple cafes in short time
   - Unusual access patterns
4. **Privacy Protection**:
   - No background location tracking
   - Location only checked when app is active
   - User consent required

### Best Practices

- ✅ Always validate on server-side
- ✅ Never trust client-reported location without verification
- ✅ Log all access attempts for audit trail
- ✅ Implement rate limiting on API endpoints
- ✅ Use HTTPS in production
- ✅ Sanitize all user inputs
- ✅ Implement proper authentication/authorization

## 🧪 Testing

### Manual Testing

```bash
# Start backend
cd backend && npm run dev

# In another terminal, test API
curl -X POST http://localhost:3000/api/location/validate \
  -H "Content-Type: application/json" \
  -d '{
    "cafeId": "test-cafe-uuid",
    "userId": "test-user-uuid",
    "ssid": "TestCafeWiFi",
    "coordinates": {
      "lat": 37.7749,
      "lng": -122.4194
    }
  }'
```

### Testing Mobile Services

```typescript
import { CafeAccessService } from './services/cafeAccessService';

// Test cafe access validation
const cafe = {
  cafeId: 'test-uuid',
  wifiSSID: 'TestCafe',
  latitude: 37.7749,
  longitude: -122.4194,
  radiusMeters: 50,
};

const result = await CafeAccessService.validateCafeAccess(cafe);
console.log('Access result:', result);
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines before submitting PRs.

## 📧 Support

For issues and questions, please open a GitHub issue.

---

**Built with ❤️ for the Brew Me In community**
