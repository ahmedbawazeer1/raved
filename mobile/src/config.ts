/**
 * Public connection settings. The publishable key is meant to be public (it is in every web page too);
 * the database is protected by RLS. Secret keys never go in the app.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "https://qbdtiuhstzfogrmegyuo.supabase.co";
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? "sb_publishable_ptaqiSofFUHO9NdOHWh29A_1EeZMaHU";
/** The web platform (sign-up steps not yet in the app, privacy, terms). */
export const WEB_URL = process.env.EXPO_PUBLIC_WEB_URL ?? "https://raved-seven.vercel.app";
