# 生产部署注意事项

本文档用于补充 `nest-vue-admin` 在生产环境部署前必须确认的配置项与风险点。

## 1. 默认账号与密码

- `seed` 后默认管理员账号为 `admin / 123456`
- 生产环境首次部署完成后，必须立即修改管理员密码
- 如果继续保留默认密码，相当于公开后台入口

## 2. JWT 密钥

- `apps/server/.env.example` 中默认的 `JWT_SECRET=your-secret-key-change-me` 仅用于本地开发
- 生产环境必须替换为高强度随机密钥，且长度不少于 16 位
- 更换 `JWT_SECRET` 会导致旧 token 全部失效，建议在切换窗口内执行

## 3. 缓存模式与 Redis

- 本地默认 `CACHE_MODE=memory`，适合单机开发
- 生产环境如果需要多实例部署，建议切换到 `CACHE_MODE=redis`
- 切换到 Redis 后，必须同时正确填写：
  - `REDIS_HOST`
  - `REDIS_PORT`
  - `REDIS_DB`
  - `REDIS_USERNAME`
  - `REDIS_PASSWORD`
- 当前实现里 Redis 连接失败会重试并最终报错，生产环境发布前应先验证 Redis 连通性

## 4. CORS 配置

- 当前服务端在 [main.ts](/Users/weipengshuai/Desktop/git/nest-vue/apps/server/src/main.ts:19) 中直接调用了 `app.enableCors()`
- 这意味着默认是放开的跨域策略
- 生产环境建议改为显式允许你的前端域名，而不是继续全开放

## 5. 上传模式与文件目录

- 当前支持两种上传模式：
  - `UPLOAD_MODE=local`
  - `UPLOAD_MODE=aliyun`
- 如果使用本地上传，至少要确认：
  - `UPLOAD_LOCAL_FOLDER` 指向实际可写目录
  - `UPLOAD_LOCAL_PREFIX` 与反向代理规则不冲突
  - `UPLOAD_LOCAL_BASE_URL` 使用真实外网域名或网关地址，而不是 `127.0.0.1`
- 如果容器化部署，本地上传目录必须挂载持久化卷，否则重启后文件会丢失
- 如果使用阿里云 OSS，必须补全 `ALIYUN_*` 相关配置

## 6. 端口与反向代理

- 后端默认端口由 `APP_PORT` 控制，当前默认值是 `3333`
- 前端开发代理默认转发到 `http://127.0.0.1:3333`
- 生产环境如果通过 Nginx、Ingress 或 API 网关暴露服务，需要确认：
  - 后端监听端口与网关转发配置一致
  - 上传访问地址与 `UPLOAD_LOCAL_BASE_URL` 一致
  - 前端请求基地址与后端真实出口一致

## 7. Swagger 与环境区分

- Swagger 仅在 `NODE_ENV=development` 时启用
- 如果生产环境仍需要接口文档访问，不要直接把运行环境伪装成 `development`
- 更稳妥的做法是单独设计文档开关，避免顺带打开开发态行为

## 8. Demo 模式

- `IS_DEMO=true` 时会启用演示环境限制
- 生产环境应明确是否需要该限制，不要沿用本地配置

## 9. 部署前最少检查清单

- 已修改默认管理员密码
- 已替换 `JWT_SECRET`
- 已确认 `APP_PORT`、域名和反向代理配置
- 已确认缓存模式，Redis 场景下连通性正常
- 已确认上传目录可写且可持久化
- 已确认 `UPLOAD_LOCAL_BASE_URL` 或 OSS 地址为真实生产地址
- 已确认是否需要收紧 CORS
