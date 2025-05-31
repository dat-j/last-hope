import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatSession } from '../entities/chat-session.entity';
import { ChatMessage } from '../entities/chat-message.entity';
import { Workflow } from '../entities/workflow.entity';
import { WorkflowMachineService } from '../workflow/workflow.machine';

export interface FacebookMessengerElement {
  title?: string;
  subtitle?: string;
  image_url?: string;
  default_action?: {
    type: 'web_url';
    url: string;
    messenger_extensions?: boolean;
    webview_height_ratio?: 'compact' | 'tall' | 'full';
  };
  buttons?: Array<{
    type: 'postback' | 'web_url' | 'phone_number';
    title: string;
    payload?: string;
    url?: string;
  }>;
}

export interface FacebookMessengerAttachment {
  type: 'template' | 'image' | 'video' | 'audio' | 'file';
  payload?: {
    template_type?: 'generic' | 'button' | 'list' | 'receipt';
    text?: string;
    elements?: FacebookMessengerElement[];
    buttons?: Array<{
      type: 'postback' | 'web_url' | 'phone_number';
      title: string;
      payload?: string;
      url?: string;
    }>;
    // Receipt template specific
    recipient_name?: string;
    order_number?: string;
    currency?: string;
    payment_method?: string;
    summary?: {
      subtotal: number;
      shipping_cost: number;
      total_tax: number;
      total_cost: number;
    };
    // Media attachments
    url?: string;
    is_reusable?: boolean;
  };
}

export interface FacebookMessengerQuickReply {
  content_type: 'text' | 'user_phone_number' | 'user_email';
  title?: string;
  payload?: string;
  image_url?: string;
}

export interface ChatResponse {
  // Basic message data
  message?: string;
  messageType: 'text' | 'attachment' | 'quick_replies';
  
  // Facebook Messenger Platform format
  text?: string;
  attachment?: FacebookMessengerAttachment;
  quick_replies?: FacebookMessengerQuickReply[];
  
  // Legacy support
  buttons?: Array<{
    title: string;
    payload: string;
    type: 'postback';
  }>;
  
  // Session info
  sessionId: string;
  workflowEnded: boolean;
  
  // Workflow message detection
  inWorkFlowMsg: boolean;
  originalMessage?: string;
  
  // Metadata
  metadata?: {
    nodeId?: string;
    nodeType?: string;
    triggeredByButton?: {
      payload: string;
      title: string;
      fromNodeId?: string;
    };
  };
}

@Injectable()
export class ChatService {
  private workflowMachine = new WorkflowMachineService();

  constructor(
    @InjectRepository(ChatSession)
    private chatSessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) {}

  async processMessage(
    facebookUserId: string,
    message: string,
    workflowId?: string,
  ): Promise<ChatResponse> {
    // Find or create chat session
    let session = await this.findOrCreateSession(facebookUserId, workflowId);

    // Get workflow for button detection
    const workflow = await this.workflowRepository.findOne({
      where: { id: session.workflowId },
    });

    if (!workflow) {
      throw new NotFoundException('Workflow not found');
    }

    // Check if message is a button payload or quick reply
    let isButtonClick = false;
    let isQuickReply = false;
    let buttonTitle = '';
    const currentNode = workflow.nodes.find(node => node.id === session.currentState);
    
    // Check legacy buttons
    if (currentNode?.data.buttons) {
      const matchedButton = currentNode.data.buttons.find(
        button => button.payload === message
      );
      if (matchedButton) {
        isButtonClick = true;
        buttonTitle = matchedButton.title;
      }
    }

    // Check quick replies
    if (!isButtonClick && currentNode?.data.quickReplies) {
      const matchedQuickReply = currentNode.data.quickReplies.find(
        reply => reply.payload === message
      );
      if (matchedQuickReply) {
        isQuickReply = true;
        buttonTitle = matchedQuickReply.title;
      }
    }

    // Check new elements system
    if (!isButtonClick && !isQuickReply && currentNode?.data.elements) {
      for (const element of currentNode.data.elements) {
        if (element.type === 'button' && element.payload === message) {
          isButtonClick = true;
          buttonTitle = element.title || '';
          break;
        }
        if (element.type === 'quick_reply' && element.quickReplyPayload === message) {
          isQuickReply = true;
          buttonTitle = element.title || '';
          break;
        }
        if (element.type === 'generic_card' && element.buttons) {
          const matchedButton = element.buttons.find(btn => btn.payload === message);
          if (matchedButton) {
            isButtonClick = true;
            buttonTitle = matchedButton.title;
            break;
          }
        }
      }
    }

    // Save user message with interaction info
    const userMessageType = isButtonClick ? 'button' : isQuickReply ? 'quick_reply' : 'text';
    await this.saveMessage(session.id, facebookUserId, isButtonClick || isQuickReply ? buttonTitle : message, true, userMessageType, {
      buttonPayload: isButtonClick ? message : undefined,
      buttonTitle: isButtonClick ? buttonTitle : undefined,
      quickReplyPayload: isQuickReply ? message : undefined,
      quickReplyTitle: isQuickReply ? buttonTitle : undefined,
    });

    // Get workflow instance or create new one
    let workflowInstance = this.workflowMachine.getWorkflowInstance(session.id);
    
    if (!workflowInstance) {
      // Find start node - try 'start' type first, then fallback to first node or node with label containing 'start'
      let startNode = workflow.nodes.find(node => node.type === 'start');
      
      if (!startNode) {
        // Try to find node with 'Start' in label
        startNode = workflow.nodes.find(node => 
          node.data.label && node.data.label.toLowerCase().includes('start')
        );
      }
      
      if (!startNode && workflow.nodes.length > 0) {
        // Fallback to first node if no start node found
        startNode = workflow.nodes[0];
      }
      
      if (!startNode) {
        throw new NotFoundException('Workflow has no nodes');
      }

      workflowInstance = this.workflowMachine.createWorkflowInstance(
        session.id,
        workflow.nodes,
        workflow.edges,
        startNode.id,
      );
    }

    // Send message to workflow machine
    const context = this.workflowMachine.sendMessage(session.id, message);
    
    if (!context) {
      throw new Error('Failed to process message');
    }

    // Check if message matched workflow
    const messageMatchedWorkflow = context.messageMatchedWorkflow;

    // If message didn't match workflow, return original message for external processing
    if (!messageMatchedWorkflow) {
      const response: ChatResponse = {
        messageType: 'text',
        text: message,
        sessionId: session.id,
        workflowEnded: false,
        inWorkFlowMsg: false,
        originalMessage: message,
        metadata: {
          nodeId: session.currentState,
          nodeType: 'unmatched',
        }
      };

      // Save bot message indicating unmatched
      await this.saveMessage(session.id, facebookUserId, 
        `[UNMATCHED] ${message}`, false, 'unmatched', {
        originalMessage: message,
        inWorkFlowMsg: false,
        nodeId: session.currentState,
      });

      return response;
    }

    // Update session state for matched messages
    session.currentState = context.currentNodeId;
    session.context = context.variables;
    await this.chatSessionRepository.save(session);

    // Get current node to determine response
    const responseNode = workflow?.nodes.find(node => node.id === context.currentNodeId);
    
    if (!responseNode) {
      throw new NotFoundException('Current node not found in workflow');
    }

    // Generate Facebook Messenger Platform compatible response
    const response = this.generateMessengerResponse(responseNode, session.id, {
      workflowEnded: false,
      triggeredByButton: isButtonClick ? {
        payload: message,
        title: buttonTitle,
        fromNodeId: currentNode?.id,
      } : undefined,
      triggeredByQuickReply: isQuickReply ? {
        payload: message,
        title: buttonTitle,
        fromNodeId: currentNode?.id,
      } : undefined,
    });

    // Set workflow message flag for matched messages
    response.inWorkFlowMsg = true;
    response.originalMessage = responseNode.data.message || '';

    // Check if workflow ended
    const outgoingEdges = workflow?.edges.filter(edge => edge.source === context.currentNodeId) || [];
    response.workflowEnded = outgoingEdges.length === 0;

    if (response.workflowEnded) {
      this.workflowMachine.removeWorkflowInstance(session.id);
    }

    // Save bot message
    await this.saveMessage(session.id, facebookUserId, response.text || response.message || '', false, response.messageType as string, {
      attachment: response.attachment,
      quickReplies: response.quick_replies,
      buttons: response.buttons,
      nodeId: context.currentNodeId,
      nodeType: responseNode.data.messageType,
      inWorkFlowMsg: response.inWorkFlowMsg,
      originalMessage: response.originalMessage,
      triggeredByButton: isButtonClick ? {
        payload: message,
        title: buttonTitle,
        fromNodeId: currentNode?.id,
      } : undefined,
      triggeredByQuickReply: isQuickReply ? {
        payload: message,
        title: buttonTitle,
        fromNodeId: currentNode?.id,
      } : undefined,
    });

    return response;
  }

  private generateMessengerResponse(node: any, sessionId: string, context: any): ChatResponse {
    const nodeData = node.data;
    const elements = nodeData.elements || [];
    
    // Initialize response
    const response: ChatResponse = {
      messageType: 'text',
      sessionId,
      workflowEnded: context.workflowEnded,
      inWorkFlowMsg: true,
      originalMessage: nodeData.message || '',
      metadata: {
        nodeId: node.id,
        nodeType: nodeData.messageType || 'text',
        triggeredByButton: context.triggeredByButton,
      }
    };

    // Handle legacy message types first
    if (nodeData.messageType === 'quick_replies' && nodeData.quickReplies) {
      response.messageType = 'quick_replies';
      response.text = nodeData.message || '';
      response.quick_replies = nodeData.quickReplies.map(qr => ({
        content_type: 'text' as const,
        title: qr.title,
        payload: qr.payload,
        image_url: qr.imageUrl,
      }));
      return response;
    }

    if (nodeData.messageType === 'button_template' && nodeData.buttons) {
      response.messageType = 'attachment';
      response.attachment = {
        type: 'template',
        payload: {
          template_type: 'button',
          text: nodeData.message || '',
          buttons: nodeData.buttons.map(btn => ({
            type: btn.type || 'postback',
            title: btn.title,
            payload: btn.type === 'postback' ? btn.payload : undefined,
            url: btn.type === 'web_url' ? btn.url : undefined,
          })),
        },
      };
      return response;
    }

    if (nodeData.messageType === 'generic_template' && nodeData.elements) {
      response.messageType = 'attachment';
      response.attachment = {
        type: 'template',
        payload: {
          template_type: 'generic',
          elements: nodeData.elements.map(el => ({
            title: el.title,
            subtitle: el.subtitle,
            image_url: el.imageUrl,
            buttons: el.buttons?.map(btn => ({
              type: btn.type,
              title: btn.title,
              payload: btn.type === 'postback' ? btn.payload : undefined,
              url: btn.type === 'web_url' ? btn.url : undefined,
            })),
          })),
        },
      };
      return response;
    }

    if (nodeData.messageType === 'list_template' && nodeData.elements) {
      response.messageType = 'attachment';
      response.attachment = {
        type: 'template',
        payload: {
          template_type: 'list',
          elements: nodeData.elements.map(el => ({
            title: el.title,
            subtitle: el.subtitle,
            image_url: el.imageUrl,
          })),
        },
      };
      return response;
    }

    if (nodeData.messageType === 'receipt_template') {
      response.messageType = 'attachment';
      response.attachment = {
        type: 'template',
        payload: {
          template_type: 'receipt',
          recipient_name: nodeData.recipientName,
          order_number: nodeData.orderNumber,
          currency: nodeData.currency || 'USD',
          payment_method: nodeData.paymentMethod,
          summary: nodeData.summary ? {
            subtotal: nodeData.summary.subtotal,
            shipping_cost: nodeData.summary.shippingCost,
            total_tax: nodeData.summary.totalTax,
            total_cost: nodeData.summary.totalCost,
          } : undefined,
          elements: nodeData.elements?.map(el => ({
            title: el.title,
            subtitle: el.subtitle,
            quantity: el.quantity || 1,
            price: el.price || 0,
            currency: nodeData.currency || 'USD',
          })),
        },
      };
      return response;
    }

    if ((nodeData.messageType === 'image' || nodeData.messageType === 'video' || nodeData.messageType === 'file') && nodeData.attachmentUrl) {
      response.messageType = 'attachment';
      response.attachment = {
        type: nodeData.messageType,
        payload: {
          url: nodeData.attachmentUrl,
          is_reusable: true,
        },
      };
      return response;
    }

    // Handle new flexible elements system with improved priority logic
    if (elements.length > 0) {
      const textElements = elements.filter(el => el.type === 'text');
      const imageElements = elements.filter(el => el.type === 'image');
      const videoElements = elements.filter(el => el.type === 'video');
      const fileElements = elements.filter(el => el.type === 'file');
      const buttonElements = elements.filter(el => el.type === 'button');
      const quickReplyElements = elements.filter(el => el.type === 'quick_reply');
      const genericCardElements = elements.filter(el => el.type === 'generic_card');
      const listItemElements = elements.filter(el => el.type === 'list_item');

      // Priority 1: If there are quick reply elements, use quick replies format
      if (quickReplyElements.length > 0) {
        response.messageType = 'quick_replies';
        response.text = textElements.map(el => el.content).join('\n') || nodeData.message || '';
        response.quick_replies = quickReplyElements.map(qr => ({
          content_type: 'text' as const,
          title: qr.title || '',
          payload: qr.quickReplyPayload || '',
          image_url: qr.imageUrl,
        }));
        return response;
      }

      // Priority 2: If there are explicit generic card elements, use generic template
      if (genericCardElements.length > 0) {
        response.messageType = 'attachment';
        response.attachment = {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: genericCardElements.map(card => ({
              title: card.title,
              subtitle: card.subtitle,
              image_url: card.imageUrl,
              buttons: card.buttons?.map(btn => ({
                type: btn.type,
                title: btn.title,
                payload: btn.type === 'postback' ? btn.payload : undefined,
                url: btn.type === 'web_url' ? btn.url : undefined,
              })),
            })),
          },
        };
        return response;
      }

      // Priority 3: AUTO-CREATE Generic Template when there are mixed content types
      // This handles the case when user adds text + image + buttons in flexible elements
      const hasMultipleContentTypes = [
        textElements.length > 0,
        imageElements.length > 0,
        buttonElements.length > 0
      ].filter(Boolean).length >= 2;

      if (hasMultipleContentTypes) {
        // Create a generic card from mixed elements
        const combinedText = textElements.map(el => el.content).join('\n') || nodeData.message || '';
        const imageUrl = imageElements.length > 0 ? imageElements[0].imageUrl : undefined;
        
        response.messageType = 'attachment';
        response.attachment = {
          type: 'template',
          payload: {
            template_type: 'generic',
            elements: [{
              title: combinedText || 'Message',
              subtitle: imageElements.length > 1 ? `+${imageElements.length - 1} more images` : undefined,
              image_url: imageUrl,
              buttons: buttonElements.map(btn => ({
                type: btn.buttonType || 'postback',
                title: btn.title || '',
                payload: btn.buttonType === 'postback' ? btn.payload : undefined,
                url: btn.buttonType === 'web_url' ? btn.url : undefined,
              })),
            }],
          },
        };
        return response;
      }

      // Priority 4: If there are list item elements, use list template
      if (listItemElements.length > 0) {
        response.messageType = 'attachment';
        response.attachment = {
          type: 'template',
          payload: {
            template_type: 'list',
            elements: listItemElements.map(item => ({
              title: item.title,
              subtitle: item.subtitle,
            })),
          },
        };
        return response;
      }

      // Priority 5: If there are button elements only, use button template
      if (buttonElements.length > 0) {
        response.messageType = 'attachment';
        response.attachment = {
          type: 'template',
          payload: {
            template_type: 'button',
            text: textElements.map(el => el.content).join('\n') || nodeData.message || '',
            buttons: buttonElements.map(btn => ({
              type: btn.buttonType || 'postback',
              title: btn.title || '',
              payload: btn.buttonType === 'postback' ? btn.payload : undefined,
              url: btn.buttonType === 'web_url' ? btn.url : undefined,
            })),
          },
        };
        return response;
      }

      // Priority 6: Single media elements (when no mixed content)
      if (imageElements.length > 0 && textElements.length === 0 && buttonElements.length === 0) {
        const imageElement = imageElements[0];
        response.messageType = 'attachment';
        response.attachment = {
          type: 'image',
          payload: {
            url: imageElement.imageUrl || '',
            is_reusable: true,
          },
        };
        return response;
      }

      if (videoElements.length > 0 && textElements.length === 0 && buttonElements.length === 0) {
        const videoElement = videoElements[0];
        response.messageType = 'attachment';
        response.attachment = {
          type: 'video',
          payload: {
            url: videoElement.fileUrl || '',
            is_reusable: true,
          },
        };
        return response;
      }

      if (fileElements.length > 0 && textElements.length === 0 && buttonElements.length === 0) {
        const fileElement = fileElements[0];
        response.messageType = 'attachment';
        response.attachment = {
          type: 'file',
          payload: {
            url: fileElement.fileUrl || '',
            is_reusable: true,
          },
        };
        return response;
      }

      // Priority 7: If only text elements, combine them
      if (textElements.length > 0) {
        response.text = textElements.map(el => el.content).join('\n');
        return response;
      }
    }

    // Fallback to basic text message
    response.text = nodeData.message || 'No message configured';
    response.message = response.text; // For legacy compatibility
    
    // Add legacy buttons support
    if (nodeData.buttons && nodeData.buttons.length > 0) {
      response.buttons = nodeData.buttons.map(button => ({
        ...button,
        type: 'postback' as const,
      }));
    }

    return response;
  }

  private async findOrCreateSession(
    facebookUserId: string,
    workflowId?: string,
  ): Promise<ChatSession> {
    // Try to find existing active session
    let session = await this.chatSessionRepository.findOne({
      where: {
        facebookUserId,
      },
      order: { createdAt: 'DESC' },
    });

    if (!session || session.currentState === 'ended') {
      // Get active workflow if not specified
      if (!workflowId) {
        const activeWorkflow = await this.workflowRepository.findOne({
          where: { isActive: true },
        });
        
        if (!activeWorkflow) {
          throw new NotFoundException('No active workflow found');
        }
        
        workflowId = activeWorkflow.id;
      }

      // Create new session
      session = this.chatSessionRepository.create({
        facebookUserId,
        workflowId,
        currentState: 'waiting', // Set initial state
        context: {},
      });

      session = await this.chatSessionRepository.save(session);
    }

    return session;
  }

  private async saveMessage(
    sessionId: string,
    facebookUserId: string,
    messageText: string,
    isFromUser: boolean,
    messageType: string,
    metadata: Record<string, any> = {},
  ): Promise<ChatMessage> {
    const message = this.chatMessageRepository.create({
      sessionId,
      facebookUserId,
      messageText,
      isFromUser,
      messageType,
      metadata,
    });

    return this.chatMessageRepository.save(message);
  }

  async getChatHistory(
    facebookUserId: string,
    limit: number = 50,
  ): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { facebookUserId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getSessionHistory(sessionId: string): Promise<ChatMessage[]> {
    return this.chatMessageRepository.find({
      where: { sessionId },
      order: { createdAt: 'ASC' },
    });
  }

  async endSession(sessionId: string): Promise<void> {
    const session = await this.chatSessionRepository.findOne({
      where: { id: sessionId },
    });

    if (session) {
      session.currentState = 'ended';
      await this.chatSessionRepository.save(session);
      this.workflowMachine.removeWorkflowInstance(sessionId);
    }
  }

  async resetSession(facebookUserId: string): Promise<void> {
    // End all active sessions for this user
    const activeSessions = await this.chatSessionRepository.find({
      where: {
        facebookUserId,
      },
    });

    for (const session of activeSessions) {
      if (session.currentState !== 'ended') {
        await this.endSession(session.id);
      }
    }
  }
} 