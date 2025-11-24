import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/jwt-auth.guard';
import { MaterialService } from '../services/material.service';
import { FilterMaterialDto } from '../dto/filter-material.dto';

@Controller('marketplace/materials')
export class StudentMaterialController {
    constructor(private readonly materialService: MaterialService) { }

    @Get()
    findAll(@Query() filterDto: FilterMaterialDto) {
        return this.materialService.findAll(filterDto);
    }

    @Get('purchased')
    @UseGuards(JwtAuthGuard)
    getPurchased(@Request() req, @Query('page') page: string = '1', @Query('limit') limit: string = '10') {
        return this.materialService.getPurchasedMaterials(
            req.user.id,
            parseInt(page),
            parseInt(limit),
        );
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req?: any) {
        const material = await this.materialService.findOne(id);
        
        // Nếu có user, kiểm tra đã mua chưa
        if (req?.user) {
            const hasPurchased = await this.materialService.hasPurchased(id, req.user.id);
            return { ...material, has_purchased: hasPurchased };
        }
        
        return material;
    }

    @Post(':id/purchase')
    @UseGuards(JwtAuthGuard)
    purchase(@Param('id') id: string, @Request() req) {
        return this.materialService.purchaseMaterial(id, req.user);
    }

    @Get(':id/download')
    @UseGuards(JwtAuthGuard)
    getDownloadUrl(@Param('id') id: string, @Request() req) {
        return this.materialService.getDownloadUrl(id, req.user.id).then((url) => ({
            download_url: url,
        }));
    }

    @Get(':id/purchased')
    @UseGuards(JwtAuthGuard)
    checkPurchased(@Param('id') id: string, @Request() req) {
        return this.materialService.hasPurchased(id, req.user.id).then((hasPurchased) => ({
            has_purchased: hasPurchased,
        }));
    }
}
