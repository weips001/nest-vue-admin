import { ApiException } from '@/common/exceptions/api.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'nestjs-prisma';
import { SysMenuService } from './sys-menu.service';

/* Mock buildMenuTree：直接返回输入，便于断言 */
jest.mock('@/utils/util', () => ({
  buildMenuTree: jest.fn((list: any[]) => list),
}));

type MockMethod = jest.Mock;

interface MockSysMenu {
  create: MockMethod;
  findUnique: MockMethod;
  findMany: MockMethod;
  update: MockMethod;
  delete: MockMethod;
  count: MockMethod;
}

interface MockSysMenuBtn {
  deleteMany: MockMethod;
  update: MockMethod;
  createMany: MockMethod;
}

interface MockPrisma {
  sysMenu: MockSysMenu;
  sysMenuBtn: MockSysMenuBtn;
  $transaction: MockMethod;
}

describe('SysMenuService', () => {
  let service: SysMenuService;
  let prisma: MockPrisma;

  const mockPrismaService: MockPrisma = {
    sysMenu: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    sysMenuBtn: {
      deleteMany: jest.fn(),
      update: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SysMenuService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SysMenuService>(SysMenuService);
    prisma = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ------------------------------------------------------------------ */
  describe('create', () => {
    it('应创建菜单，包含 meta、menuBtns、parameters，parentId=0 时转为 null', async () => {
      const createDto = {
        name: 'sys-user',
        path: '/system/user',
        auth: 'sys:user:list',
        component: 'system/user/index',
        status: '1',
        hidden: false,
        sort: 1,
        parentId: 0,
        meta: {
          title: '用户管理',
          keepAlive: true,
          defaultMenu: false,
          closeTab: false,
        },
        menuBtns: [{ name: '新增', auth: 'sys:user:add' }],
        parameters: [{ type: 'query', key: 'id', value: '1' }],
      };

      const created = { id: 1, ...createDto, parentId: null };
      prisma.sysMenu.create.mockResolvedValue(created);

      const result = await service.create(createDto as any);

      expect(prisma.sysMenu.create).toHaveBeenCalledWith({
        data: {
          name: 'sys-user',
          path: '/system/user',
          auth: 'sys:user:list',
          component: 'system/user/index',
          status: '1',
          hidden: false,
          sort: 1,
          parentId: null,
          meta: { create: createDto.meta },
          menuBtns: { createMany: { data: createDto.menuBtns } },
          parameters: { createMany: { data: createDto.parameters } },
        },
      });
      expect(result).toEqual(created);
    });

    it('parentId 非 0 时应保留原值', async () => {
      const createDto = {
        name: 'sys-user-add',
        path: '/system/user/add',
        auth: 'sys:user:add',
        component: 'system/user/add',
        status: '1',
        hidden: false,
        sort: 2,
        parentId: 5,
        meta: {
          title: '用户新增',
          keepAlive: false,
          defaultMenu: false,
          closeTab: false,
        },
        menuBtns: [],
        parameters: [],
      };

      prisma.sysMenu.create.mockResolvedValue({ id: 2, ...createDto });

      await service.create(createDto as any);

      expect(prisma.sysMenu.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ parentId: 5 }),
        }),
      );
    });
  });

  /* ------------------------------------------------------------------ */
  describe('findAll', () => {
    it('应返回 { list, total } 并构建树形结构', async () => {
      const menuList = [
        { id: 1, name: 'system', parentId: null, meta: { title: '系统管理' } },
        { id: 2, name: 'sys-user', parentId: 1, meta: { title: '用户管理' } },
      ];

      prisma.sysMenu.findMany.mockResolvedValue(menuList as any);
      prisma.sysMenu.count.mockResolvedValue(2);

      const result = await service.findAll({ skip: 0, take: 10 } as any);

      expect(prisma.sysMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          include: { meta: true },
          orderBy: { sort: 'asc' },
        }),
      );
      expect(prisma.sysMenu.count).toHaveBeenCalledWith({ where: {} });
      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      // parentId: null 应被转换为 0
      expect(result.list[0].parentId).toBe(0);
      expect(result.list[1].parentId).toBe(1);
    });

    it('有 name 查询条件时应传入 meta.title contains 过滤', async () => {
      prisma.sysMenu.findMany.mockResolvedValue([]);
      prisma.sysMenu.count.mockResolvedValue(0);

      await service.findAll({ skip: 0, take: 10, name: '用户' } as any);

      const expectedWhere = { meta: { title: { contains: '用户' } } };
      expect(prisma.sysMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(prisma.sysMenu.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('有 status 查询条件时应传入 status 过滤', async () => {
      prisma.sysMenu.findMany.mockResolvedValue([]);
      prisma.sysMenu.count.mockResolvedValue(0);

      await service.findAll({ skip: 0, take: 10, status: '1' } as any);

      const expectedWhere = { status: '1' };
      expect(prisma.sysMenu.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });
  });

  /* ------------------------------------------------------------------ */
  describe('findOne', () => {
    it('菜单存在时应返回菜单数据，parentId 为 null 时转为 0', async () => {
      const menu = {
        id: 1,
        name: 'sys-user',
        parentId: null,
        meta: { title: '用户管理' },
        menuBtns: [],
        parameters: [],
        parent: null,
      };
      prisma.sysMenu.findUnique.mockResolvedValue(menu as any);

      const result = await service.findOne(1);

      expect(prisma.sysMenu.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { meta: true, menuBtns: true, parameters: true, parent: true },
      });
      expect(result).toEqual({ ...menu, parentId: 0 });
    });

    it('菜单不存在时应返回 null', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(null);

      const result = await service.findOne(999);

      expect(result).toBeNull();
    });
  });

  /* ------------------------------------------------------------------ */
  describe('update', () => {
    const mockTx = {
      sysMenuBtn: {
        deleteMany: jest.fn(),
        update: jest.fn(),
        createMany: jest.fn(),
      },
      sysMenu: {
        update: jest.fn(),
      },
    };

    it('菜单存在时应执行事务，处理按钮增删改', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue({ id: 1, name: 'sys-user' });

      // $transaction 接收回调并传入 tx
      prisma.$transaction.mockImplementation(async (cb: Function) => {
        return cb(mockTx);
      });

      mockTx.sysMenuBtn.deleteMany.mockResolvedValue({ count: 1 });
      mockTx.sysMenuBtn.update.mockResolvedValue({});
      mockTx.sysMenuBtn.createMany.mockResolvedValue({ count: 1 });
      mockTx.sysMenu.update.mockResolvedValue({
        id: 1,
        name: 'sys-user-updated',
      });

      const updateDto = {
        name: 'sys-user-updated',
        parentId: 0,
        meta: {
          title: '用户管理V2',
          keepAlive: true,
          defaultMenu: false,
          closeTab: false,
        },
        menuBtns: [
          { id: 10, name: '编辑', auth: 'sys:user:edit' }, // update
          { name: '导出', auth: 'sys:user:export' }, // create
        ],
        parameters: [{ type: 'query', key: 'status', value: '1' }],
      };

      const result = await service.update(1, updateDto as any);

      // 应删除不在 keepIds 中的按钮
      expect(mockTx.sysMenuBtn.deleteMany).toHaveBeenCalledWith({
        where: { sysMenuId: 1, id: { notIn: [10] } },
      });
      // 应更新带 id 的按钮
      expect(mockTx.sysMenuBtn.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { name: '编辑', auth: 'sys:user:edit' },
      });
      // 应新增不带 id 的按钮
      expect(mockTx.sysMenuBtn.createMany).toHaveBeenCalledWith({
        data: [{ name: '导出', auth: 'sys:user:export', sysMenuId: 1 }],
      });
      // 最终应更新菜单本身
      expect(mockTx.sysMenu.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          name: 'sys-user-updated',
          parentId: null,
          meta: { update: updateDto.meta },
          parameters: {
            deleteMany: {},
            createMany: { data: updateDto.parameters },
          },
        }),
      });
      expect(result).toEqual({ id: 1, name: 'sys-user-updated' });
    });

    it('菜单不存在时应抛出 ApiException', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(null);

      await expect(service.update(999, {} as any)).rejects.toThrow(
        ApiException,
      );
      await expect(service.update(999, {} as any)).rejects.toThrow(
        '当前菜单信息不存在',
      );
    });

    it('meta 为 undefined 时不应更新 meta', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue({ id: 1 });
      prisma.$transaction.mockImplementation(async (cb: Function) =>
        cb(mockTx),
      );
      mockTx.sysMenuBtn.deleteMany.mockResolvedValue({ count: 0 });
      mockTx.sysMenu.update.mockResolvedValue({ id: 1 });

      await service.update(1, {
        menuBtns: [],
        parameters: [],
        parentId: 0,
      } as any);

      expect(mockTx.sysMenu.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ meta: undefined }),
        }),
      );
    });
  });

  /* ------------------------------------------------------------------ */
  describe('remove', () => {
    it('菜单存在且无子菜单时应成功删除', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue({ id: 1, name: 'sys-user' });
      prisma.sysMenu.count.mockResolvedValue(0);
      prisma.sysMenu.delete.mockResolvedValue({ id: 1, name: 'sys-user' });

      const result = await service.remove(1);

      expect(prisma.sysMenu.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual({ id: 1, name: 'sys-user' });
    });

    it('菜单不存在时应抛出 ApiException', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(ApiException);
      await expect(service.remove(999)).rejects.toThrow('菜单不存在');
    });

    it('存在子菜单时应抛出 ApiException', async () => {
      prisma.sysMenu.findUnique.mockResolvedValue({ id: 1, name: 'system' });
      prisma.sysMenu.count.mockResolvedValue(3);

      await expect(service.remove(1)).rejects.toThrow(ApiException);
      await expect(service.remove(1)).rejects.toThrow('请先删除子菜单');
    });
  });
});
