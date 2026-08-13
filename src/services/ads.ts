// ============================================================================
// ADS SERVICE - CAPACITOR-READY ABSTRACTION LAYER
// Manages AdMob mock ads, interstitial frequency rules, and checks isPremiumUser.
// Rules: Never show interstitial while viewing full-screen photo/video,
// and never interrupt an active gallery scroll or search.
// // TODO: Capacitor native swap point -> Swap with @capacitor-community/admob
// ============================================================================

import { BillingService } from './billing';

export const AdsService = {
  shouldShowAds(): boolean {
    return !BillingService.isPremium();
  },

  // // TODO: Capacitor native swap point -> AdMob.showBanner({ adId: 'ca-app-pub-xxx/yyy', position: 'BOTTOM_CENTER' })
  async showBannerAd(): Promise<boolean> {
    if (!this.shouldShowAds()) return false;
    return true;
  },

  // Trigger interstitial ad according to rules
  // // TODO: Capacitor native swap point -> AdMob.prepareInterstitial() & AdMob.showInterstitial()
  async triggerInterstitial(context: { isViewingFullscreen: boolean; isScrolling: boolean }): Promise<boolean> {
    if (!this.shouldShowAds()) return false;
    if (context.isViewingFullscreen || context.isScrolling) {
      console.log('AdMob Interstitial blocked by rule: Fullscreen photo/video or Active scrolling in progress.');
      return false;
    }
    return true;
  },
};
