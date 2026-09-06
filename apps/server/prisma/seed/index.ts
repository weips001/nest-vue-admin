import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { initDepts } from './initData/sys-dept';
import { initPosts, initPostRoles } from './initData/sys-post';
import { initRoles } from './initData/sys-role';
import { initDicts } from './initData/sys-dict';
import { initMenus } from './initData/sys-menu';
import { initUser } from './initData/sys-user';
import { initMessages } from './initData/sys-message';

const prisma = new PrismaClient();

export function generateUUid(): string {
  return uuidv4().replaceAll('-', '');
}

async function main() {
  // 注意顺序：先部门，再岗位，再角色，再岗位角色映射，最后用户
  await initDepts(prisma);
  await initPosts(prisma);
  await initRoles(prisma);
  await initPostRoles(prisma);
  await initUser(prisma);
  await initMenus(prisma);
  await initDicts(prisma);
  await initMessages(prisma);

  console.log('\n✅ 所有测试数据初始化完成！');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
