/**
 * Diwali Surprise - Application Configuration
 * Author: Jaswant Yadav (@jaswant_0707)
 */

const CONFIG = {
  // App metadata
  APP_NAME: "Diwali Surprise ✨",
  APP_TAGLINE: "Personalized Diwali Wishes & Interactive Surprise",
  CREATOR_NAME: "Jaswant Yadav",
  CREATOR_HANDLE: "@jaswant_0707",
  CREATOR_INSTAGRAM: "https://www.instagram.com/jaswant_0707/",
  CREATOR_EMAIL: "jaswanty132@gmail.com", // Configurable owner email
  YEAR: 2026,

  // Supabase Configuration
  SUPABASE_URL: window.ENV_SUPABASE_URL || "https://scaooeaaeavqpeljhejd.supabase.co",
  SUPABASE_ANON_KEY: window.ENV_SUPABASE_ANON_KEY || "sb_publishable_zKK-dDF2fzMdpM7FXDOwIw_q---6TlB",

  // Local storage failover cache key (ensures app works offline or in edge-case network dropouts)
  LOCAL_CACHE_KEY_GREETINGS: "diwali_greetings_cache_v1",
  LOCAL_CACHE_KEY_FEEDBACK: "diwali_feedback_cache_v1",

  // URL Helpers
  getBaseUrl() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    const dir = pathname.substring(0, pathname.lastIndexOf('/') + 1);
    return `${origin}${dir}`;
  },

  getSurpriseUrl(id) {
    const baseUrl = this.getBaseUrl();
    return `${baseUrl}surprise.html?id=${encodeURIComponent(id)}`;
  }
};

window.CONFIG = CONFIG;
