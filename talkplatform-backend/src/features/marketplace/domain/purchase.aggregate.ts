import { MaterialPurchase } from '../entities/material-purchase.entity';

/**
 * Purchase Aggregate
 * Encapsulates purchase business logic
 */
export class PurchaseAggregate {
  private purchase: MaterialPurchase;

  constructor(purchase: MaterialPurchase) {
    this.purchase = purchase;
  }

  // Getters
  get id(): string {
    return this.purchase.id;
  }

  get materialId(): string {
    return this.purchase.material_id;
  }

  get userId(): string {
    return this.purchase.user_id;
  }

  get pricePaid(): number {
    return this.purchase.price_paid;
  }

  get transactionId(): string | null {
    return this.purchase.transaction_id;
  }

  get downloadCount(): number {
    return this.purchase.download_count;
  }

  get lastDownloadedAt(): Date | null {
    return this.purchase.last_downloaded_at;
  }

  get purchasedAt(): Date {
    return this.purchase.purchased_at;
  }

  get entity(): MaterialPurchase {
    return this.purchase;
  }

  // Business Logic Methods

  /**
   * Check if user can download
   */
  canDownload(userId: string): { canDownload: boolean; reason?: string } {
    if (this.purchase.user_id !== userId) {
      return { canDownload: false, reason: 'You do not own this purchase' };
    }

    return { canDownload: true };
  }

  /**
   * Record a download
   */
  recordDownload(): void {
    this.purchase.download_count += 1;
    this.purchase.last_downloaded_at = new Date();
  }

  /**
   * Check if purchase belongs to user
   */
  belongsToUser(userId: string): boolean {
    return this.purchase.user_id === userId;
  }
}

