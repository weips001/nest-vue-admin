import { Injectable } from '@nestjs/common';
import dayjs from 'dayjs';
import get from 'lodash/get';
import { PrismaService } from 'nestjs-prisma';
import * as XLSX from 'xlsx';

export interface EnumFormat {
  type: 'enum';
  dictCode: string;
}

export type ColumnFormat = 'date' | 'datetime' | 'time' | EnumFormat;

export interface ExportColumn {
  key: string;
  label: string;
  format?: ColumnFormat;
}

export interface ExportOptions {
  columns: ExportColumn[];
  data: object[];
  filename?: string;
}

@Injectable()
export class ExcelExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据列格式化配置转换值
   */
  private formatValue(
    value: unknown,
    format: ColumnFormat,
    dictMap: Record<string, { value: string; label: string }[]>,
  ): string {
    if (value === null || value === undefined) return '';

    switch (format) {
      case 'date':
        return dayjs(value as Date).format('YYYY-MM-DD');
      case 'datetime':
        return dayjs(value as Date).format('YYYY-MM-DD HH:mm:ss');
      case 'time':
        return dayjs(value as Date).format('HH:mm:ss');
      default:
        if (typeof format === 'object' && format.type === 'enum') {
          const options = dictMap[format.dictCode];
          if (options) {
            const strVal = String(value);
            const found = options.find((o) => o.value === strVal);
            if (found) return found.label;
          }
        }
        return String(value);
    }
  }

  /**
   * 从字段配置中收集所有字典 code，批量查询字典详情
   */
  private async buildDictMap(
    columns: ExportColumn[],
  ): Promise<Record<string, { value: string; label: string }[]>> {
    const dictCodes = columns
      .filter((c) => typeof c.format === 'object' && c.format?.type === 'enum')
      .map((c) => (c.format as EnumFormat).dictCode);
    const uniqueCodes = [...new Set(dictCodes)];

    if (uniqueCodes.length === 0) return {};

    const dicts = await this.prisma.sysDict.findMany({
      where: { code: { in: uniqueCodes } },
      include: { details: true },
    });

    const dictMap: Record<string, { value: string; label: string }[]> = {};
    for (const dict of dicts) {
      dictMap[dict.code] = dict.details.map((d) => ({
        value: d.value,
        label: d.label,
      }));
    }
    return dictMap;
  }

  async export(options: ExportOptions): Promise<Buffer> {
    const { columns, data } = options;

    // 构建字典映射
    const dictMap = await this.buildDictMap(columns);

    const headers = columns.map((col) => col.label);
    const rows = data.map((item) =>
      columns.map((col) => {
        const value = get(item, col.key);
        if (col.format) {
          return this.formatValue(value, col.format, dictMap);
        }
        return value === null || value === undefined ? '' : String(value);
      }),
    );

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    worksheet['!cols'] = columns.map((col) => ({
      wch: Math.max(col.label.length * 2, 12),
    }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }
}
