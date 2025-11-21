import { Controller, Get, Param, Query } from '@nestjs/common';
import { MaterialService } from '../services/material.service';
import { FilterMaterialDto } from '../dto/filter-material.dto';

@Controller('marketplace/materials')
export class StudentMaterialController {
    constructor(private readonly materialService: MaterialService) { }

    @Get()
    findAll(@Query() filterDto: FilterMaterialDto) {
        return this.materialService.findAll(filterDto);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.materialService.findOne(id);
    }

    // TODO: Add purchase endpoint
    // TODO: Add review endpoint
    // TODO: Add download endpoint
}
