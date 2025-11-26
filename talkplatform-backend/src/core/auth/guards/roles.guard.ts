import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../../auth/roles.decorator';
import { UserRole, User } from '../../../users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }
    
    const request = context.switchToHttp().getRequest<{ user: User }>();
    const user = request.user;
    
    if (!user) {
      this.logger.warn('User not found in request');
      throw new ForbiddenException('User not authenticated');
    }
    
    if (!requiredRoles.includes(user.role)) {
      this.logger.warn(`User ${user.id} with role ${user.role} attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`);
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }
    
    return true;
  }
}
