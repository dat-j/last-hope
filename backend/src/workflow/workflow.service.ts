import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow, WorkflowNode, WorkflowEdge } from '../entities/workflow.entity';
import { CreateWorkflowDto, UpdateWorkflowDto } from './dto/workflow.dto';

@Injectable()
export class WorkflowService {
  constructor(
    @InjectRepository(Workflow)
    private workflowRepository: Repository<Workflow>,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto, userId: string): Promise<Workflow> {
    const workflow = this.workflowRepository.create({
      ...createWorkflowDto,
      userId,
    });

    return this.workflowRepository.save(workflow);
  }

  async findAll(userId: string): Promise<Workflow[]> {
    return this.workflowRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, userId: string): Promise<Workflow> {
    const workflow = await this.workflowRepository.findOne({
      where: { id, userId },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return workflow;
  }

  async update(id: string, updateWorkflowDto: UpdateWorkflowDto, userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);
    
    Object.assign(workflow, updateWorkflowDto);
    
    return this.workflowRepository.save(workflow);
  }

  async remove(id: string, userId: string): Promise<void> {
    const workflow = await this.findOne(id, userId);
    await this.workflowRepository.remove(workflow);
  }

  async updateNodes(id: string, nodes: WorkflowNode[], userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);
    workflow.nodes = nodes;
    return this.workflowRepository.save(workflow);
  }

  async updateEdges(id: string, edges: WorkflowEdge[], userId: string): Promise<Workflow> {
    const workflow = await this.findOne(id, userId);
    workflow.edges = edges;
    return this.workflowRepository.save(workflow);
  }

  async activateWorkflow(id: string, userId: string): Promise<Workflow> {
    // Deactivate all other workflows for this user
    await this.workflowRepository.update(
      { userId, isActive: true },
      { isActive: false }
    );

    // Activate the specified workflow
    const workflow = await this.findOne(id, userId);
    workflow.isActive = true;
    return this.workflowRepository.save(workflow);
  }

  async getActiveWorkflow(userId: string): Promise<Workflow | null> {
    return this.workflowRepository.findOne({
      where: { userId, isActive: true },
    });
  }

  async validateWorkflow(nodes: WorkflowNode[], edges: WorkflowEdge[]): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check if there's a start node
    const startNodes = nodes.filter(node => node.type === 'start');
    if (startNodes.length === 0) {
      errors.push('Workflow must have a start node');
    } else if (startNodes.length > 1) {
      errors.push('Workflow can only have one start node');
    }

    // Check if all nodes have valid connections
    for (const node of nodes) {
      if (node.type !== 'end') {
        const outgoingEdges = edges.filter(edge => edge.source === node.id);
        if (outgoingEdges.length === 0) {
          errors.push(`Node ${node.id} has no outgoing connections`);
        }
      }
    }

    // Check if all edges reference valid nodes
    for (const edge of edges) {
      const sourceExists = nodes.some(node => node.id === edge.source);
      const targetExists = nodes.some(node => node.id === edge.target);
      
      if (!sourceExists) {
        errors.push(`Edge references non-existent source node: ${edge.source}`);
      }
      if (!targetExists) {
        errors.push(`Edge references non-existent target node: ${edge.target}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  async duplicateWorkflow(id: string, userId: string, newName?: string): Promise<Workflow> {
    const originalWorkflow = await this.findOne(id, userId);
    
    const duplicatedWorkflow = this.workflowRepository.create({
      userId,
      name: newName || `${originalWorkflow.name} (Copy)`,
      description: originalWorkflow.description,
      nodes: originalWorkflow.nodes,
      edges: originalWorkflow.edges,
      settings: originalWorkflow.settings,
      isActive: false,
    });

    return this.workflowRepository.save(duplicatedWorkflow);
  }
} 