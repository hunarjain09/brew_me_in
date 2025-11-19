import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('access_logs')
export class AccessLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'cafe_id', type: 'uuid' })
  @Index()
  cafeId: string;

  @Column({ name: 'validation_method', type: 'varchar', length: 20 })
  validationMethod: 'wifi' | 'geofence' | 'manual';

  @Column({ name: 'access_granted', type: 'boolean' })
  accessGranted: boolean;

  @Column({ name: 'ssid_matched', type: 'varchar', length: 100, nullable: true })
  ssidMatched: string | null;

  @Column({ name: 'distance_meters', type: 'decimal', precision: 10, scale: 2, nullable: true })
  distanceMeters: number | null;

  @Column({ name: 'suspicious', type: 'boolean', default: false })
  @Index()
  suspicious: boolean;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason: string | null;

  @Column({ name: 'metadata', type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  @Index()
  createdAt: Date;
}
