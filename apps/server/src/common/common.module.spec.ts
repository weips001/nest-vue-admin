import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { LoginReqDto } from '@/modules/auth/dto/req-auth.dto';

describe('CommonModule ValidationPipe', () => {
  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: LoginReqDto,
    data: '',
  };

  it('请求体包含非白名单字段时应直接抛出 400', async () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });

    await expect(
      pipe.transform(
        {
          userName: 'admin',
          password: '123456',
          captcha: '1',
          captchaId: 'captcha-id',
          extraField: 'unexpected',
        },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
