import { NoPermissionException } from '@/common/exceptions/noPermission.exception';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUPER_ADMIN } from '../constants/base.constant';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  let guard: PermissionGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionGuard(reflector);
  });

  const createMockContext = (user: any = {}): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should return true when no permission decorator is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    const context = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user has super admin permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sys:user:add');
    const context = createMockContext({ permissions: [SUPER_ADMIN] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return true when user has the required permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sys:user:add');
    const context = createMockContext({ permissions: ['sys:user:add'] });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw NoPermissionException when user lacks the required permission', () => {
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue('sys:user:delete');
    const context = createMockContext({ permissions: ['sys:user:add'] });

    expect(() => guard.canActivate(context)).toThrow(NoPermissionException);
    expect(() => guard.canActivate(context)).toThrow('权限不足');
  });

  it('should throw NoPermissionException when user has no permissions array', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue('sys:user:add');
    const context = createMockContext({ permissions: undefined });

    expect(() => guard.canActivate(context)).toThrow(NoPermissionException);
    expect(() => guard.canActivate(context)).toThrow('权限不足');
  });
});
