const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function deleteParams() {
    const paramsToDelete = ["Hukmdor", "Ishlab chiqaruvchidan rang nomi"];
    
    // Find these parameters in category_params
    const { data: catParams, error } = await supabase
        .from('category_params')
        .select('id, name')
        .in('name', paramsToDelete);
        
    if (error) {
        return console.error("Error fetching params:", error);
    }
    
    if (!catParams || catParams.length === 0) {
        return console.log("Parameters not found in the database.");
    }
    
    const idsToDelete = catParams.map(p => p.id);
    console.log(`Found ${idsToDelete.length} matching parameters to delete.`);
    
    // Delete from product_param_values first to avoid foreign key constraint issues
    const { error: valErr } = await supabase
        .from('product_param_values')
        .delete()
        .in('param_id', idsToDelete);
        
    if (valErr) {
        console.error("Error deleting product parameter values:", valErr);
    } else {
        console.log("Deleted related product parameter values.");
    }
    
    // Now delete from category_params
    const { error: paramErr } = await supabase
        .from('category_params')
        .delete()
        .in('id', idsToDelete);
        
    if (paramErr) {
        console.error("Error deleting category parameters:", paramErr);
    } else {
        console.log("Successfully deleted the parameters from all categories.");
    }
}

deleteParams();
