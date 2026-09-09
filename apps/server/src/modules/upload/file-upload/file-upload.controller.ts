import { Permission } from '@/common/decorators/permission.decorator';
import { UpdateDtoPipe } from '@/common/pipes/updateDto.pipe';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import {
  GetFileUploadListDto,
  UpdateFileUploadDto,
} from './dto/req-fileUpload.dto';
import { FileUploadService } from './file-upload.service';

import { isFileAllowed } from '@/common/constants/upload.constant';
import { User } from '@/common/decorators/user.decorator';
import type { CurrentUserType } from '@/common/types/auth.type';
import { FileInterceptor } from '@nestjs/platform-express';

const uploadMulterOptions = {
  limits: {
    fileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE) || 20 * 1024 * 1024,
  },
  fileFilter: (_req: any, file: Express.Multer.File, callback: any) => {
    const { allowed, reason } = isFileAllowed(file.originalname, file.mimetype);
    if (!allowed) {
      return callback(new Error(reason), false);
    }
    callback(null, true);
  },
};

@ApiTags('附件上传')
@ApiBearerAuth()
@Controller('upload/file')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  /* 新增 */
  @Post()
  @ApiOperation({
    summary: '附件上传',
  })
  @Permission('upload:file:create')
  @UseInterceptors(FileInterceptor('file', uploadMulterOptions))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @User() user: CurrentUserType,
  ) {
    if (!/[^\u0000-\u00ff]/.test(file.originalname)) {
      file.originalname = Buffer.from(file.originalname, 'latin1').toString(
        'utf8',
      );
    }
    return this.fileUploadService.create(file, user);
  }

  /* 列表查询 */
  @Get()
  @ApiOperation({
    summary: '查询附件上传列表',
  })
  @Permission('upload:file:list')
  async findAll(@Query() getFileUploadListDto: GetFileUploadListDto) {
    return this.fileUploadService.findAll(getFileUploadListDto);
  }

  /* 通过id查询 */
  @Get(':id')
  @ApiOperation({
    summary: '查询附件上传详情',
  })
  @ApiParam({ name: 'id', description: '附件上传id' })
  @Permission('upload:file:detail')
  async findOne(@Param('id') id: string) {
    return await this.fileUploadService.findOne(id);
  }

  /* 更新 */
  @Put(':id')
  @ApiOperation({
    summary: '更新附件上传',
  })
  @ApiParam({ name: 'id', description: '附件上传id' })
  @Permission('upload:file:update')
  async update(
    @Param('id') id: string,
    @Body(UpdateDtoPipe) updateFileUploadDto: UpdateFileUploadDto,
  ) {
    return this.fileUploadService.update(id, updateFileUploadDto);
  }

  /* 根据url删除 - 必须放在 :id 路由之前 */
  @Delete('by-url')
  @ApiOperation({
    summary: '根据url删除附件',
  })
  @Permission('upload:file:remove')
  async removeByUrl(@Body('url') url: string) {
    return this.fileUploadService.removeByUrl(url);
  }

  /* 单个删除 */
  @Delete(':id')
  @ApiOperation({
    summary: '删除附件上传',
  })
  @ApiParam({ name: 'id', description: '附件上传id' })
  @Permission('upload:file:remove')
  async remove(@Param('id') id: string) {
    return this.fileUploadService.remove(id);
  }

  /* 批量删除 */
  @Delete()
  @ApiOperation({
    summary: '批量删除附件上传',
  })
  @Permission('upload:file:removes')
  async removes(@Body('ids') ids: string[]) {
    return this.fileUploadService.removes(ids);
  }
}
