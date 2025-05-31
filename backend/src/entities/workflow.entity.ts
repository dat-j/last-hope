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
import { User } from './user.entity';
import { ChatSession } from './chat-session.entity';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    message?: string;
    messageType?: string;
    
    // New flexible element system
    elements?: Array<{
      id: string;
      type: 'text' | 'image' | 'video' | 'file' | 'button' | 'quick_reply' | 'generic_card' | 'list_item';
      content?: string; // For text content
      title?: string;
      subtitle?: string;
      imageUrl?: string;
      fileUrl?: string;
      // Button specific
      buttonType?: 'postback' | 'web_url' | 'phone_number';
      payload?: string;
      url?: string;
      // Quick reply specific
      quickReplyPayload?: string;
      // Generic card specific
      buttons?: Array<{
        type: 'postback' | 'web_url' | 'phone_number';
        title: string;
        payload?: string;
        url?: string;
      }>;
    }>;
    
    // Legacy fields (keep for backward compatibility)
    buttons?: Array<{
      title: string;
      payload: string;
    }>;
    quickReplies?: Array<{
      title: string;
      payload: string;
      imageUrl?: string;
    }>;
    attachmentUrl?: string;
    recipientName?: string;
    orderNumber?: string;
    currency?: string;
    paymentMethod?: string;
    summary?: {
      subtotal: number;
      shippingCost: number;
      totalTax: number;
      totalCost: number;
    };
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
}

@Entity('workflows')
export class Workflow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, (user) => user.workflows)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column('jsonb', { default: [] })
  nodes: WorkflowNode[];

  @Column('jsonb', { default: [] })
  edges: WorkflowEdge[];

  @Column('jsonb', { default: {} })
  settings: Record<string, any>;

  @Column({ name: 'is_active', default: false })
  isActive: boolean;

  @OneToMany(() => ChatSession, (session) => session.workflow)
  chatSessions: ChatSession[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 