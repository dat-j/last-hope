import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Workflow } from './workflow.entity';
import { FacebookPage } from './facebook-page.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @OneToMany(() => Workflow, (workflow) => workflow.user)
  workflows: Workflow[];

  @OneToMany(() => FacebookPage, (facebookPage) => facebookPage.user)
  facebookPages: FacebookPage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 