import { Material, MaterialType, MaterialLevel } from '../entities/material.entity';
import { MaterialPurchase } from '../entities/material-purchase.entity';

/**
 * Material Aggregate Root
 * Encapsulates material business logic and invariants
 */
export class MaterialAggregate {
  private material: Material;
  private purchases: MaterialPurchase[] = [];

  constructor(material: Material, purchases: MaterialPurchase[] = []) {
    this.material = material;
    this.purchases = purchases;
  }

  // Getters
  get id(): string {
    return this.material.id;
  }

  get teacherId(): string {
    return this.material.teacher_id;
  }

  get title(): string {
    return this.material.title;
  }

  get priceCredits(): number {
    return this.material.price_credits;
  }

  get isPublished(): boolean {
    return this.material.is_published;
  }

  get downloadCount(): number {
    return this.material.download_count;
  }

  get rating(): number {
    return this.material.rating;
  }

  get totalReviews(): number {
    return this.material.total_reviews;
  }

  get entity(): Material {
    return this.material;
  }

  get purchaseList(): MaterialPurchase[] {
    return [...this.purchases];
  }

  // Business Logic Methods

  /**
   * Check if material can be published
   */
  canPublish(): { canPublish: boolean; reason?: string } {
    if (this.material.is_published) {
      return { canPublish: false, reason: 'Material is already published' };
    }

    if (!this.material.title || this.material.title.trim().length === 0) {
      return { canPublish: false, reason: 'Material title is required' };
    }

    if (!this.material.file_url) {
      return { canPublish: false, reason: 'Material file is required' };
    }

    if (this.material.price_credits < 0) {
      return { canPublish: false, reason: 'Price cannot be negative' };
    }

    return { canPublish: true };
  }

  /**
   * Publish the material
   */
  publish(): void {
    const validation = this.canPublish();
    if (!validation.canPublish) {
      throw new Error(validation.reason || 'Cannot publish material');
    }

    this.material.is_published = true;
  }

  /**
   * Unpublish the material
   */
  unpublish(): void {
    this.material.is_published = false;
  }

  /**
   * Check if user has purchased this material
   */
  hasUserPurchased(userId: string): boolean {
    return this.purchases.some(purchase => purchase.user_id === userId);
  }

  /**
   * Check if material can be purchased by user
   */
  canPurchase(userId: string): { canPurchase: boolean; reason?: string } {
    if (!this.material.is_published) {
      return { canPurchase: false, reason: 'Material is not available for purchase' };
    }

    if (this.hasUserPurchased(userId)) {
      return { canPurchase: false, reason: 'You have already purchased this material' };
    }

    if (this.material.teacher_id === userId) {
      return { canPurchase: false, reason: 'You cannot purchase your own material' };
    }

    return { canPurchase: true };
  }

  /**
   * Record a purchase
   */
  recordPurchase(purchase: MaterialPurchase): void {
    this.purchases.push(purchase);
    this.material.purchase_count = (this.material.purchase_count || 0) + 1;
  }

  /**
   * Increment download count
   */
  incrementDownloadCount(): void {
    this.material.download_count += 1;
  }

  /**
   * Increment view count
   */
  incrementViewCount(): void {
    this.material.view_count += 1;
  }

  /**
   * Update rating based on reviews
   */
  updateRating(averageRating: number, totalReviews: number): void {
    this.material.rating = averageRating;
    this.material.total_reviews = totalReviews;
  }

  /**
   * Update material information
   */
  updateInfo(data: {
    title?: string;
    description?: string;
    priceCredits?: number;
    language?: string;
    level?: MaterialLevel;
    tags?: string[];
  }): void {
    if (this.material.is_published && this.purchases.length > 0) {
      // Only allow limited updates to published materials with purchases
      if (data.description !== undefined) {
        this.material.description = data.description;
      }
      if (data.tags !== undefined) {
        this.material.tags = data.tags;
      }
    } else {
      // Allow all updates for unpublished materials
      if (data.title !== undefined) {
        this.material.title = data.title;
      }
      if (data.description !== undefined) {
        this.material.description = data.description;
      }
      if (data.priceCredits !== undefined) {
        if (data.priceCredits < 0) {
          throw new Error('Price cannot be negative');
        }
        this.material.price_credits = data.priceCredits;
      }
      if (data.language !== undefined) {
        this.material.language = data.language;
      }
      if (data.level !== undefined) {
        this.material.level = data.level;
      }
      if (data.tags !== undefined) {
        this.material.tags = data.tags;
      }
    }
  }

  /**
   * Set discount price
   */
  setDiscount(discountPercentage: number): void {
    if (discountPercentage < 0 || discountPercentage > 100) {
      throw new Error('Discount percentage must be between 0 and 100');
    }

    if (!this.material.original_price_credits) {
      this.material.original_price_credits = this.material.price_credits;
    }

    const discount = Math.floor(
      (this.material.original_price_credits * discountPercentage) / 100,
    );
    this.material.price_credits = this.material.original_price_credits - discount;
  }

  /**
   * Remove discount
   */
  removeDiscount(): void {
    if (this.material.original_price_credits) {
      this.material.price_credits = this.material.original_price_credits;
      this.material.original_price_credits = null;
    }
  }
}

