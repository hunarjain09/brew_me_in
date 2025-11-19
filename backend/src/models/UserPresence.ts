import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_presence')
export class UserPresence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({ name: 'cafe_id', type: 'uuid', nullable: true })
  @Index()
  cafeId: string | null;

  @Column({ name: 'in_cafe', type: 'boolean', default: false })
  @Index()
  inCafe: boolean;

  @Column({ name: 'last_seen_in_cafe', type: 'timestamp', nullable: true })
  @Index()
  lastSeenInCafe: Date | null;

  @Column({ name: 'current_ssid', type: 'varchar', length: 100, nullable: true })
  currentSSID: string | null;

  @Column({ name: 'last_latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  lastLatitude: number | null;

  @Column({ name: 'last_longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  lastLongitude: number | null;

  @Column({ name: 'validation_method', type: 'varchar', length: 20, nullable: true })
  validationMethod: 'wifi' | 'geofence' | 'manual' | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
