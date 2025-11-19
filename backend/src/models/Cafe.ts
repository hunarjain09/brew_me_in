import { db } from '../db/connection';
import { Cafe } from '../types';

export class CafeModel {
  static async findById(id: string): Promise<Cafe | null> {
    const query = 'SELECT * FROM cafes WHERE id = $1';
    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findByWifiSsid(ssid: string): Promise<Cafe | null> {
    const query = 'SELECT * FROM cafes WHERE wifi_ssid = $1';
    const result = await db.query(query, [ssid]);

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRow(result.rows[0]);
  }

  static async findAll(): Promise<Cafe[]> {
    const query = 'SELECT * FROM cafes ORDER BY name ASC';
    const result = await db.query(query);
    return result.rows.map(this.mapRow);
  }

  static async create(data: {
    name: string;
    wifiSsid: string;
    latitude?: number;
    longitude?: number;
    geofenceRadius?: number;
  }): Promise<Cafe> {
    const query = `
      INSERT INTO cafes (name, wifi_ssid, latitude, longitude, geofence_radius)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await db.query(query, [
      data.name,
      data.wifiSsid,
      data.latitude || null,
      data.longitude || null,
      data.geofenceRadius || 100,
    ]);

    return this.mapRow(result.rows[0]);
  }

  private static mapRow(row: any): Cafe {
    return {
      id: row.id,
      name: row.name,
      wifiSsid: row.wifi_ssid,
      latitude: row.latitude,
      longitude: row.longitude,
      geofenceRadius: row.geofence_radius,
      createdAt: row.created_at,
    };
  }
}
