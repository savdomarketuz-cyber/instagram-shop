const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

function hashPassword(password) {
    const salt = process.env.ADMIN_SECRET || "velari_fallback_shared_salt_2024";
    return crypto.createHash("sha256").update(password + salt).digest("hex");
}

async function createUser() {
    const name = "Nurbek";
    const phone = "+998990216667";
    const passwordPlain = "nurbek";
    const passwordHash = hashPassword(passwordPlain);
    const userId = "user_" + Math.random().toString(36).substr(2, 9);
    
    // Check if user already exists
    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', phone).single();
    if (existingUser) {
        console.log("User already exists! ID:", existingUser.id);
        // update password
        const { error: updateErr } = await supabase.from('users').update({
           password: passwordHash,
           name: name
        }).eq('id', existingUser.id);
        if (updateErr) {
             console.error("Failed to update user:", updateErr);
        } else {
             console.log("User updated with new password successfully!");
        }
        return;
    }

    const { data, error } = await supabase.from('users').insert({
        id: userId,
        phone: phone,
        username: phone,
        name: name,
        password: passwordHash,
        is_admin: false,
        created_at: new Date().toISOString(),
        token_version: 1,
        real_balance: 0
    });

    if (error) {
        console.error("Error creating user:", error);
    } else {
        console.log("User created successfully with ID:", userId);
    }
}

createUser();
