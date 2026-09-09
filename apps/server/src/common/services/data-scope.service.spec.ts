import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import type { DataScopeContext } from '@/common/types/auth.type';
import { DataScopeService } from './data-scope.service';

describe('DataScopeService', () => {
  let service: DataScopeService;

  beforeEach(() => {
    service = new DataScopeService();
  });

  const user = (dataScope: DataScopeContext) =>
    ({ id: 'user-1', dataScope }) as unknown as Parameters<
      DataScopeService['buildWhere']
    >[0];

  it('ALL should not add a data scope condition', () => {
    expect(
      service.buildWhere(
        user({
          scope: DataScopeEnum.ALL,
          deptIds: [],
        }),
      ),
    ).toEqual({});
  });

  it('SELF should filter by the current user id', () => {
    expect(
      service.buildWhere(
        user({
          scope: DataScopeEnum.SELF,
          deptIds: [],
        }),
      ),
    ).toEqual({ createById: 'user-1' });
  });

  it.each([
    DataScopeEnum.DEPT,
    DataScopeEnum.DEPT_AND_CHILD,
    DataScopeEnum.CUSTOM,
  ])('%s should filter by the resolved department ids', (scope) => {
    expect(
      service.buildWhere(
        user({
          scope,
          deptIds: ['dept-1', 'dept-2'],
        }),
      ),
    ).toEqual({ deptId: { in: ['dept-1', 'dept-2'] } });
  });

  it('CUSTOM without departments should fail closed', () => {
    expect(
      service.buildWhere(
        user({
          scope: DataScopeEnum.CUSTOM,
          deptIds: [],
        }),
      ),
    ).toEqual({ deptId: { in: [] } });
  });
});
