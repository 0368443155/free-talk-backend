import { SetMetadata } from '@nestjs/common';
import { RoomFeature } from '../../room/enums/room-feature.enum';
import { PREMIUM_FEATURES_KEY } from '../guards/premium-feature.guard';

/**
 * Decorator to mark endpoints that require premium features
 */
export const RequirePremium = (...features: RoomFeature[]) =>
  SetMetadata(PREMIUM_FEATURES_KEY, features);

