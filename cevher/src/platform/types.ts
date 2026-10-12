/**
 * Platform service contracts (GDD 13.7). Mock implementations arrive with the shop and boosts
 * (Phase 2–3) and the real SDKs in Phase 5; game code depends only on these interfaces.
 */
export type AdPlacement =
  'freshTeapot' | 'offlineDouble' | 'barrierSpeedUp' | 'freeCrystals' | 'contractReroll';

export interface AdsProvider {
  isRewardedReady(placement: AdPlacement): boolean;
  showRewarded(placement: AdPlacement): Promise<'completed' | 'skipped' | 'failed'>;
}

export interface Product {
  id: string;
  title: string;
  /** Localised price string from the store, shown before purchase. */
  price: string;
}

export interface PurchaseResult {
  productId: string;
  status: 'purchased' | 'cancelled' | 'failed' | 'restored';
  transactionId?: string;
}

export interface IapProvider {
  getProducts(): Promise<Product[]>;
  purchase(id: string): Promise<PurchaseResult>;
  restore(): Promise<PurchaseResult[]>;
}

export interface AnalyticsProvider {
  track(event: string, params?: Record<string, string | number | boolean>): void;
}
