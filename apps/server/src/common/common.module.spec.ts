import { LoginReqDto } from '@/modules/auth/dto/req-auth.dto';
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';

describe('CommonModule ValidationPipe', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: LoginReqDto,
    data: '',
  };

  it('请求体包含非白名单字段时应静默剥离', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      transform: true,
    });

    const result = await pipe.transform(
      {
        userName: 'admin',
        password: '123456',
        captcha: '1',
        captchaId: 'captcha-id',
        extraField: 'unexpected',
      },
      metadata,
    );

    expect(result).toBeInstanceOf(LoginReqDto);
    expect(result).not.toHaveProperty('extraField');
    expect(result.userName).toBe('admin');
  });
});
