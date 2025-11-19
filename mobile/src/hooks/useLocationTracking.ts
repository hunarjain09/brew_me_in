/**
 * Custom React hook for location tracking and cafe access validation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { LocationService, Coordinates } from '../services/locationService';
import { NetworkService, NetworkInfo } from '../services/networkService';
import { CafeAccessService, CafeLocation, CafeAccessResult } from '../services/cafeAccessService';

export interface LocationTrackingState {
  coordinates: Coordinates | null;
  networkInfo: NetworkInfo | null;
  cafeAccess: CafeAccessResult | null;
  loading: boolean;
  error: string | null;
  permissionsGranted: boolean;
}

export const useLocationTracking = (cafe?: CafeLocation) => {
  const [state, setState] = useState<LocationTrackingState>({
    coordinates: null,
    networkInfo: null,
    cafeAccess: null,
    loading: true,
    error: null,
    permissionsGranted: false,
  });

  const monitoringRef = useRef<{ stop: () => void } | null>(null);

  /**
   * Request permissions
   */
  const requestPermissions = useCallback(async () => {
    try {
      const result = await CafeAccessService.requestPermissions();
      setState((prev) => ({
        ...prev,
        permissionsGranted: result.location,
        error: result.location ? null : result.locationMessage,
      }));
      return result.location;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: 'Failed to request permissions',
      }));
      return false;
    }
  }, []);

  /**
   * Check current location and network
   */
  const checkLocation = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const [coordinates, networkInfo] = await Promise.all([
        LocationService.getCurrentPosition(),
        NetworkService.getCurrentNetworkInfo(),
      ]);

      let cafeAccess: CafeAccessResult | null = null;
      if (cafe) {
        cafeAccess = await CafeAccessService.validateCafeAccess(cafe);
      }

      setState((prev) => ({
        ...prev,
        coordinates,
        networkInfo,
        cafeAccess,
        loading: false,
        error: null,
      }));

      return { coordinates, networkInfo, cafeAccess };
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return null;
    }
  }, [cafe]);

  /**
   * Start monitoring cafe access
   */
  const startMonitoring = useCallback(async () => {
    if (!cafe) {
      console.warn('[useLocationTracking] Cannot start monitoring without cafe data');
      return;
    }

    // Stop existing monitoring if any
    if (monitoringRef.current) {
      monitoringRef.current.stop();
    }

    const monitoring = await CafeAccessService.startMonitoring(
      cafe,
      (result) => {
        setState((prev) => ({
          ...prev,
          cafeAccess: result,
        }));
      },
      30000 // Check every 30 seconds
    );

    monitoringRef.current = monitoring;
  }, [cafe]);

  /**
   * Stop monitoring cafe access
   */
  const stopMonitoring = useCallback(() => {
    if (monitoringRef.current) {
      monitoringRef.current.stop();
      monitoringRef.current = null;
    }
  }, []);

  // Initialize and check permissions on mount
  useEffect(() => {
    const init = async () => {
      const permissions = await CafeAccessService.checkPermissions();
      setState((prev) => ({
        ...prev,
        permissionsGranted: permissions.location,
        loading: false,
      }));

      if (permissions.location) {
        await checkLocation();
      }
    };

    init();
  }, [checkLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopMonitoring();
    };
  }, [stopMonitoring]);

  return {
    ...state,
    requestPermissions,
    checkLocation,
    startMonitoring,
    stopMonitoring,
  };
};
