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

  const findNextNode = (currentNodeId: string, userInput?: string): { nodeId: string | null, matched: boolean } => {
    const outgoingEdges = edges.filter((edge) => edge.source === currentNodeId);
    
    if (outgoingEdges.length === 0) {
      return { nodeId: null, matched: false }; // End of workflow
    }

    // If there's user input, try to match with current node first
    if (userInput) {
      const currentNode = findNode(currentNodeId);
      
      // Check current node buttons
      if (currentNode?.data.buttons) {
        const matchedButton = currentNode.data.buttons.find(
          (button) => button.payload === userInput
        );
        if (matchedButton) {
          // Find edge that corresponds to this button by sourceHandle
          let edge = outgoingEdges.find((e) => e.sourceHandle === matchedButton.payload);
          
          // If no sourceHandle match, try to find by button index or just use first edge for now
          if (!edge && outgoingEdges.length > 0) {
            const buttonIndex = currentNode.data.buttons.findIndex(
              (button) => button.payload === userInput
            );
            edge = outgoingEdges[buttonIndex] || outgoingEdges[0];
          }
          
          if (edge) {
            return { nodeId: edge.target, matched: true };
          }
        }
      }
      
      // Check current node quick replies
      if (currentNode?.data.quickReplies) {
        const matchedQuickReply = currentNode.data.quickReplies.find(
          (reply) => reply.payload === userInput
        );
        if (matchedQuickReply) {
          // For quick replies, use first available edge or find by payload
          const edge = outgoingEdges.find((e) => e.sourceHandle === matchedQuickReply.payload) || outgoingEdges[0];
          if (edge) {
            return { nodeId: edge.target, matched: true };
          }
        }
      }
      
      // Check current node elements system (buttons in elements)
      if (currentNode?.data.elements) {
        for (const element of currentNode.data.elements) {
          if (element.type === 'button' && element.payload === userInput) {
            const edge = outgoingEdges.find((e) => e.sourceHandle === element.payload) || outgoingEdges[0];
            if (edge) {
              return { nodeId: edge.target, matched: true };
            }
          }
          if (element.type === 'quick_reply' && element.quickReplyPayload === userInput) {
            const edge = outgoingEdges.find((e) => e.sourceHandle === element.quickReplyPayload) || outgoingEdges[0];
            if (edge) {
              return { nodeId: edge.target, matched: true };
            }
          }
          if (element.type === 'generic_card' && element.buttons) {
            const matchedButton = element.buttons.find(btn => btn.payload === userInput);
            if (matchedButton) {
              const edge = outgoingEdges.find((e) => e.sourceHandle === matchedButton.payload) || outgoingEdges[0];
              if (edge) {
                return { nodeId: edge.target, matched: true };
              }
            }
          }
        }
      }

      // FALLBACK: If no match in current node, search in ALL nodes
      for (const node of nodes) {
        if (node.id === currentNodeId) continue; // Skip current node (already checked)
        
        // Check node buttons
        if (node.data.buttons) {
          const matchedButton = node.data.buttons.find(
            (button) => button.payload === userInput
          );
          if (matchedButton) {
            // Found match in another node, return that node
            return { nodeId: node.id, matched: true };
          }
        }
        
        // Check node quick replies
        if (node.data.quickReplies) {
          const matchedQuickReply = node.data.quickReplies.find(
            (reply) => reply.payload === userInput
          );
          if (matchedQuickReply) {
            return { nodeId: node.id, matched: true };
          }
        }
        
        // Check node elements
        if (node.data.elements) {
          for (const element of node.data.elements) {
            if (element.type === 'button' && element.payload === userInput) {
              return { nodeId: node.id, matched: true };
            }
            if (element.type === 'quick_reply' && element.quickReplyPayload === userInput) {
              return { nodeId: node.id, matched: true };
            }
            if (element.type === 'generic_card' && element.buttons) {
              const matchedButton = element.buttons.find(btn => btn.payload === userInput);
              if (matchedButton) {
                return { nodeId: node.id, matched: true };
              }
            }
          }
        }
      }
    }

    // No match found anywhere in workflow
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