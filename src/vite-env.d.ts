/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly SUPABASE_URL: string;
    readonly SUPABASE_ANON_KEY: string;
    readonly REVENUECAT_API_KEY: string;
    readonly APP_URL: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
