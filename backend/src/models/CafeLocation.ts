import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('cafe_locations')
export class CafeLocation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cafe_id', type: 'uuid', unique: true })
  @Index()
  cafeId: string;

  @Column({ name: 'wifi_ssid', type: 'varchar', length: 100 })
  wifiSSID: string;

  @Column({ type: 'decimal', precision: 10, scale: 8 })
  @Index()
  latitude: number;

  @Column({ type: 'decimal', precision: 11, scale: 8 })
  @Index()
  longitude: number;

  @Column({ name: 'radius_meters', type: 'integer', default: 50 })
  radiusMeters: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual column for PostGIS point (if using PostGIS extension)
  // @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326, nullable: true })
  // geom?: string;
}
