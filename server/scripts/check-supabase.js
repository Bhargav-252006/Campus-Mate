const path = require('path');
const dotenv = require('dotenv');

dotenv.config({path: path.resolve(__dirname, '../../.env'), override: true});

const {createSupabaseClient, getSupabaseConfig} = require('../src/shared/supabase');

async function main() {
    try {
        const cfg = getSupabaseConfig();
        console.log('SUPABASE_URL', cfg.url || 'missing');
        console.log('HAS_SERVICE_ROLE_KEY', cfg.hasServiceRoleKey);
        console.log('HAS_ANON_KEY', cfg.hasAnonKey);

        const supabase = createSupabaseClient({useAnon: !cfg.hasServiceRoleKey});

        const {error} = await supabase
            .from('auth_tokens')
            .select('id')
            .limit(1);

        if (error) {
            console.error('SUPABASE_FAIL', error.message);
            process.exit(1);
        }

        console.log('SUPABASE_OK');
        process.exit(0);
    } catch (error) {
        console.error('SUPABASE_FAIL', error.message);
        process.exit(1);
    }
}

main();
