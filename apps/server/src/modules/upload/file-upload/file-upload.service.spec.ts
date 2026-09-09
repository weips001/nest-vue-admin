jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('nestjs-prisma', () => ({ PrismaService: class PrismaService {} }));

import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { FileUploadService } from './file-upload.service';

import { ApiException } from '@/common/exceptions/api.exception';
import { UploadCommonService } from '@/common/upload/upload.service';

/* Mock 类型定义 */
type MockMethod = jest.Mock;

interface MockFileUpload {
  findMany: MockMethod;
  findUnique: MockMethod;
  findFirst: MockMethod;
  create: MockMethod;
  update: MockMethod;
  delete: MockMethod;
  deleteMany: MockMethod;
  count: MockMethod;
}

interface MockPrisma {
  fileUpload: MockFileUpload;
}

jest.mock('@/utils/util', () => ({
  generateUUid: jest.fn(() => 'mock-uuid-1234'),
}));

describe('FileUploadService', () => {
  let service: FileUploadService;
  let prisma: MockPrisma;
  let storeMock: { upload: jest.Mock; delete: jest.Mock };
  let createStorageMock: jest.Mock;

  const mockPrismaService: MockPrisma = {
    fileUpload: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    storeMock = {
      upload: jest.fn(),
      delete: jest.fn(),
    };

    createStorageMock = jest.fn().mockReturnValue(storeMock);

    const uploadCommonServiceMock = {
      createStorage: createStorageMock,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FileUploadService,
        { provide: PrismaService, useValue: mockPrismaService },
        {
          provide: UploadCommonService,
          useValue: uploadCommonServiceMock,
        },
      ],
    }).compile();

    service = module.get<FileUploadService>(FileUploadService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ======================== constructor ======================== */
  describe('constructor', () => {
    it('应该通过 uploadCommonService 创建存储实例', () => {
      expect(createStorageMock).toHaveBeenCalled();
    });
  });

  /* ======================== create ======================== */
  describe('create', () => {
    it('应该上传文件并保存数据库记录', async () => {
      const file = {
        originalname: 'test.png',
        buffer: Buffer.from(''),
        mimetype: 'image/png',
        size: 1024,
      } as Express.Multer.File;
      const user = { id: 'user-1', nickName: 'admin' } as any;

      const uploadResult = {
        name: 'test.png',
        url: '/uploads/test.png',
        key: 'test.png',
        size: 1024,
        mime: 'image/png',
        tag: '',
      };
      storeMock.upload.mockResolvedValue(uploadResult);

      const created = {
        id: 'mock-uuid-1234',
        ...uploadResult,
        createBy: 'admin',
      };
      prisma.fileUpload.create.mockResolvedValue(created);

      const result = await service.create(file, user);

      expect(storeMock.upload).toHaveBeenCalledWith(file);
      expect(prisma.fileUpload.create).toHaveBeenCalledWith({
        data: {
          id: 'mock-uuid-1234',
          ...uploadResult,
          createBy: 'admin',
          createById: 'user-1',
        },
      });
      expect(result).toEqual(created);
    });
  });

  /* ======================== findAll ======================== */
  describe('findAll', () => {
    it('应该根据筛选条件返回 { list, total }', async () => {
      const query = {
        name: 'test',
        tag: 'avatar',
        mime: 'image/png',
        skip: 0,
        take: 10,
      };

      const mockList = [
        {
          id: 'file-1',
          name: 'test.png',
          url: '/uploads/test.png',
          tag: 'avatar',
          mime: 'image/png',
        },
      ];
      const mockTotal = 1;

      prisma.fileUpload.findMany.mockResolvedValue(mockList);
      prisma.fileUpload.count.mockResolvedValue(mockTotal);

      const result = await service.findAll(query as any);

      const expectedWhere = {
        name: { contains: 'test' },
        tag: 'avatar',
        mime: 'image/png',
      };
      expect(prisma.fileUpload.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(prisma.fileUpload.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
      expect(result).toEqual({ list: mockList, total: mockTotal });
    });

    it('无筛选条件时 where 应为空对象', async () => {
      const query = { skip: 0, take: 10 };

      prisma.fileUpload.findMany.mockResolvedValue([]);
      prisma.fileUpload.count.mockResolvedValue(0);

      const result = await service.findAll(query as any);

      expect(prisma.fileUpload.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual({ list: [], total: 0 });
    });
  });

  /* ======================== findOne ======================== */
  describe('findOne', () => {
    it('应该返回文件记录详情', async () => {
      const mockFile = {
        id: 'file-1',
        name: 'test.png',
        url: '/uploads/test.png',
        key: 'test.png',
      };
      prisma.fileUpload.findUnique.mockResolvedValue(mockFile as any);

      const result = await service.findOne('file-1');

      expect(prisma.fileUpload.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
      expect(result).toEqual(mockFile);
    });

    it('id 不存在时应该返回 null', async () => {
      prisma.fileUpload.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });
  });

  /* ======================== update ======================== */
  describe('update', () => {
    it('应该更新文件记录', async () => {
      const updateDto = { tag: 'document' };
      const updated = { id: 'file-1', name: 'test.png', tag: 'document' };

      prisma.fileUpload.update.mockResolvedValue(updated as any);

      const result = await service.update('file-1', updateDto as any);

      expect(prisma.fileUpload.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: updateDto,
      });
      expect(result).toEqual(updated);
    });
  });

  /* ======================== remove ======================== */
  describe('remove', () => {
    it('文件存在时应该删除存储文件和数据库记录', async () => {
      prisma.fileUpload.findUnique.mockResolvedValue({
        id: 'file-1',
        name: 'test.png',
        key: 'test.png',
      } as any);
      prisma.fileUpload.delete.mockResolvedValue({ id: 'file-1' } as any);

      await service.remove('file-1');

      expect(prisma.fileUpload.findUnique).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
      expect(storeMock.delete).toHaveBeenCalledWith('test.png');
      expect(prisma.fileUpload.delete).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
    });

    it('文件不存在时应该抛出 ApiException("文件不存在")', async () => {
      prisma.fileUpload.findUnique.mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        ApiException,
      );
      await expect(service.remove('non-existent')).rejects.toThrow(
        '文件不存在',
      );
      expect(storeMock.delete).not.toHaveBeenCalled();
      expect(prisma.fileUpload.delete).not.toHaveBeenCalled();
    });
  });

  /* ======================== removes ======================== */
  describe('removes', () => {
    it('应该批量删除文件记录', async () => {
      prisma.fileUpload.deleteMany.mockResolvedValue({ count: 2 });

      await service.removes(['file-1', 'file-2']);

      expect(prisma.fileUpload.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['file-1', 'file-2'] } },
      });
    });
  });

  /* ======================== removeByUrl ======================== */
  describe('removeByUrl', () => {
    it('文件存在时应该通过 url 删除存储文件和数据库记录', async () => {
      prisma.fileUpload.findFirst.mockResolvedValue({
        id: 'file-1',
        name: 'test.png',
        url: '/uploads/test.png',
        key: 'test.png',
      } as any);
      prisma.fileUpload.delete.mockResolvedValue({ id: 'file-1' } as any);

      await service.removeByUrl('/uploads/test.png');

      expect(prisma.fileUpload.findFirst).toHaveBeenCalledWith({
        where: { url: '/uploads/test.png' },
      });
      expect(storeMock.delete).toHaveBeenCalledWith('test.png');
      expect(prisma.fileUpload.delete).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
    });

    it('文件不存在时应该抛出 ApiException("文件不存在")', async () => {
      prisma.fileUpload.findFirst.mockResolvedValue(null);

      await expect(
        service.removeByUrl('/uploads/non-existent.png'),
      ).rejects.toThrow(ApiException);
      await expect(
        service.removeByUrl('/uploads/non-existent.png'),
      ).rejects.toThrow('文件不存在');
      expect(storeMock.delete).not.toHaveBeenCalled();
      expect(prisma.fileUpload.delete).not.toHaveBeenCalled();
    });
  });
});
