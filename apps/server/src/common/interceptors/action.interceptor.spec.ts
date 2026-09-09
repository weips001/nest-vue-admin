import { ActionInterceptor } from '@/common/interceptors/action.interceptor';
import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from 'nestjs-prisma';
import { of, throwError } from 'rxjs';

jest.mock('@/utils/util', () => ({
  getRequestIp: jest.fn(() => '127.0.0.1'),
  sanitize: jest.fn((obj) => obj),
}));

describe('ActionInterceptor', () => {
  let interceptor: ActionInterceptor;
  let reflector: Reflector;
  let prisma: { sysActionLog: { create: jest.Mock } };

  const mockRequest = {
    method: 'POST',
    originalUrl: '/api/users',
    body: { name: 'test' },
    query: {},
    params: {},
    user: { id: 'user-1', nickName: 'TestUser' },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => jest.fn(),
  } as unknown as ExecutionContext;

  const expectedParams = JSON.stringify({
    body: mockRequest.body,
    query: mockRequest.query,
    params: mockRequest.params,
  });

  beforeEach(() => {
    reflector = new Reflector();
    prisma = {
      sysActionLog: { create: jest.fn().mockResolvedValue(undefined) },
    };
    interceptor = new ActionInterceptor(
      reflector,
      prisma as unknown as PrismaService,
    );
  });

  it('should pass through without logging when no @Action() decorator', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);

    const mockCallHandler: CallHandler = {
      handle: () => of('result'),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (data) => {
        expect(data).toBe('result');
        expect(prisma.sysActionLog.create).not.toHaveBeenCalled();
        done();
      },
      error: done.fail,
    });
  });

  it('should log with status "0" on successful response', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      title: '创建用户',
      action: '1',
    });

    const responseData = { id: '1', name: 'test' };
    const mockCallHandler: CallHandler = {
      handle: () => of(responseData),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (data) => {
        expect(data).toEqual(responseData);
        expect(prisma.sysActionLog.create).toHaveBeenCalledWith({
          data: {
            title: '创建用户',
            action: '1',
            method: 'POST',
            ip: '127.0.0.1',
            address: '/api/users',
            userId: 'user-1',
            userName: 'TestUser',
            params: expectedParams,
            result: JSON.stringify(responseData).substring(0, 65000),
            status: '0',
          },
        });
        done();
      },
      error: done.fail,
    });
  });

  it('should log with status "1" and errorInfo on error response', (done) => {
    jest.spyOn(reflector, 'get').mockReturnValue({
      title: '删除用户',
      action: '5',
    });

    const error = new Error('删除失败');
    const mockCallHandler: CallHandler = {
      handle: () => throwError(() => error),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: () => done.fail('Expected an error'),
      error: (err) => {
        expect(err).toBe(error);
        expect(prisma.sysActionLog.create).toHaveBeenCalledWith({
          data: {
            title: '删除用户',
            action: '5',
            method: 'POST',
            ip: '127.0.0.1',
            address: '/api/users',
            userId: 'user-1',
            userName: 'TestUser',
            params: expectedParams,
            result: null,
            status: '1',
            errorInfo: '删除失败',
          },
        });
        done();
      },
    });
  });
});
