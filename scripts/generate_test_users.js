require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const users = [
    { name: "Alisher Navoiy", phone: "+998901234567" },
    { name: "Zuhra Karimova", phone: "+998912345678" },
    { name: "Jasur Abdullayev", phone: "+998933456789" },
    { name: "Malika Orifova", phone: "+998944567890" },
    { name: "Sardor Ahmedov", phone: "+998955678901" },
    { name: "Dilshod To'rayev", phone: "+998971112233" },
    { name: "Guli Nazarova", phone: "+998993334455" },
    { name: "Bobur Mirzo", phone: "+998881230011" },
    { name: "Nodira Shoira", phone: "+998774445566" },
    { name: "Temur Malikov", phone: "+998907778899" },
    { name: "Aziz Ismoilov", phone: "+998918889900" },
    { name: "Laylo Sharipova", phone: "+998933334444" },
    { name: "Farhod Ergashev", phone: "+998941111111" },
    { name: "Sevara Aliyeva", phone: "+998952222222" },
    { name: "Bekzod Rahimov", phone: "+998976666666" },
    { name: "Munisa Rizaeva", phone: "+998997777777" },
    { name: "Rustam Qulmatov", phone: "+998888888888" },
    { name: "Umida Solihova", phone: "+998779999999" },
    { name: "Botir Komilov", phone: "+998901010101" },
    { name: "Shohruh Mirzo", phone: "+998912020202" }
];

async function main() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    try {
        await client.connect();
        console.log('👥 Adding 20 premium customers with IDs...');
        
        for (const u of users) {
             const userId = 'user_' + Math.random().toString(36).substr(2, 9);
             // 1. Add user
             await client.query(`
                INSERT INTO users (id, name, phone, username, password, created_at)
                VALUES ($1, $2, $3, $4, $5, now())
                ON CONFLICT (phone) DO UPDATE SET name = $2
             `, [userId, u.name, u.phone, u.phone, 'welcome123']);

             // 2. Add wallet for them
             const randomBalance = Math.floor(Math.random() * 50000);
             await client.query(`
                INSERT INTO user_wallets (user_phone, wallet_number, balance)
                VALUES ($1, '8600' || floor(random() * 1000000000000)::text, $2)
                ON CONFLICT (user_phone) DO NOTHING
             `, [u.phone, randomBalance]);
        }

        console.log('✅ 20 Customers and their Wallets successfully initialized!');
        
    } catch (err) {
        console.error('❌ Failed:', err);
    } finally {
        await client.end();
    }
}
main();
