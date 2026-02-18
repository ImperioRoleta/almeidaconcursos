
import { describe, it, expect } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Use process.env for standard Node env, or import.meta.env for Vite
// Vitest supports import.meta.env
const supabaseUrl = process.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

describe('Database Debug', () => {
    it('should list all plans and coupons', async () => {
        if (!supabaseUrl || !supabaseKey) {
            console.warn('Skipping test: Missing Supabase credentials');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        const { data: plans, error: plansError } = await supabase
            .from('plans')
            .select('*');

        if (plansError) console.error('Plans Error:', plansError);
        else console.log('Plans:', JSON.stringify(plans, null, 2));

        const { data: settings, error: settingsError } = await supabase
            .from('platform_settings')
            .select('*');

        if (settingsError) console.error('Settings Error:', settingsError);
        else console.log('Platform Settings:', JSON.stringify(settings, null, 2));

        expect(true).toBe(true);
    });
});
