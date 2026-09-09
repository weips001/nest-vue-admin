import { DevOnly } from '@/common/decorators/devOnly.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { User } from '@/common/decorators/user.decorator';
import { LocalAuthGuard } from '@/common/guards/localAuth.guard';
import type { CurrentUserType } from '@/common/types/auth.type';
import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import {
  ChangeExpiredPasswordDto,
  LoginReqDto,
  RefreshTokenDto,
  VerifyPasswordDto,
} from './dto/req-auth.dto';

@ApiTags('权限接口')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  @Get('captcha')
  generateCaptcha(@Query('id') id: string) {
    return this.authService.generateCaptcha(id);
  }

  @Public()
  @DevOnly()
  @Get('testToken')
  @ApiOperation({
    summary: '获取token（仅开发环境）',
  })
  generateToken() {
    return this.authService.login({ id: '1' } as CurrentUserType);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({
    summary: '登录',
  })
  @Post('login')
  @UseGuards(LocalAuthGuard)
  login(@Body() body: LoginReqDto, @User() user: CurrentUserType) {
    return this.authService.login(user);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 20 } })
  @ApiOperation({ summary: '刷新访问令牌' })
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: '过期/强制改密（无需JWT）' })
  @Post('changeExpiredPassword')
  changeExpiredPassword(@Body() dto: ChangeExpiredPasswordDto) {
    return this.authService.changeExpiredPassword(dto);
  }

  @ApiOperation({
    summary: '获取菜单信息',
  })
  @Get('routes')
  async getMenu(@User() user: CurrentUserType) {
    return await this.authService.getRoutes(user);
  }

  @ApiOperation({
    summary: '获取权限树',
  })
  @Get('allPermissions')
  async getPermissions() {
    return await this.authService.getAllPermissions();
  }

  @Get('userInfo')
  findOne(@User() user: CurrentUserType) {
    return user;
  }

  @ApiOperation({
    summary: '退出登录',
  })
  @Post('logout')
  async logout(@User() user: CurrentUserType) {
    await this.authService.logout(user.id);
    return null;
  }

  @ApiOperation({ summary: '验证密码（锁屏解锁）' })
  @Post('verifyPassword')
  async verifyPassword(
    @User() user: CurrentUserType,
    @Body() dto: VerifyPasswordDto,
  ) {
    return await this.authService.verifyPassword(user.id, dto.password);
  }
}
