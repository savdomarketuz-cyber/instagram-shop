import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) throw new Error('Missing keys');
const supabase = createClient(supabaseUrl, supabaseKey);
async function main() {
    const { data } = await supabase.from('categories').select('*');
    console.log(JSON.stringify(data, null, 2));
}
main();
