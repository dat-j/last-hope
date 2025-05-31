import { IsString, IsOptional, IsArray, IsBoolean, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowNode, WorkflowEdge } from '../../entities/workflow.entity';

export class CreateWorkflowDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Object)
  nodes?: WorkflowNode[];

  @IsOptional()
  @IsArray()
  @Type(() => Object)
  edges?: WorkflowEdge[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @Type(() => Object)
  nodes?: WorkflowNode[];

  @IsOptional()
  @IsArray()
  @Type(() => Object)
  edges?: WorkflowEdge[];

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateNodesDto {
  @IsArray()
  @Type(() => Object)
  nodes: WorkflowNode[];
}

export class UpdateEdgesDto {
  @IsArray()
  @Type(() => Object)
  edges: WorkflowEdge[];
}

export class ValidateWorkflowDto {
  @IsArray()
  @Type(() => Object)
  nodes: WorkflowNode[];

  @IsArray()
  @Type(() => Object)
  edges: WorkflowEdge[];
}

export class DuplicateWorkflowDto {
  @IsOptional()
  @IsString()
  newName?: string;
} 