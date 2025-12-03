import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../users/user.entity';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  GetTemplatesDto,
  CreateFromTemplateDto,
  RateTemplateDto,
} from './dto/template.dto';

// Commands
import { CreateTemplateCommand } from './application/commands/create-template.command';
import { UpdateTemplateCommand } from './application/commands/update-template.command';
import { DeleteTemplateCommand } from './application/commands/delete-template.command';
import { RateTemplateCommand } from './application/commands/rate-template.command';
import { CreateCourseFromTemplateCommand } from './application/commands/create-course-from-template.command';

// Queries
import { GetTemplatesQuery } from './application/queries/get-templates.query';
import { GetTemplateByIdQuery } from './application/queries/get-template-by-id.query';

@ApiTags('Course Templates')
@Controller('course-templates')
export class CourseTemplatesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new course template (Teacher or Admin)' })
  @ApiResponse({ status: 201, description: 'Template created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Only teachers and admins can create templates' })
  async createTemplate(@Req() req: any, @Body() dto: CreateTemplateDto) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const command = new CreateTemplateCommand(
      userId,
      dto.name,
      dto.description || undefined,
      dto.isPublic || false,
      dto.category,
      dto.level,
      dto.language,
      dto.sessionStructure.map((s) => ({
        ...s,
        description: s.description || '',
      })),
      dto.sessionsPerWeek,
      dto.suggestedPriceFull,
      dto.suggestedPriceSession,
      dto.tags,
    );

    const template = await this.commandBus.execute(command);

    return {
      message: 'Template created successfully',
      data: template,
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all course templates with filters' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getTemplates(@Query() query: GetTemplatesDto) {
    const getTemplatesQuery = new GetTemplatesQuery(
      {
        category: query.category,
        level: query.level,
        language: query.language,
        isPublic: query.isPublic,
        isFeatured: query.isFeatured,
        createdBy: query.createdBy,
        tags: query.tags,
      },
      {
        page: query.page || 1,
        limit: query.limit || 20,
      },
      {
        field: query.sortBy || 'createdAt',
        order: query.sortOrder || 'DESC',
      },
    );

    return this.queryBus.execute(getTemplatesQuery);
  }

  @Get('my-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my templates (Teacher or Admin)' })
  @ApiResponse({ status: 200, description: 'Templates retrieved successfully' })
  async getMyTemplates(@Req() req: any, @Query() query: GetTemplatesDto) {
    const userId = req.user.id;
    const getTemplatesQuery = new GetTemplatesQuery(
      {
        ...query,
        createdBy: userId,
      },
      {
        page: query.page || 1,
        limit: query.limit || 20,
      },
      {
        field: query.sortBy || 'createdAt',
        order: query.sortOrder || 'DESC',
      },
    );

    return this.queryBus.execute(getTemplatesQuery);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get template by ID' })
  @ApiResponse({ status: 200, description: 'Template retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async getTemplateById(@Param('id') id: string) {
    const query = new GetTemplateByIdQuery(id);
    return this.queryBus.execute(query);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update template (Teacher or Admin)' })
  @ApiResponse({ status: 200, description: 'Template updated successfully' })
  @ApiResponse({ status: 403, description: 'You can only update your own templates' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async updateTemplate(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateTemplateDto,
  ) {
    const userId = req.user.id;
    const updates: any = { ...dto };
    if (dto.sessionStructure) {
      updates.sessionStructure = dto.sessionStructure.map((s) => ({
        ...s,
        description: s.description || '',
      }));
    }
    const command = new UpdateTemplateCommand(id, userId, updates);
    const template = await this.commandBus.execute(command);

    return {
      message: 'Template updated successfully',
      data: template,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete template (Teacher or Admin)' })
  @ApiResponse({ status: 204, description: 'Template deleted successfully' })
  @ApiResponse({ status: 403, description: 'You can only delete your own templates' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    const userId = req.user.id;
    const command = new DeleteTemplateCommand(id, userId);
    await this.commandBus.execute(command);
  }

  @Post(':id/use')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create course from template (Teacher or Admin)' })
  @ApiResponse({ status: 201, description: 'Course created from template successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async createCourseFromTemplate(
    @Param('id') templateId: string,
    @Req() req: any,
    @Body() dto: CreateFromTemplateDto,
  ) {
    const userId = req.user.id;
    const command = new CreateCourseFromTemplateCommand(userId, templateId, {
      title: dto.title,
      description: dto.description,
      startDate: new Date(dto.startDate),
      priceFullCourse: dto.priceFullCourse,
      pricePerSession: dto.pricePerSession,
      maxStudents: dto.maxStudents,
    });

    const course = await this.commandBus.execute(command);

    return {
      message: 'Course created from template successfully',
      data: course,
    };
  }

  @Post(':id/rate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rate a template' })
  @ApiResponse({ status: 201, description: 'Template rated successfully' })
  @ApiResponse({ status: 400, description: 'Rating must be between 1 and 5' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async rateTemplate(
    @Param('id') templateId: string,
    @Req() req: any,
    @Body() dto: RateTemplateDto,
  ) {
    const userId = req.user.id;
    const command = new RateTemplateCommand(userId, templateId, dto.rating, dto.review);
    const rating = await this.commandBus.execute(command);

    return {
      message: 'Template rated successfully',
      data: rating,
    };
  }
}

