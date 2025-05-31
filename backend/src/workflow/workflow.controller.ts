import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  UpdateNodesDto,
  UpdateEdgesDto,
  ValidateWorkflowDto,
  DuplicateWorkflowDto,
} from './dto/workflow.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowService) {}

  @Post()
  create(@Body() createWorkflowDto: CreateWorkflowDto, @Request() req) {
    return this.workflowService.create(createWorkflowDto, req.user.userId);
  }

  @Get()
  findAll(@Request() req) {
    return this.workflowService.findAll(req.user.userId);
  }

  @Get('active')
  getActiveWorkflow(@Request() req) {
    return this.workflowService.getActiveWorkflow(req.user.userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req) {
    return this.workflowService.findOne(id, req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
    @Request() req,
  ) {
    return this.workflowService.update(id, updateWorkflowDto, req.user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Request() req) {
    return this.workflowService.remove(id, req.user.userId);
  }

  @Patch(':id/nodes')
  updateNodes(
    @Param('id') id: string,
    @Body() updateNodesDto: UpdateNodesDto,
    @Request() req,
  ) {
    return this.workflowService.updateNodes(id, updateNodesDto.nodes, req.user.userId);
  }

  @Patch(':id/edges')
  updateEdges(
    @Param('id') id: string,
    @Body() updateEdgesDto: UpdateEdgesDto,
    @Request() req,
  ) {
    return this.workflowService.updateEdges(id, updateEdgesDto.edges, req.user.userId);
  }

  @Post(':id/activate')
  activateWorkflow(@Param('id') id: string, @Request() req) {
    return this.workflowService.activateWorkflow(id, req.user.userId);
  }

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  validateWorkflow(@Body() validateWorkflowDto: ValidateWorkflowDto) {
    return this.workflowService.validateWorkflow(
      validateWorkflowDto.nodes,
      validateWorkflowDto.edges,
    );
  }

  @Post(':id/duplicate')
  duplicateWorkflow(
    @Param('id') id: string,
    @Body() duplicateWorkflowDto: DuplicateWorkflowDto,
    @Request() req,
  ) {
    return this.workflowService.duplicateWorkflow(
      id,
      req.user.userId,
      duplicateWorkflowDto.newName,
    );
  }
} 