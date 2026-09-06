import { PrismaClient } from '@prisma/client';

export async function initMenus(prisma: PrismaClient) {
  console.log('开始初始化菜单数据...');

  // 系统管理根菜单
  const sysRoot = await prisma.sysMenu.upsert({
    where: { name: 'sys' },
    update: {
      path: '/sys',
      auth: 'sys',
      component: 'views/layout/basic.vue',
      sort: 1,
      status: '0',
    },
    create: {
      path: '/sys',
      name: 'sys',
      auth: 'sys',
      component: 'views/layout/basic.vue',
      sort: 1,
      status: '0',
    },
  });

  // 确保 meta 存在
  await prisma.sysMenuMeta.upsert({
    where: { sysMenuId: sysRoot.id },
    update: { title: '系统管理', icon: 'ri:settings-5-line', closeTab: true },
    create: {
      title: '系统管理',
      icon: 'ri:settings-5-line',
      closeTab: true,
      sysMenuId: sysRoot.id,
    },
  });

  // 菜单配置
  await upsertMenu(prisma, {
    name: 'menu',
    parentId: sysRoot.id,
    path: '/sys/menu',
    auth: 'sys:menu',
    component: 'views/sys/menu/menu.vue',
    sort: 0,
    status: '0',
    meta: { title: '菜单配置', icon: 'ri:menu-line', closeTab: true },
    btns: [
      { name: '新增', auth: 'sys:menu:create' },
      { name: '单个删除', auth: 'sys:menu:remove' },
      { name: '编辑', auth: 'sys:menu:update' },
      { name: '查询列表', auth: 'sys:menu:list' },
      { name: '查询详情', auth: 'sys:menu:detail' },
    ],
  });

  // 字典表
  await upsertMenu(prisma, {
    name: 'dict',
    parentId: sysRoot.id,
    path: '/sys/dict',
    auth: 'sys:dict',
    component: 'views/sys/dict/dict.vue',
    sort: 2,
    status: '0',
    meta: {
      title: '字典表',
      icon: 'material-symbols:dictionary-rounded',
      closeTab: true,
    },
    btns: [
      { name: '新增字典表', auth: 'sys:dict:create' },
      { name: '删除单个字典表', auth: 'sys:dict:remove' },
      { name: '编辑字典表', auth: 'sys:dict:update' },
      { name: '查询字典表列表', auth: 'sys:dict:list' },
      { name: '查询字典表详情', auth: 'sys:dict:detail' },
    ],
  });

  // 字典表详情
  await upsertMenu(prisma, {
    name: 'dict-detail',
    parentId: sysRoot.id,
    path: '/sys/dict-detail/:code',
    auth: 'sys:dictDetail',
    hidden: true,
    component: 'views/sys/dictDetail/dictDetail.vue',
    sort: 2,
    status: '0',
    meta: { title: '字典表详情', activeName: 'dict', closeTab: true },
    btns: [
      { name: '新增字典表详情', auth: 'sys:dictDetail:create' },
      { name: '删除单个字典表详情', auth: 'sys:dictDetail:remove' },
      { name: '批量删除字典表详情', auth: 'sys:dictDetail:removes' },
      { name: '编辑字典表详情', auth: 'sys:dictDetail:update' },
      { name: '查询字典表详情列表', auth: 'sys:dictDetail:list' },
      { name: '查询字典表详情', auth: 'sys:dictDetail:detail' },
    ],
  });

  // 角色管理
  await upsertMenu(prisma, {
    name: 'role',
    parentId: sysRoot.id,
    path: '/sys/role',
    auth: 'sys:role',
    component: 'views/sys/role/role.vue',
    sort: 1,
    status: '0',
    meta: {
      title: '角色管理',
      icon: 'material-symbols:shield-person-rounded',
      closeTab: true,
    },
    btns: [
      { name: '新增角色管理', auth: 'sys:role:create' },
      { name: '删除单个角色管理', auth: 'sys:role:remove' },
      { name: '编辑角色管理', auth: 'sys:role:update' },
      { name: '查询角色管理列表', auth: 'sys:role:list' },
      { name: '查询角色管理详情', auth: 'sys:role:detail' },
    ],
  });

  // 部门
  await upsertMenu(prisma, {
    name: 'sys-dept',
    parentId: sysRoot.id,
    path: '/sys/dept',
    auth: 'sys:dept',
    component: 'views/sys/dept/sysDept.vue',
    sort: 5,
    status: '0',
    meta: { title: '部门', icon: 'mingcute:department-line', closeTab: true },
    btns: [
      { name: '新增部门', auth: 'sys:dept:create' },
      { name: '单个删除部门', auth: 'sys:dept:remove' },
      { name: '批量删除部门', auth: 'sys:dept:removes' },
      { name: '编辑部门', auth: 'sys:dept:update' },
      { name: '查询部门列表', auth: 'sys:dept:list' },
      { name: '查询部门详情', auth: 'sys:dept:detail' },
    ],
  });

  // 岗位管理
  await upsertMenu(prisma, {
    name: 'sys-post',
    parentId: sysRoot.id,
    path: '/sys/post',
    auth: 'sys:post',
    component: 'views/sys/post/post.vue',
    sort: 6,
    status: '0',
    meta: { title: '岗位管理', icon: 'ri:user-star-line', closeTab: true },
    btns: [
      { name: '新增岗位', auth: 'sys:post:create' },
      { name: '单个删除岗位', auth: 'sys:post:remove' },
      { name: '编辑岗位', auth: 'sys:post:update' },
      { name: '查询岗位列表', auth: 'sys:post:list' },
      { name: '查询岗位详情', auth: 'sys:post:detail' },
      { name: '导出岗位', auth: 'sys:post:export' },
    ],
  });

  // 用户管理
  await upsertMenu(prisma, {
    name: 'user',
    parentId: sysRoot.id,
    path: '/sys/user',
    auth: 'sys:user',
    component: 'views/sys/user/user.vue',
    sort: 0,
    status: '0',
    meta: { title: '用户管理', icon: 'ri:user-settings-line', closeTab: true },
    btns: [
      { name: '新增用户管理', auth: 'sys:user:create' },
      { name: '删除单个用户管理', auth: 'sys:user:remove' },
      { name: '编辑用户管理', auth: 'sys:user:update' },
      { name: '查询用户管理列表', auth: 'sys:user:list' },
      { name: '查询用户管理详情', auth: 'sys:user:detail' },
      { name: '导出用户管理', auth: 'sys:user:export' },
    ],
  });

  // 操作日志
  await upsertMenu(prisma, {
    name: 'sys-action-log',
    parentId: sysRoot.id,
    path: '/sys/sys-action-log',
    auth: 'sys:sys-action-log:list',
    component: 'views/sys/sys-action-log/sysActionLog.vue',
    sort: 5,
    status: '0',
    meta: { title: '操作日志', icon: 'ri:blogger-line', closeTab: true },
    btns: [
      { name: '查询操作日志列表', auth: 'sys:sys-action-log:list' },
      { name: '查询操作日志详情', auth: 'sys:sys-action-log:detail' },
    ],
  });

  // 登录日志
  await upsertMenu(prisma, {
    name: 'sys-login-log',
    parentId: sysRoot.id,
    path: '/sys/login-log',
    auth: 'sys:login-log',
    component: 'views/sys/loginLog/index.vue',
    sort: 6,
    status: '0',
    meta: { title: '登录日志', icon: 'ri:login-box-line', closeTab: true },
    btns: [
      { name: '查询登录日志列表', auth: 'sys:login-log:list' },
      { name: '查询登录日志详情', auth: 'sys:login-log:detail' },
      { name: '删除登录日志', auth: 'sys:login-log:remove' },
      { name: '清空登录日志', auth: 'sys:login-log:clear' },
      { name: '导出登录日志', auth: 'sys:login-log:export' },
      { name: '查询在线用户', auth: 'sys:login-log:online' },
      { name: '强制下线', auth: 'sys:login-log:force-logout' },
    ],
  });

  // 通知公告
  await upsertMenu(prisma, {
    name: 'sys-notice',
    parentId: sysRoot.id,
    path: '/sys/notice',
    auth: 'sys:notice',
    component: 'views/sys/notice/notice.vue',
    sort: 7,
    status: '0',
    meta: { title: '通知公告', icon: 'ri:notification-3-line', closeTab: true },
    btns: [
      { name: '新增通知公告', auth: 'sys:notice:create' },
      { name: '删除通知公告', auth: 'sys:notice:remove' },
      { name: '编辑通知公告', auth: 'sys:notice:update' },
      { name: '查询通知公告列表', auth: 'sys:notice:list' },
      { name: '查询通知公告详情', auth: 'sys:notice:detail' },
    ],
  });

  // ========== 系统监控 ==========

  // 系统监控根菜单
  const monitorRoot = await prisma.sysMenu.upsert({
    where: { name: 'monitor' },
    update: {
      path: '/monitor',
      auth: 'monitor',
      component: 'views/layout/basic.vue',
      sort: 4,
      status: '0',
    },
    create: {
      path: '/monitor',
      name: 'monitor',
      auth: 'monitor',
      component: 'views/layout/basic.vue',
      sort: 4,
      status: '0',
    },
  });

  await prisma.sysMenuMeta.upsert({
    where: { sysMenuId: monitorRoot.id },
    update: { title: '系统监控', icon: 'ri:computer-line', closeTab: true },
    create: {
      title: '系统监控',
      icon: 'ri:computer-line',
      closeTab: true,
      sysMenuId: monitorRoot.id,
    },
  });

  // 任务管理
  await upsertMenu(prisma, {
    name: 'monitor-job',
    parentId: monitorRoot.id,
    path: '/monitor/job',
    auth: 'monitor:job',
    component: 'views/monitor/job/job.vue',
    sort: 0,
    status: '0',
    meta: { title: '任务管理', icon: 'ri:timer-line', closeTab: true },
    btns: [
      { name: '查询任务列表', auth: 'monitor:job:list' },
      { name: '查询任务详情', auth: 'monitor:job:detail' },
      { name: '新增任务', auth: 'monitor:job:create' },
      { name: '编辑任务', auth: 'monitor:job:update' },
      { name: '删除任务', auth: 'monitor:job:remove' },
      { name: '修改任务状态', auth: 'monitor:job:status' },
      { name: '执行一次', auth: 'monitor:job:run' },
    ],
  });

  // 任务日志
  await upsertMenu(prisma, {
    name: 'monitor-job-log',
    parentId: monitorRoot.id,
    path: '/monitor/job-log',
    auth: 'monitor:job-log',
    component: 'views/monitor/job/jobLog.vue',
    sort: 1,
    status: '0',
    meta: { title: '任务日志', icon: 'ri:file-list-3-line', closeTab: true },
    btns: [
      { name: '查询任务日志列表', auth: 'monitor:job-log:list' },
      { name: '查询任务日志详情', auth: 'monitor:job-log:detail' },
      { name: '删除任务日志', auth: 'monitor:job-log:remove' },
      { name: '清空任务日志', auth: 'monitor:job-log:clear' },
    ],
  });

  // 附件根菜单
  const uploadRoot = await prisma.sysMenu.upsert({
    where: { name: 'upload' },
    update: {
      path: '/upload',
      auth: 'upload',
      component: 'views/layout/basic.vue',
      sort: 3,
      status: '0',
    },
    create: {
      path: '/upload',
      name: 'upload',
      auth: 'upload',
      component: 'views/layout/basic.vue',
      sort: 3,
      status: '0',
    },
  });

  await prisma.sysMenuMeta.upsert({
    where: { sysMenuId: uploadRoot.id },
    update: { title: '附件', icon: 'mingcute:file-line', closeTab: true },
    create: {
      title: '附件',
      icon: 'mingcute:file-line',
      closeTab: true,
      sysMenuId: uploadRoot.id,
    },
  });

  // 附件上传
  await upsertMenu(prisma, {
    name: 'file-upload',
    parentId: uploadRoot.id,
    path: '/upload/file',
    auth: 'upload:file:list',
    component: 'views/upload/file/fileUpload.vue',
    sort: 5,
    status: '0',
    meta: {
      title: '附件上传',
      icon: 'mingcute:folder-upload-line',
      closeTab: true,
    },
    btns: [
      { name: '新增附件上传', auth: 'upload:file:create' },
      { name: '单个删除附件上传', auth: 'upload:file:remove' },
      { name: '批量删除附件上传', auth: 'upload:file:removes' },
      { name: '编辑附件上传', auth: 'upload:file:update' },
      { name: '查询附件上传列表', auth: 'upload:file:list' },
      { name: '查询附件上传详情', auth: 'upload:file:detail' },
    ],
  });

  // ========== 消息中心 ==========

  // 消息中心根菜单
  const messageRoot = await prisma.sysMenu.upsert({
    where: { name: 'message-center' },
    update: {
      path: '/message-center',
      auth: 'message-center',
      component: 'views/layout/basic.vue',
      sort: 1,
      status: '0',
    },
    create: {
      path: '/message-center',
      name: 'message-center',
      auth: 'message-center',
      component: 'views/layout/basic.vue',
      sort: 1,
      status: '0',
    },
  });

  await prisma.sysMenuMeta.upsert({
    where: { sysMenuId: messageRoot.id },
    update: { title: '消息中心', icon: 'ri:message-2-line', closeTab: true },
    create: {
      title: '消息中心',
      icon: 'ri:message-2-line',
      closeTab: true,
      sysMenuId: messageRoot.id,
    },
  });

  // 消息中心页面
  await upsertMenu(prisma, {
    name: 'message-list',
    parentId: messageRoot.id,
    path: '/message-center/list',
    auth: 'message-center:list',
    component: 'views/message-center/index.vue',
    sort: 0,
    status: '0',
    meta: { title: '消息列表', icon: '', closeTab: true },
  });

  // 欢迎页面
  await upsertMenu(prisma, {
    name: 'welcome',
    path: '/welcome',
    auth: 'welcome',
    component: 'views/welcome/welcome.vue',
    sort: 0,
    status: '0',
    meta: {
      title: '欢迎页面',
      icon: 'material-symbols:digital-wellbeing-outline',
      closeTab: true,
      defaultMenu: true,
    },
  });

  // js工具库
  await upsertMenu(prisma, {
    name: 'https://jsutil.cn',
    path: 'https://jsutil.cn',
    auth: 'js-util',
    component: '/',
    sort: 0,
    status: '0',
    meta: { title: 'js工具库', icon: 'ri:tools-fill', closeTab: true },
  });

  console.log('菜单数据初始化完成');
}

interface MenuData {
  name: string;
  parentId?: number;
  path: string;
  auth: string;
  component?: string;
  hidden?: boolean;
  sort?: number;
  status?: string;
  meta?: {
    title: string;
    icon?: string;
    closeTab?: boolean;
    activeName?: string;
    defaultMenu?: boolean;
  };
  btns?: Array<{ name: string; auth: string }>;
}

async function upsertMenu(prisma: PrismaClient, data: MenuData) {
  const menu = await prisma.sysMenu.upsert({
    where: { name: data.name },
    update: {
      parentId: data.parentId,
      path: data.path,
      auth: data.auth,
      component: data.component,
      hidden: data.hidden,
      sort: data.sort,
      status: data.status,
    },
    create: {
      name: data.name,
      parentId: data.parentId,
      path: data.path,
      auth: data.auth,
      component: data.component,
      hidden: data.hidden,
      sort: data.sort ?? 0,
      status: data.status ?? '0',
    },
  });

  // upsert meta
  if (data.meta) {
    await prisma.sysMenuMeta.upsert({
      where: { sysMenuId: menu.id },
      update: {
        title: data.meta.title,
        icon: data.meta.icon,
        closeTab: data.meta.closeTab,
        activeName: data.meta.activeName,
        defaultMenu: data.meta.defaultMenu,
      },
      create: {
        title: data.meta.title,
        icon: data.meta.icon,
        closeTab: data.meta.closeTab,
        activeName: data.meta.activeName,
        defaultMenu: data.meta.defaultMenu,
        sysMenuId: menu.id,
      },
    });
  }

  // 处理按钮：使用 upsert
  if (data.btns && data.btns.length > 0) {
    for (const btn of data.btns) {
      await prisma.sysMenuBtn.upsert({
        where: {
          auth_sysMenuId: {
            auth: btn.auth,
            sysMenuId: menu.id,
          },
        },
        update: {
          name: btn.name,
        },
        create: {
          name: btn.name,
          auth: btn.auth,
          sysMenuId: menu.id,
        },
      });
    }
  }

  return menu;
}
