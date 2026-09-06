import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { lastValueFrom, of } from 'rxjs';
import { ResponseInterceptor } from '@/common/interceptors/response.interceptor';
import { Result } from '@/common/class/result.class';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController integration', () => {
  let controller: AuthController;
  let authService: {
    login: jest.Mock;
    getRoutes: jest.Mock;
    logout: jest.Mock;
  };
  let interceptor: ResponseInterceptor<any>;

  beforeEach(async () => {
    authService = {
      login: jest.fn(),
      getRoutes: jest.fn(),
      logout: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        Reflector,
        ResponseInterceptor,
        {
          provide: AuthService,
          useValue: authService,
        },
      ],
    }).compile();

    controller = module.get(AuthController);
    interceptor = module.get(ResponseInterceptor);
  });

  const createExecutionContext = (): ExecutionContext =>
    ({
      getHandler: () => controller.login,
      getClass: () => AuthController,
      switchToHttp: () => ({
        getResponse: () => ({
          header: jest.fn(),
        }),
      }),
    }) as any;

  it('应完成 login -> userInfo -> routes -> logout 主链路', async () => {
    const currentUser = {
      id: 'user-1',
      userName: 'admin',
      permissions: ['sys:user:list'],
      isSuper: false,
    };
    const loginResult = {
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      home: '/sys/user',
    };
    const routesResult = [{ path: '/sys/user', name: 'sys-user' }];

    authService.login.mockResolvedValue(loginResult);
    authService.getRoutes.mockResolvedValue(routesResult);
    authService.logout.mockResolvedValue(undefined);

    const loginData = await controller.login({} as any, currentUser as any);
    const loginResponse$ = interceptor.intercept(createExecutionContext(), {
      handle: () => of(loginData),
    } as any);

    expect(authService.login).toHaveBeenCalledWith(currentUser);
    await expect(lastValueFrom(loginResponse$)).resolves.toEqual(Result.success(loginResult));

    expect(controller.findOne(currentUser as any)).toEqual(currentUser);

    await expect(controller.getMenu(currentUser as any)).resolves.toEqual(routesResult);
    expect(authService.getRoutes).toHaveBeenCalledWith(currentUser);

    await expect(controller.logout(currentUser as any)).resolves.toBeNull();
    expect(authService.logout).toHaveBeenCalledWith('user-1');
  });
});
