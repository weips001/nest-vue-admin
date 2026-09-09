import { NoAuthException } from '@/common/exceptions/noAuth.exception';
import { NoPermissionException } from '@/common/exceptions/noPermission.exception';
import { HttpExceptionFilter } from '@/common/filters/exception.filter';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      header: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    mockRequest = {
      method: 'GET',
      url: '/api/test',
    };

    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };
  });

  it('NoAuthException → HTTP 401, body code 401', () => {
    const exception = new NoAuthException('登录状态已过期');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.UNAUTHORIZED,
      message: '登录状态已过期',
      data: null,
    });
  });

  it('NoPermissionException → HTTP 403, body code 403', () => {
    const exception = new NoPermissionException('权限不足');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.FORBIDDEN,
      message: '权限不足',
      data: null,
    });
  });

  it('HttpException 404 → HTTP 404, body code 500', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Not Found',
      data: null,
    });
  });

  it('Error → HTTP 500, body code 500', () => {
    const exception = new Error('数据库连接失败');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: '数据库连接失败',
      data: null,
    });
  });

  it('String exception → HTTP 500, body code 500', () => {
    const exception = 'unknown error';

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
    expect(mockResponse.json).toHaveBeenCalledWith({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'unknown error',
      data: null,
    });
  });
});
