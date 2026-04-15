const {createClient} = require('@supabase/supabase-js');

function getSupabaseConfig() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    return {
        url,
        serviceRoleKey,
        anonKey,
        hasServiceRoleKey: Boolean(serviceRoleKey),
        hasAnonKey: Boolean(anonKey),
    };
}

function createSupabaseClient(options = {}) {
    const {url, serviceRoleKey, anonKey} = getSupabaseConfig();
    const key = options.useAnon ? anonKey : (serviceRoleKey || anonKey);

    if (!url) {
        throw new Error('SUPABASE_URL is not set');
    }
    if (!key) {
        throw new Error('No Supabase key found. Set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY');
    }

    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        }
    });
}

module.exports = {
    getSupabaseConfig,
    createSupabaseClient,
};
