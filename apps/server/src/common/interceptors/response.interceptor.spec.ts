import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of } from 'rxjs';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  let interceptor: ResponseInterceptor<unknown>;
  let reflector: Reflector;
  let mockExecutionContext: ExecutionContext;
  let mockResponse: { header: jest.Mock };

  beforeEach(() => {
    reflector = new Reflector();
    interceptor = new ResponseInterceptor(reflector);

    mockResponse = { header: jest.fn() };

    mockExecutionContext = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as unknown as ExecutionContext;
  });

  it('should wrap data in success result and set Content-Type header', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const mockCallHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: { id: 1, name: 'test' },
          message: '操作成功',
        });
        expect(mockResponse.header).toHaveBeenCalledWith(
          'Content-Type',
          'application/json; charset=utf-8',
        );
      },
      complete: done,
    });
  });

  it('should return raw data when @Original() decorator is set', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);

    const mockCallHandler: CallHandler = {
      handle: () => of({ id: 1, name: 'test' }),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({ id: 1, name: 'test' });
        expect(mockResponse.header).not.toHaveBeenCalled();
      },
      complete: done,
    });
  });

  it('should wrap null data in success result', (done) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(false);

    const mockCallHandler: CallHandler = {
      handle: () => of(null),
    };

    interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
      next: (result) => {
        expect(result).toEqual({
          code: 200,
          data: null,
          message: '操作成功',
        });
        expect(mockResponse.header).toHaveBeenCalledWith(
          'Content-Type',
          'application/json; charset=utf-8',
        );
      },
      complete: done,
    });
  });
});
