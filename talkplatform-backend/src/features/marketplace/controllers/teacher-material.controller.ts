import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialService } from '../services/material.service';
import { UploadService } from '../services/upload.service';
import { CreateMaterialDto } from '../dto/create-material.dto';
import { UpdateMaterialDto } from '../dto/update-material.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../auth/roles.decorator';
import { UserRole } from '../../../users/user.entity';
import { Account } from '../../../core/auth/decorators/account.decorator';
import { User } from '../../../users/user.entity';

@Controller('marketplace/teacher/materials')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER)
export class TeacherMaterialController {
    constructor(
        private readonly materialService: MaterialService,
        private readonly uploadService: UploadService,
    ) { }

    @Post('upload')
    @UseInterceptors(FileInterceptor('file'))
    async uploadFile(
        @UploadedFile() file: Express.Multer.File,
        @Account() user: User,
    ) {
        return this.uploadService.saveFile(file);
    }

    @Post()
    create(@Body() createMaterialDto: CreateMaterialDto, @Account() user: User) {
        return this.materialService.create(createMaterialDto, user);
    }

    @Get()
    findAll(
        @Account() user: User,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 10,
    ) {
        return this.materialService.findTeacherMaterials(user.id, page, limit);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateMaterialDto: UpdateMaterialDto,
        @Account() user: User,
    ) {
        return this.materialService.update(id, updateMaterialDto, user.id);
    }

    @Delete(':id')
    remove(@Param('id') id: string, @Account() user: User) {
        return this.materialService.remove(id, user.id);
    }
}
