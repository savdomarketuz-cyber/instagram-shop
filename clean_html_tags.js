const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function cleanHtmlTags(text) {
    if (!text) return text;
    // Replace <br/>, <br>, </br> with newline to preserve spacing
    let cleaned = text.replace(/<br\s*\/?>/gi, '\n');
    cleaned = cleaned.replace(/<\/br>/gi, '\n');
    
    // Replace <p>, </p> with newline
    cleaned = cleaned.replace(/<p>/gi, '\n');
    cleaned = cleaned.replace(/<\/p>/gi, '\n');
    
    // Remove other basic formatting tags if they exist (b, i, strong, em, ul, li)
    // Or just simple generic tags
    cleaned = cleaned.replace(/<\/?(b|i|strong|em|ul|li|div|span)[^>]*>/gi, '');
    
    return cleaned;
}

async function cleanDatabase() {
    console.log('Fetching all products...');
    const { data: products, error } = await supabase.from('products').select('id, description, description_uz, description_ru');
    
    if (error) {
        console.error('Error fetching products:', error);
        return;
    }
    
    let updatedCount = 0;
    
    for (const p of products) {
        let needsUpdate = false;
        let updatePayload = {};
        
        if (p.description && /<[a-z][\s\S]*>/i.test(p.description)) {
            const cleaned = cleanHtmlTags(p.description);
            if (cleaned !== p.description) {
                updatePayload.description = cleaned;
                needsUpdate = true;
            }
        }
        
        if (p.description_uz && /<[a-z][\s\S]*>/i.test(p.description_uz)) {
            const cleaned = cleanHtmlTags(p.description_uz);
            if (cleaned !== p.description_uz) {
                updatePayload.description_uz = cleaned;
                needsUpdate = true;
            }
        }
        
        if (p.description_ru && /<[a-z][\s\S]*>/i.test(p.description_ru)) {
            const cleaned = cleanHtmlTags(p.description_ru);
            if (cleaned !== p.description_ru) {
                updatePayload.description_ru = cleaned;
                needsUpdate = true;
            }
        }
        
        if (needsUpdate) {
            const { error: updateError } = await supabase.from('products')
                .update(updatePayload)
                .eq('id', p.id);
                
            if (updateError) {
                console.error('Failed to update product', p.id, updateError);
            } else {
                updatedCount++;
            }
        }
    }
    
    console.log(`Successfully cleaned HTML tags for ${updatedCount} products.`);
}

cleanDatabase();
