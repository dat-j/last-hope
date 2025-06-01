import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('facebook_pages')
export class FacebookPage {
  @PrimaryColumn()
  id: string; // Facebook Page ID

  @Column()
  name: string;

  @Column({ nullable: true })
  picture: string;

  @Column({ name: 'access_token' })
  accessToken: string;

  @Column({ nullable: true })
  category: string;

  @Column({ name: 'followers_count', nullable: true })
  followersCount: number;

  @Column({ name: 'is_connected', default: true })
  isConnected: boolean;

  @Column({ name: 'webhook_verified', default: false })
  webhookVerified: boolean;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.facebookPages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 