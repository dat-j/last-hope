import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'session_id' })
  sessionId: string;

  @ManyToOne(() => ChatSession, (session) => session.messages)
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;

  @Column({ name: 'facebook_user_id' })
  facebookUserId: string;

  @Column({ name: 'message_text', nullable: true })
  messageText: string;

  @Column({ name: 'message_type', default: 'text' })
  messageType: string; // text, button, quick_reply

  @Column({ name: 'is_from_user' })
  isFromUser: boolean;

  @Column('jsonb', { default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
} 