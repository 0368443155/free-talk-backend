import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoomFeature } from '../../room/enums/room-feature.enum';

export const PREMIUM_FEATURES_KEY = 'premium_features';

/**
 * Guard to check if user has premium access for specific features
 */
@Injectable()
export class PremiumFeatureGuard implements CanActivate {
  private readonly premiumFeatures = [
    RoomFeature.RECORDING,
    RoomFeature.TRANSCRIPTION,
    RoomFeature.TRANSLATION,
    RoomFeature.ADVANCED_ANALYTICS,
  ];

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get required features from metadata
    const requiredFeatures = this.reflector.getAllAndOverride<RoomFeature[]>(
      PREMIUM_FEATURES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredFeatures || requiredFeatures.length === 0) {
      return true; // No premium features required
    }

    // Check if any required feature is premium
    const requiresPremium = requiredFeatures.some((feature) =>
      this.premiumFeatures.includes(feature),
    );

    if (!requiresPremium) {
      return true; // No premium features required
    }

    // Check if user has premium subscription
    // TODO: Implement premium check based on user subscription
    const isPremium = user.isPremium || user.role === 'admin';

    if (!isPremium) {
      throw new ForbiddenException(
        'This feature requires a premium subscription',
      );
    }

    return true;
  }
}

