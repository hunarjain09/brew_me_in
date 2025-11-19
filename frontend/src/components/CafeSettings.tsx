import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

interface OperatingHours {
  [key: string]: { open: string; close: string; closed: boolean };
}

interface CafeSettings {
  id: string;
  name: string;
  description?: string;
  wifi_ssid: string;
  latitude?: number;
  longitude?: number;
  geofence_radius: number;
  operating_hours?: OperatingHours;
}

const CafeSettings: React.FC = () => {
  const { cafe } = useAuth();
  const [settings, setSettings] = useState<CafeSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  useEffect(() => {
    fetchSettings();
  }, [cafe]);

  const fetchSettings = async () => {
    if (!cafe?.id) return;

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/admin/cafes/${cafe.id}/settings`);

      // Initialize operating hours if not set
      const operatingHours = response.data.operating_hours || {};
      daysOfWeek.forEach(day => {
        if (!operatingHours[day]) {
          operatingHours[day] = { open: '09:00', close: '17:00', closed: false };
        }
      });

      setSettings({
        ...response.data,
        operating_hours: operatingHours,
      });
    } catch (error) {
      console.error('Failed to fetch cafe settings:', error);
      toast.error('Failed to load cafe settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setIsSaving(true);
    try {
      await apiClient.put(`/admin/cafes/${cafe?.id}/settings`, {
        name: settings.name,
        description: settings.description,
        wifi_ssid: settings.wifi_ssid,
        latitude: settings.latitude,
        longitude: settings.longitude,
        geofence_radius: settings.geofence_radius,
        operating_hours: settings.operating_hours,
      });

      toast.success('Cafe settings saved successfully');
    } catch (error: any) {
      console.error('Failed to save cafe settings:', error);
      if (error.response?.data?.error?.includes('WiFi SSID')) {
        toast.error('WiFi SSID already in use by another cafe');
      } else {
        toast.error('Failed to save cafe settings');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const updateOperatingHours = (day: string, field: 'open' | 'close' | 'closed', value: string | boolean) => {
    if (!settings) return;

    setSettings({
      ...settings,
      operating_hours: {
        ...settings.operating_hours,
        [day]: {
          ...settings.operating_hours![day],
          [field]: value,
        },
      },
    });
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-white/70 text-lg">Loading cafe settings...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-white/70 text-lg">Failed to load cafe settings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Cafe Information</h2>

        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Cafe Name
            </label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Description
            </label>
            <textarea
              value={settings.description || ''}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
              rows={3}
              placeholder="A brief description of your cafe..."
            />
          </div>
        </div>
      </div>

      {/* Network Configuration */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Network Configuration</h2>

        <div className="space-y-4 relative z-10">
          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              WiFi SSID
            </label>
            <input
              type="text"
              value={settings.wifi_ssid}
              onChange={(e) => setSettings({ ...settings, wifi_ssid: e.target.value })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
              placeholder="MyCoffe eShop_WiFi"
            />
            <p className="text-xs text-white/60 mt-1">
              The WiFi network name users must connect to in order to access your cafe
            </p>
          </div>
        </div>
      </div>

      {/* Location & Geofence */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Location & Geofence</h2>

        <div className="space-y-4 relative z-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Latitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.latitude || ''}
                onChange={(e) => setSettings({ ...settings, latitude: parseFloat(e.target.value) || undefined })}
                className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
                placeholder="40.7128"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-white/90 mb-2">
                Longitude
              </label>
              <input
                type="number"
                step="0.000001"
                value={settings.longitude || ''}
                onChange={(e) => setSettings({ ...settings, longitude: parseFloat(e.target.value) || undefined })}
                className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
                placeholder="-74.0060"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/90 mb-2">
              Geofence Radius (meters)
            </label>
            <input
              type="number"
              value={settings.geofence_radius}
              onChange={(e) => setSettings({ ...settings, geofence_radius: parseInt(e.target.value) || 100 })}
              className="glass-input w-full px-4 py-2 rounded-xl text-white font-medium"
              min="10"
              max="10000"
            />
            <p className="text-xs text-white/60 mt-1">
              The radius around your cafe location where users can access the app (10-10000 meters)
            </p>
          </div>
        </div>
      </div>

      {/* Operating Hours */}
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-2xl font-bold mb-6 text-white drop-shadow-lg">Operating Hours</h2>

        <div className="space-y-3 relative z-10">
          {daysOfWeek.map((day) => (
            <div key={day} className="glass-light p-4 rounded-xl">
              <div className="flex items-center space-x-4">
                <div className="w-32">
                  <span className="text-white font-semibold capitalize">{day}</span>
                </div>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.operating_hours![day].closed}
                    onChange={(e) => updateOperatingHours(day, 'closed', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-white/80">Closed</span>
                </label>

                {!settings.operating_hours![day].closed && (
                  <>
                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-white/80">Open:</label>
                      <input
                        type="time"
                        value={settings.operating_hours![day].open}
                        onChange={(e) => updateOperatingHours(day, 'open', e.target.value)}
                        className="glass-input px-3 py-1 rounded-lg text-white text-sm"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <label className="text-sm text-white/80">Close:</label>
                      <input
                        type="time"
                        value={settings.operating_hours![day].close}
                        onChange={(e) => updateOperatingHours(day, 'close', e.target.value)}
                        className="glass-input px-3 py-1 rounded-lg text-white text-sm"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="glass-btn-primary px-8 py-3 rounded-xl text-white font-semibold disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default CafeSettings;
