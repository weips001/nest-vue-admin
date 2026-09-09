/**
 * 文件上传白名单配置
 * 按类型分组，后续新增类型只需往对应分类里加一行
 */
export const ALLOWED_EXTENSIONS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'],
  archive: ['zip', 'rar', '7z'],
  video: ['mp4', 'avi', 'mov'],
} as const;

/** 扁平化的全部允许扩展名 */
export const ALL_ALLOWED_EXTENSIONS: readonly string[] =
  Object.values(ALLOWED_EXTENSIONS).flat();

/** 危险 MIME 类型（可执行的脚本/程序），直接拦截 */
const DANGEROUS_MIME_TYPES = new Set([
  'text/html',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/x-scriptlet',
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-bat',
  'application/x-sh',
  'application/x-shellscript',
]);

/**
 * 校验上传文件是否合法
 * 1. 扩展名必须在白名单内
 * 2. MIME 类型不能是危险类型
 */
export function isFileAllowed(
  filename: string,
  mimetype: string,
): { allowed: boolean; reason?: string } {
  const ext = filename.split('.').pop()?.toLowerCase() || '';

  if (!ALL_ALLOWED_EXTENSIONS.includes(ext)) {
    return { allowed: false, reason: `不允许上传 .${ext} 格式的文件` };
  }

  if (DANGEROUS_MIME_TYPES.has(mimetype)) {
    return { allowed: false, reason: `不允许上传该类型的文件` };
  }

  return { allowed: true };
}
