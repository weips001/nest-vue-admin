import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const repoRoot = resolve(__dirname, '../../../..');
const serverRoot = resolve(repoRoot, 'apps/server');

function readRepoFile(relativePath: string) {
  return readFileSync(resolve(repoRoot, relativePath), 'utf8');
}

describe('代码生成模块下线', () => {
  it('不应再包含代码生成的源码入口', () => {
    expect(existsSync(resolve(serverRoot, 'src/modules/tool'))).toBe(false);
    expect(existsSync(resolve(repoRoot, 'apps/web/src/views/tool'))).toBe(false);
  });

  it('不应再包含代码生成的数据模型、配置和菜单入口', () => {
    const schema = readRepoFile('apps/server/prisma/schema.prisma');
    const config = readRepoFile('apps/server/src/config/config.ts');
    const configType = readRepoFile('apps/server/src/common/types/config.type.ts');
    const menuSeed = readRepoFile('apps/server/prisma/seed/initData/sys-menu.ts');
    const tempSeed = readRepoFile('apps/server/prisma/seed/index.ts');

    expect(schema).not.toContain('model Temp');
    expect(schema).not.toContain('model AutoCode');
    expect(config).not.toContain('genCode');
    expect(configType).not.toContain('GenCodeType');
    expect(menuSeed).not.toContain("name: 'tool'");
    expect(menuSeed).not.toContain('tool:auto-code');
    expect(tempSeed).not.toContain('initTemps');
  });

  it('不应再依赖代码生成专用包', () => {
    for (const packagePath of ['apps/server/package.json', 'apps/web/package.json']) {
      const packageJson = JSON.parse(
        readRepoFile(packagePath),
      ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      expect(dependencies).not.toHaveProperty('change-case');
      expect(dependencies).not.toHaveProperty('ejs');
      expect(dependencies).not.toHaveProperty('handlebars');
      expect(dependencies).not.toHaveProperty('ts-morph');
    }
  });
});
