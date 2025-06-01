import { createMachine, assign, interpret, ActorRefFrom } from 'xstate';
import { WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';

export interface WorkflowContext {
  currentNodeId: string;
  userMessage: string;
  botResponse: string;
  variables: Record<string, any>;
  facebookUserId: string;
  conversationHistory: Array<{
    message: string;
    isFromUser: boolean;
    timestamp: Date;
  }>;
  messageMatchedWorkflow: boolean;
}

export type WorkflowEvent =
  | { type: 'USER_MESSAGE'; message: string }
  | { type: 'NEXT_NODE'; nodeId?: string }
  | { type: 'RESET' }
  | { type: 'SET_VARIABLE'; variables: Record<string, any> };

export const createWorkflowMachine = (
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  startNodeId: string,
) => {
  const findNode = (nodeId: string): WorkflowNode | undefined =>
    nodes.find((node) => node.id === nodeId);

  // Enhanced matching helper function
  const matchesNodeContent = (node: WorkflowNode, userInput: string): boolean => {
    const input = userInput.toLowerCase().trim();
    
    console.log(`[WORKFLOW DEBUG] Checking node ${node.id} (${node.data.label}) against input: "${userInput}"`);
    
    // Special handling for start node
    const isStartNode = node.id === startNodeId || 
                       node.data.label?.toLowerCase().includes('start') || 
                       node.data.messageType === 'start' ||
                       node.type === 'start';
    
    if (isStartNode) {
      console.log(`[WORKFLOW DEBUG] This is a START NODE`);
      // Start node keywords
      const startKeywords = ['start', 'bắt đầu', 'khởi động', 'chào', 'hello', 'hi', 'xin chào', 'menu chính', 'trang chủ'];
      const startKeywordMatch = startKeywords.some(keyword => input.includes(keyword));
      if (startKeywordMatch) {
        console.log(`[WORKFLOW DEBUG] ✅ MATCHED via start keywords`);
        return true;
      }
    }
    
    // 1. Check legacy buttons
    if (node.data.buttons) {
      console.log(`[WORKFLOW DEBUG] Node has ${node.data.buttons.length} legacy buttons:`, node.data.buttons);
      const buttonMatch = node.data.buttons.some(button => {
        const payloadMatch = button.payload === userInput;
        const titleMatch = button.title.toLowerCase().includes(input);
        console.log(`[WORKFLOW DEBUG] Button "${button.title}" (payload: "${button.payload}") - Payload match: ${payloadMatch}, Title match: ${titleMatch}`);
        return payloadMatch || titleMatch;
      });
      if (buttonMatch) {
        console.log(`[WORKFLOW DEBUG] ✅ MATCHED via legacy buttons`);
        return true;
      }
    }
    
    // 2. Check legacy quick replies
    if (node.data.quickReplies) {
      console.log(`[WORKFLOW DEBUG] Node has ${node.data.quickReplies.length} quick replies:`, node.data.quickReplies);
      const quickReplyMatch = node.data.quickReplies.some(reply => {
        const payloadMatch = reply.payload === userInput;
        const titleMatch = reply.title.toLowerCase().includes(input);
        console.log(`[WORKFLOW DEBUG] Quick reply "${reply.title}" (payload: "${reply.payload}") - Payload match: ${payloadMatch}, Title match: ${titleMatch}`);
        return payloadMatch || titleMatch;
      });
      if (quickReplyMatch) {
        console.log(`[WORKFLOW DEBUG] ✅ MATCHED via quick replies`);
        return true;
      }
    }
    
    // 3. Check new elements system
    if (node.data.elements) {
      console.log(`[WORKFLOW DEBUG] Node has ${node.data.elements.length} elements:`, node.data.elements);
      for (const element of node.data.elements) {
        switch (element.type) {
          case 'button':
            const buttonPayloadMatch = element.payload === userInput;
            const buttonTitleMatch = element.title && element.title.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Button element "${element.title}" (payload: "${element.payload}") - Payload match: ${buttonPayloadMatch}, Title match: ${buttonTitleMatch}`);
            if (buttonPayloadMatch || buttonTitleMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via button element`);
              return true;
            }
            break;
            
          case 'quick_reply':
            const qrPayloadMatch = element.quickReplyPayload === userInput;
            const qrTitleMatch = element.title && element.title.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Quick reply element "${element.title}" (payload: "${element.quickReplyPayload}") - Payload match: ${qrPayloadMatch}, Title match: ${qrTitleMatch}`);
            if (qrPayloadMatch || qrTitleMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via quick reply element`);
              return true;
            }
            break;
            
          case 'text':
            const textMatch = element.content && element.content.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Text element content: "${element.content}" - Match: ${textMatch}`);
            if (textMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via text element`);
              return true;
            }
            break;
            
          case 'image':
            // Match by title, alt text, or filename
            const imageTitleMatch = element.title && element.title.toLowerCase().includes(input);
            const imageUrlMatch = element.imageUrl && element.imageUrl.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Image element "${element.title}" (url: "${element.imageUrl}") - Title match: ${imageTitleMatch}, URL match: ${imageUrlMatch}`);
            if (imageTitleMatch || imageUrlMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via image element`);
              return true;
            }
            break;
            
          case 'video':
            const videoTitleMatch = element.title && element.title.toLowerCase().includes(input);
            const videoUrlMatch = element.fileUrl && element.fileUrl.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Video element "${element.title}" (url: "${element.fileUrl}") - Title match: ${videoTitleMatch}, URL match: ${videoUrlMatch}`);
            if (videoTitleMatch || videoUrlMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via video element`);
              return true;
            }
            break;
            
          case 'file':
            const fileTitleMatch = element.title && element.title.toLowerCase().includes(input);
            const fileUrlMatch = element.fileUrl && element.fileUrl.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] File element "${element.title}" (url: "${element.fileUrl}") - Title match: ${fileTitleMatch}, URL match: ${fileUrlMatch}`);
            if (fileTitleMatch || fileUrlMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via file element`);
              return true;
            }
            break;
            
          case 'generic_card':
            // Check card title, subtitle
            const cardTitleMatch = element.title && element.title.toLowerCase().includes(input);
            const cardSubtitleMatch = element.subtitle && element.subtitle.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] Generic card "${element.title}" / "${element.subtitle}" - Title match: ${cardTitleMatch}, Subtitle match: ${cardSubtitleMatch}`);
            if (cardTitleMatch || cardSubtitleMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via generic card title/subtitle`);
              return true;
            }
            // Check card buttons
            if (element.buttons) {
              const cardButtonMatch = element.buttons.some(btn => {
                const btnPayloadMatch = btn.payload === userInput;
                const btnTitleMatch = btn.title.toLowerCase().includes(input);
                console.log(`[WORKFLOW DEBUG] Card button "${btn.title}" (payload: "${btn.payload}") - Payload match: ${btnPayloadMatch}, Title match: ${btnTitleMatch}`);
                return btnPayloadMatch || btnTitleMatch;
              });
              if (cardButtonMatch) {
                console.log(`[WORKFLOW DEBUG] ✅ MATCHED via generic card button`);
                return true;
              }
            }
            break;
            
          case 'list_item':
            const listTitleMatch = element.title && element.title.toLowerCase().includes(input);
            const listSubtitleMatch = element.subtitle && element.subtitle.toLowerCase().includes(input);
            console.log(`[WORKFLOW DEBUG] List item "${element.title}" / "${element.subtitle}" - Title match: ${listTitleMatch}, Subtitle match: ${listSubtitleMatch}`);
            if (listTitleMatch || listSubtitleMatch) {
              console.log(`[WORKFLOW DEBUG] ✅ MATCHED via list item`);
              return true;
            }
            break;
        }
      }
    }
    
    // 4. Check node message content directly
    const messageMatch = node.data.message && node.data.message.toLowerCase().includes(input);
    console.log(`[WORKFLOW DEBUG] Node message: "${node.data.message}" - Match: ${messageMatch}`);
    if (messageMatch) {
      console.log(`[WORKFLOW DEBUG] ✅ MATCHED via node message`);
      return true;
    }
    
    // 5. Check node label
    const labelMatch = node.data.label && node.data.label.toLowerCase().includes(input);
    console.log(`[WORKFLOW DEBUG] Node label: "${node.data.label}" - Match: ${labelMatch}`);
    if (labelMatch) {
      console.log(`[WORKFLOW DEBUG] ✅ MATCHED via node label`);
      return true;
    }
    
    // 6. Special handling for receipt nodes
    if (node.data.messageType === 'receipt') {
      const receiptKeywords = ['receipt', 'bill', 'order', 'payment', 'invoice', 'hóa đơn', 'đơn hàng', 'thanh toán'];
      const keywordMatch = receiptKeywords.some(keyword => input.includes(keyword));
      console.log(`[WORKFLOW DEBUG] Receipt node - keyword match: ${keywordMatch}`);
      if (keywordMatch) {
        console.log(`[WORKFLOW DEBUG] ✅ MATCHED via receipt keywords`);
        return true;
      }
      
      // Check receipt specific fields
      const recipientMatch = node.data.recipientName && node.data.recipientName.toLowerCase().includes(input);
      const orderMatch = node.data.orderNumber && node.data.orderNumber.toLowerCase().includes(input);
      console.log(`[WORKFLOW DEBUG] Receipt fields - recipient match: ${recipientMatch}, order match: ${orderMatch}`);
      if (recipientMatch || orderMatch) {
        console.log(`[WORKFLOW DEBUG] ✅ MATCHED via receipt fields`);
        return true;
      }
    }
    
    console.log(`[WORKFLOW DEBUG] ❌ NO MATCH found for node ${node.id}`);
    return false;
  };

  const findNextNode = (currentNodeId: string, userInput?: string): { nodeId: string | null, matched: boolean } => {
    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);
    
    console.log(`[FINDNODE DEBUG] Current node: ${currentNodeId}, User input: "${userInput}"`);
    console.log(`[FINDNODE DEBUG] Outgoing edges:`, outgoingEdges);
    
    if (outgoingEdges.length === 0) {
      console.log(`[FINDNODE DEBUG] No outgoing edges - end of workflow`);
      return { nodeId: null, matched: false }; // End of workflow
    }

    // If there's user input, try to match with current node first
    if (userInput) {
      const input = userInput.toLowerCase().trim();
      
      // Special keywords to return to start node
      const startKeywords = ['start', 'bắt đầu', 'khởi động', 'reset', 'restart', 'về đầu', 'quay lại'];
      if (startKeywords.some(keyword => input.includes(keyword))) {
        console.log(`[FINDNODE DEBUG] ✅ Start keyword detected, returning to start node: ${startNodeId}`);
        return { nodeId: startNodeId, matched: true };
      }
      
      const currentNode = findNode(currentNodeId);
      console.log(`[FINDNODE DEBUG] Current node data:`, currentNode?.data);
      
      // Enhanced matching for current node
      if (currentNode && matchesNodeContent(currentNode, userInput)) {
        console.log(`[FINDNODE DEBUG] ✅ Input matched current node content`);
        
        // For exact payload matches, find corresponding edge
        if (currentNode.data.buttons) {
          console.log(`[FINDNODE DEBUG] Found ${currentNode.data.buttons.length} legacy buttons:`, currentNode.data.buttons);
          
          for (let i = 0; i < currentNode.data.buttons.length; i++) {
            const button = currentNode.data.buttons[i];
            
            if (button.payload === userInput) {
              console.log(`[FINDNODE DEBUG] Found exact button match at index ${i}:`, button);
              
              // Try to find edge with matching sourceHandle first
              let edge = outgoingEdges.find((e) => e.sourceHandle === button.payload);
              
              // If no sourceHandle match and multiple edges, use button index to select edge
              if (!edge && outgoingEdges.length > 1) {
                edge = outgoingEdges[i] || outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] No sourceHandle match, using edge at index ${i}:`, edge);
              } else if (!edge) {
                edge = outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] Using first edge:`, edge);
              }
              
              console.log(`[FINDNODE DEBUG] Selected edge for button:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
            
            if (button.title.toLowerCase() === userInput.toLowerCase()) {
              console.log(`[FINDNODE DEBUG] Found title button match at index ${i}:`, button);
              
              // Try to find edge with matching sourceHandle first
              let edge = outgoingEdges.find((e) => e.sourceHandle === button.payload);
              
              // If no sourceHandle match and multiple edges, use button index to select edge
              if (!edge && outgoingEdges.length > 1) {
                edge = outgoingEdges[i] || outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] No sourceHandle match for title, using edge at index ${i}:`, edge);
              } else if (!edge) {
                edge = outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] Using first edge for title:`, edge);
              }
              
              console.log(`[FINDNODE DEBUG] Selected edge for title button:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
          }
        }
        
        if (currentNode.data.quickReplies) {
          const exactQuickReply = currentNode.data.quickReplies.find(reply => reply.payload === userInput);
          if (exactQuickReply) {
            console.log(`[FINDNODE DEBUG] Found exact quick reply match:`, exactQuickReply);
            // Try to find edge with matching sourceHandle, otherwise use first edge
            const edge = outgoingEdges.find((e) => e.sourceHandle === exactQuickReply.payload) || outgoingEdges[0];
            console.log(`[FINDNODE DEBUG] Selected edge for quick reply:`, edge);
            if (edge) {
              return { nodeId: edge.target, matched: true };
            }
          }
          
          // Also try to match by title
          const titleQuickReply = currentNode.data.quickReplies.find(reply => 
            reply.title.toLowerCase() === userInput.toLowerCase()
          );
          if (titleQuickReply && !exactQuickReply) {
            console.log(`[FINDNODE DEBUG] Found title quick reply match:`, titleQuickReply);
            const edge = outgoingEdges.find((e) => e.sourceHandle === titleQuickReply.payload) || outgoingEdges[0];
            console.log(`[FINDNODE DEBUG] Selected edge for title quick reply:`, edge);
            if (edge) {
              return { nodeId: edge.target, matched: true };
            }
          }
        }
        
        if (currentNode.data.elements) {
          console.log(`[FINDNODE DEBUG] Checking elements:`, currentNode.data.elements);
          
          // Find all button elements
          const buttonElements = currentNode.data.elements.filter(el => el.type === 'button');
          console.log(`[FINDNODE DEBUG] Found ${buttonElements.length} button elements:`, buttonElements);
          
          for (let i = 0; i < buttonElements.length; i++) {
            const element = buttonElements[i];
            
            if (element.payload === userInput) {
              console.log(`[FINDNODE DEBUG] Found exact element button match at index ${i}:`, element);
              
              // Try to find edge with matching sourceHandle first
              let edge = outgoingEdges.find((e) => e.sourceHandle === element.payload);
              
              // If no sourceHandle match and multiple edges, use button index to select edge
              if (!edge && outgoingEdges.length > 1) {
                edge = outgoingEdges[i] || outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] No sourceHandle match, using edge at index ${i}:`, edge);
              } else if (!edge) {
                edge = outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] Using first edge:`, edge);
              }
              
              console.log(`[FINDNODE DEBUG] Selected edge for element button:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
            
            if (element.title && element.title.toLowerCase() === userInput.toLowerCase()) {
              console.log(`[FINDNODE DEBUG] Found element title match at index ${i}:`, element);
              
              // Try to find edge with matching sourceHandle first
              let edge = outgoingEdges.find((e) => e.sourceHandle === element.payload);
              
              // If no sourceHandle match and multiple edges, use button index to select edge
              if (!edge && outgoingEdges.length > 1) {
                edge = outgoingEdges[i] || outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] No sourceHandle match for title, using edge at index ${i}:`, edge);
              } else if (!edge) {
                edge = outgoingEdges[0];
                console.log(`[FINDNODE DEBUG] Using first edge for title:`, edge);
              }
              
              console.log(`[FINDNODE DEBUG] Selected edge for element title:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
          }
          
          // Check non-button elements
          const nonButtonElements = currentNode.data.elements.filter(el => el.type !== 'button');
          for (const element of nonButtonElements) {
            if (element.type === 'quick_reply' && element.quickReplyPayload === userInput) {
              console.log(`[FINDNODE DEBUG] Found exact element quick reply match:`, element);
              // Try to find edge with matching sourceHandle, otherwise use first edge
              const edge = outgoingEdges.find((e) => e.sourceHandle === element.quickReplyPayload) || outgoingEdges[0];
              console.log(`[FINDNODE DEBUG] Selected edge for element quick reply:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
            
            // Also try to match by title for quick_reply
            if (element.type === 'quick_reply' && 
                element.title && element.title.toLowerCase() === userInput.toLowerCase()) {
              console.log(`[FINDNODE DEBUG] Found quick reply title match:`, element);
              const edge = outgoingEdges.find((e) => e.sourceHandle === element.quickReplyPayload) || outgoingEdges[0];
              console.log(`[FINDNODE DEBUG] Selected edge for quick reply title:`, edge);
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
          }
        }
        
        // For content matches (not exact payload), use first available edge
        if (outgoingEdges.length > 0) {
          console.log(`[FINDNODE DEBUG] Using first available edge for content match:`, outgoingEdges[0]);
          return { nodeId: outgoingEdges[0].target, matched: true };
        }
      } else {
        console.log(`[FINDNODE DEBUG] ❌ Input did not match current node content`);
      }

      // FALLBACK: Search in ALL nodes (including start node)
      console.log(`[FINDNODE DEBUG] Searching in all nodes for fallback match...`);
      
      // Create a list of nodes to search, prioritizing start node
      const startNode = findNode(startNodeId);
      const otherNodes = nodes.filter(node => node.id !== currentNodeId && node.id !== startNodeId);
      const nodesToSearch = startNode ? [startNode, ...otherNodes] : otherNodes;
      
      console.log(`[FINDNODE DEBUG] Searching in ${nodesToSearch.length} nodes (start node first)`);
      
      for (const node of nodesToSearch) {
        console.log(`[FINDNODE DEBUG] Checking fallback node: ${node.id} (${node.data.label})`);
        
        // Use enhanced matching for all nodes
        if (matchesNodeContent(node, userInput)) {
          console.log(`[FINDNODE DEBUG] ✅ Found fallback match in node: ${node.id}`);
          return { nodeId: node.id, matched: true };
        }
      }
    }

    // No match found anywhere in workflow
    console.log(`[FINDNODE DEBUG] ❌ No match found anywhere in workflow`);
    return { nodeId: null, matched: false };
  };

  return createMachine({
    id: 'chatbot-workflow',
    initial: 'waiting',
    context: {
      currentNodeId: startNodeId,
      userMessage: '',
      botResponse: '',
      variables: {},
      facebookUserId: '',
      conversationHistory: [],
      messageMatchedWorkflow: false,
    } as WorkflowContext,
    states: {
      waiting: {
        on: {
          USER_MESSAGE: {
            target: 'processing',
            actions: assign({
              userMessage: ({ event }) => event.message,
              conversationHistory: ({ context, event }) => [
                ...context.conversationHistory,
                {
                  message: event.message,
                  isFromUser: true,
                  timestamp: new Date(),
                },
              ],
            }),
          },
          RESET: {
            target: 'waiting',
            actions: assign({
              currentNodeId: startNodeId,
              userMessage: '',
              botResponse: '',
              variables: {},
              conversationHistory: [],
              messageMatchedWorkflow: false,
            }),
          },
        },
      },
      processing: {
        entry: assign({
          currentNodeId: ({ context }) => {
            const { nodeId, matched } = findNextNode(context.currentNodeId, context.userMessage);
            return nodeId || context.currentNodeId;
          },
          messageMatchedWorkflow: ({ context }) => {
            const { nodeId, matched } = findNextNode(context.currentNodeId, context.userMessage);
            return matched;
          },
        }),
        always: [
          {
            target: 'responding',
            guard: ({ context }) => {
              const currentNode = findNode(context.currentNodeId);
              return !!currentNode?.data.message && context.messageMatchedWorkflow;
            },
          },
          {
            target: 'unmatched',
            guard: ({ context }) => !context.messageMatchedWorkflow,
          },
          {
            target: 'ended',
            guard: ({ context }) => {
              const outgoingEdges = edges.filter((edge) => edge.source === context.currentNodeId);
              return outgoingEdges.length === 0;
            },
          },
          {
            target: 'waiting',
          },
        ],
      },
      responding: {
        entry: assign({
          botResponse: ({ context }) => {
            const currentNode = findNode(context.currentNodeId);
            return currentNode?.data.message || 'No response available';
          },
          conversationHistory: ({ context }) => [
            ...context.conversationHistory,
            {
              message: context.botResponse,
              isFromUser: false,
              timestamp: new Date(),
            },
          ],
        }),
        on: {
          NEXT_NODE: {
            target: 'waiting',
            actions: assign({
              currentNodeId: ({ event }) => event.nodeId || '',
            }),
          },
          USER_MESSAGE: {
            target: 'processing',
            actions: assign({
              userMessage: ({ event }) => event.message,
              conversationHistory: ({ context, event }) => [
                ...context.conversationHistory,
                {
                  message: event.message,
                  isFromUser: true,
                  timestamp: new Date(),
                },
              ],
            }),
          },
        },
      },
      unmatched: {
        entry: assign({
          botResponse: ({ context }) => {
            // For unmatched messages, return the original user message
            return context.userMessage;
          },
          conversationHistory: ({ context }) => [
            ...context.conversationHistory,
            {
              message: context.userMessage,
              isFromUser: false,
              timestamp: new Date(),
            },
          ],
        }),
        always: {
          target: 'waiting',
        },
        on: {
          USER_MESSAGE: {
            target: 'processing',
            actions: assign({
              userMessage: ({ event }) => event.message,
              conversationHistory: ({ context, event }) => [
                ...context.conversationHistory,
                {
                  message: event.message,
                  isFromUser: true,
                  timestamp: new Date(),
                },
              ],
            }),
          },
        },
      },
      ended: {
        type: 'final',
      },
    },
  });
};

export class WorkflowMachineService {
  private machines: Map<string, ActorRefFrom<ReturnType<typeof createWorkflowMachine>>> = new Map();

  createWorkflowInstance(
    sessionId: string,
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    startNodeId: string,
  ) {
    const machine = createWorkflowMachine(nodes, edges, startNodeId);
    const service = interpret(machine);
    
    this.machines.set(sessionId, service);
    service.start();
    
    return service;
  }

  getWorkflowInstance(sessionId: string) {
    return this.machines.get(sessionId);
  }

  removeWorkflowInstance(sessionId: string) {
    const service = this.machines.get(sessionId);
    if (service) {
      service.stop();
      this.machines.delete(sessionId);
    }
  }

  sendMessage(sessionId: string, message: string) {
    const service = this.machines.get(sessionId);
    if (service) {
      service.send({ type: 'USER_MESSAGE', message });
      return service.getSnapshot().context;
    }
    return null;
  }

  getCurrentState(sessionId: string) {
    const service = this.machines.get(sessionId);
    if (service) {
      return service.getSnapshot().context;
    }
    return null;
  }
} 