import { ApiException } from '@/common/exceptions/api.exception';
import { CurrentUserType } from '@/common/types/auth.type';
import { IUploadService } from '@/common/types/upload.type';
import { UploadCommonService } from '@/common/upload/upload.service';
import { generateUUid } from '@/utils/util';
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'nestjs-prisma';
import {
  GetFileUploadListDto,
  UpdateFileUploadDto,
} from './dto/req-fileUpload.dto';

@Injectable()
export class FileUploadService {
  private store: IUploadService;
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadCommonService: UploadCommonService,
  ) {
    this.store = this.uploadCommonService.createStorage();
  }

  /* 新增 */
  async create(file: Express.Multer.File, user: CurrentUserType) {
    const result = await this.store.upload(file);
    return this.prisma.fileUpload.create({
      data: {
        id: generateUUid(),
        ...result,
        createBy: user.nickName,
        createById: user.id,
      },
    });
  }

  /* 列表查询 */
  async findAll(query: GetFileUploadListDto) {
    const { skip, take } = query;
    const where: Prisma.FileUploadWhereInput = {};

    if (query.name != undefined) {
      where.name = { contains: query.name };
    }

    if (query.tag != undefined) {
      where.tag = query.tag;
    }

    if (query.mime != undefined) {
      where.mime = query.mime;
    }

    const listPromise = this.prisma.fileUpload.findMany({
      where,
      skip,
      take,
      orderBy: {
        createdAt: 'desc',
      },
    });
    const totalPromise = this.prisma.fileUpload.count({
      where,
    });
    const [list, total] = await Promise.all([listPromise, totalPromise]);
    return {
      list,
      total,
    };
  }

  /* 通过id查询 */
  async findOne(id: string) {
    return this.prisma.fileUpload.findUnique({
      where: {
        id,
      },
    });
  }

  /* 更新 */
  async update(id: string, updateFileUploadDto: UpdateFileUploadDto) {
    return this.prisma.fileUpload.update({
      where: {
        id,
      },
      data: updateFileUploadDto,
    });
  }

  /* 删除 */
  async remove(id: string) {
    const file = await this.prisma.fileUpload.findUnique({
      where: {
        id,
      },
    });
    if (!file) {
      throw new ApiException('文件不存在');
    }
    await this.store.delete(file.key);
    await this.prisma.fileUpload.delete({
      where: {
        id,
      },
    });
  }

  /* 批量删除 */
  async removes(ids: string[]) {
    return this.prisma.fileUpload.deleteMany({
      where: {
        id: {
          in: ids,
        },
      },
    });
  }

  /* 根据url删除 */
  async removeByUrl(url: string) {
    const file = await this.prisma.fileUpload.findFirst({
      where: { url },
    });

    if (!file) {
      throw new ApiException('文件不存在');
    }
    // 用 key 删除文件
    await this.store.delete(file.key);
    // 删除数据库记录
    await this.prisma.fileUpload.delete({
      where: {
        id: file.id,
      },
    });
  }
}
