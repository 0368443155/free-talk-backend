// src/core/auth/guards/optional-jwt-auth.guard.ts
import { Injectable, ExecutionContext } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { Observable } from "rxjs";

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    // Override canActivate to make authentication optional
    canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
        // Always allow the request, but try to authenticate if token is present
        const request = context.switchToHttp().getRequest();
        const token = request.headers?.authorization?.replace('Bearer ', '');
        
        // If no token, allow request without authentication
        if (!token) {
            return true;
        }
        
        // If token exists, try to authenticate (but don't fail if invalid)
        return super.canActivate(context) as Promise<boolean>;
    }

    // Override handleRequest to not throw error if user is not authenticated
    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        // If there's an error or no user, just return undefined
        // This allows the request to continue without authentication
        if (err || !user) {
            return undefined;
        }
        return user;
    }
}

