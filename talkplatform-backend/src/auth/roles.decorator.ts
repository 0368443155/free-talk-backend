import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../users/user.entity'; // Import enum Role

export const ROLES_KEY = 'roles';
// Decorator @Roles('admin', 'teacher')
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);