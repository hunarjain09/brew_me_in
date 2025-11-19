/**
 * Network detection service for React Native
 * Handles WiFi SSID detection and network information
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { Platform } from 'react-native';

export interface NetworkInfo {
  type: 'wifi' | 'cellular' | 'ethernet' | 'none' | 'unknown';
  isConnected: boolean;
  isInternetReachable: boolean;
  ssid?: string;
  bssid?: string;
  ipAddress?: string;
  subnet?: string;
}

export class NetworkService {
  /**
   * Get current network information including WiFi SSID
   * Note: SSID detection requires specific permissions on iOS and Android
   */
  static async getCurrentNetworkInfo(): Promise<NetworkInfo> {
    try {
      const state: NetInfoState = await NetInfo.fetch();

      const networkInfo: NetworkInfo = {
        type: state.type as any,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
      };

      // Extract WiFi details if connected to WiFi
      if (state.type === 'wifi' && state.details) {
        networkInfo.ssid = state.details.ssid || undefined;
        networkInfo.bssid = state.details.bssid || undefined;
        networkInfo.ipAddress = state.details.ipAddress || undefined;
        networkInfo.subnet = state.details.subnet || undefined;
      }

      return networkInfo;
    } catch (error) {
      console.error('[NetworkService] Error fetching network info:', error);
      return {
        type: 'unknown',
        isConnected: false,
        isInternetReachable: false,
      };
    }
  }

  /**
   * Get current WiFi SSID
   * Returns null if not connected to WiFi or if SSID cannot be determined
   */
  static async getCurrentSSID(): Promise<string | null> {
    try {
      const state = await NetInfo.fetch();

      if (state.type === 'wifi' && state.details) {
        return state.details.ssid || null;
      }

      return null;
    } catch (error) {
      console.error('[NetworkService] Error getting SSID:', error);
      return null;
    }
  }

  /**
   * Subscribe to network state changes
   * Returns an unsubscribe function
   */
  static subscribeToNetworkChanges(
    callback: (networkInfo: NetworkInfo) => void
  ): () => void {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const networkInfo: NetworkInfo = {
        type: state.type as any,
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable ?? false,
      };

      if (state.type === 'wifi' && state.details) {
        networkInfo.ssid = state.details.ssid || undefined;
        networkInfo.bssid = state.details.bssid || undefined;
        networkInfo.ipAddress = state.details.ipAddress || undefined;
        networkInfo.subnet = state.details.subnet || undefined;
      }

      callback(networkInfo);
    });

    return unsubscribe;
  }

  /**
   * Check if currently connected to a specific WiFi SSID
   */
  static async isConnectedToSSID(targetSSID: string): Promise<boolean> {
    try {
      const currentSSID = await this.getCurrentSSID();
      if (!currentSSID) {
        return false;
      }

      return currentSSID.toLowerCase().trim() === targetSSID.toLowerCase().trim();
    } catch (error) {
      console.error('[NetworkService] Error checking SSID:', error);
      return false;
    }
  }

  /**
   * Check if device has internet connectivity
   */
  static async hasInternetConnection(): Promise<boolean> {
    try {
      const state = await NetInfo.fetch();
      return state.isInternetReachable ?? false;
    } catch (error) {
      console.error('[NetworkService] Error checking internet connection:', error);
      return false;
    }
  }

  /**
   * Get platform-specific permission requirements info
   */
  static getPermissionRequirements(): {
    platform: string;
    permissions: string[];
    notes: string;
  } {
    if (Platform.OS === 'ios') {
      return {
        platform: 'iOS',
        permissions: ['NSLocationWhenInUseUsageDescription'],
        notes: 'WiFi SSID detection requires location permissions on iOS 13+',
      };
    } else if (Platform.OS === 'android') {
      return {
        platform: 'Android',
        permissions: [
          'ACCESS_FINE_LOCATION',
          'ACCESS_WIFI_STATE',
          'ACCESS_NETWORK_STATE',
        ],
        notes: 'WiFi SSID detection requires location permissions on Android 10+',
      };
    }

    return {
      platform: 'Unknown',
      permissions: [],
      notes: 'Platform not supported',
    };
  }
}
