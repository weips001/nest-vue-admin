import { Trim } from '@/common/decorators/trim';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class ReqAuthDto {}
export class RefreshTokenDto {
  @ApiProperty({ description: '刷新令牌' })
  @Trim()
  @IsString()
  refreshToken: string;
}
export class LoginReqDto {
  @ApiProperty({ description: '验证码', required: true })
  @Trim()
  @IsString()
  @MaxLength(10)
  captcha: string;

  @ApiProperty({ description: '验证码Id', required: true })
  @IsString()
  @MaxLength(64)
  captchaId: string;

  @ApiProperty({ description: '用户名', required: true })
  @IsString()
  @MaxLength(30)
  userName: string;

  @ApiProperty({ description: '密码', required: true })
  @IsString()
  @MaxLength(100)
  password: string;
}

export class VerifyPasswordDto {
  @ApiProperty({ description: '密码' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  password: string;
}

export class ChangeExpiredPasswordDto {
  @ApiProperty({ description: '用户ID' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(36)
  userId: string;

  @ApiProperty({ description: '旧密码' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  oldPassword: string;

  @ApiProperty({ description: '新密码（8-20位，字母+数字+特殊字符）' })
  @IsString()
  @Length(8, 20)
  @Matches(
    /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]).{8,20}$/,
    {
      message: '新密码必须包含字母、数字和特殊字符，长度8-20位',
    },
  )
  newPassword: string;
}
