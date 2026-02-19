
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
    console.log('--- Supabase System Scan ---');

    const tables = ['subjects', 'topics', 'lessons', 'questions', 'essay_themes'];

    for (const table of tables) {
        const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
        if (error) {
            console.log(`[ERROR] Table ${table}: ${error.message}`);
        } else {
            console.log(`[OK] Table ${table}: ${count} rows`);
        }
    }

    console.log('\n--- AI Function Health Check ---');
    // Simple check for subjects to see if data is readable
    const { data: subjects, error: sError } = await supabase.from('subjects').select('name').limit(3);
    if (sError) {
        console.log('[ERROR] Could not read subjects:', sError.message);
    } else {
        console.log('[OK] Sample subjects:', subjects.map(s => s.name).join(', '));
    }
}

scan();
