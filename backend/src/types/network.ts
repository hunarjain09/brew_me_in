/**
 * Network-related TypeScript interfaces and types
 */

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  isConnected: boolean;
  isInternetReachable: boolean;
  details?: WifiDetails | CellularDetails;
}

export interface WifiDetails {
  ssid: string;
  bssid?: string;
  strength?: number; // Signal strength in dBm
  frequency?: number; // Frequency in MHz
  ipAddress?: string;
  subnet?: string;
}

export interface CellularDetails {
  carrier?: string;
  cellularGeneration?: '2g' | '3g' | '4g' | '5g';
}

export interface NetworkValidationRequest {
  userId: string;
  cafeId: string;
  networkInfo: NetworkInfo;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface NetworkValidationResponse {
  isValid: boolean;
  method: 'wifi-ssid' | 'geofence' | 'failed';
  accessGranted: boolean;
  reason?: string;
}

export interface ActiveSocket {
  socketId: string;
  userId: string;
  cafeId?: string;
  connectedAt: Date;
  lastActivity: Date;
  wasInCafe?: boolean;
}

export interface NetworkScanResult {
  timestamp: Date;
  networks: WifiNetwork[];
  deviceId: string;
}

export interface WifiNetwork {
  ssid: string;
  bssid: string;
  strength: number;
  frequency: number;
  secure: boolean;
}
