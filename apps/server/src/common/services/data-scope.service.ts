import { DataScopeEnum } from '@/common/enums/dataScope.enum';
import type { CurrentUserType, DataScopeWhere } from '@/common/types/auth.type';
import { Injectable } from '@nestjs/common';

@Injectable()
export class DataScopeService {
  buildWhere(currentUser: CurrentUserType): DataScopeWhere {
    const { scope, deptIds } = currentUser.dataScope;

    switch (scope) {
      case DataScopeEnum.ALL:
        return {};

      case DataScopeEnum.SELF:
        return { createById: currentUser.id };

      case DataScopeEnum.DEPT:
      case DataScopeEnum.DEPT_AND_CHILD:
      case DataScopeEnum.CUSTOM:
        return { deptId: { in: deptIds } };

      default:
        return { createById: currentUser.id };
    }
  }
}
