import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../../users/user.entity';

export const Account = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

