import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Workflow } from './workflow.entity';
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
export class ChatSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'workflow_id' })
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.chatSessions)
  @JoinColumn({ name: 'workflow_id' })
  workflow: Workflow;

  @Column({ name: 'facebook_user_id' })
  facebookUserId: string;

  @Column({ name: 'current_state', nullable: true })
  currentState: string;

  @Column('jsonb', { default: {} })
  context: Record<string, any>;

  @OneToMany(() => ChatMessage, (message) => message.session)
  messages: ChatMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 