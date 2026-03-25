const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.local' });

const firebaseConfig = require('./firebase-adminsdk.json');
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const firestore = admin.firestore();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateCollection(collectionName, tableName, transformFn) {
  console.log(`Migrating ${collectionName}...`);
  const snapshot = await firestore.collection(collectionName).get();
  const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (docs.length === 0) {
    console.log(`No documents found in ${collectionName}.`);
    return;
  }

  const transformedDocs = docs.map(transformFn);

  // Chunking to avoid large request errors
  const chunkSize = 50;
  for (let i = 0; i < transformedDocs.length; i += chunkSize) {
    const chunk = transformedDocs.slice(i, i + chunkSize);
    const { error } = await supabase.from(tableName).upsert(chunk);
    if (error) {
       console.error(`Error migrating chunk for ${collectionName}:`, error);
    }
  }

  console.log(`Successfully migrated ${docs.length} documents to ${tableName}.`);
}

const transformProduct = (p) => ({
  id: p.id,
  name: p.name || "",
  name_uz: p.name_uz || p.name || "",
  name_ru: p.name_ru || p.name || "",
  price: Number(p.price) || 0,
  old_price: Number(p.oldPrice) || 0,
  category_id: p.category || null,
  category_uz: p.category_uz || "",
  category_ru: p.category_ru || "",
  stock: Number(p.stock) || 0,
  stock_details: p.stockDetails || {},
  image: p.image || "",
  images: Array.isArray(p.images) ? p.images : (p.image ? [p.image] : []),
  description: p.description || "",
  description_uz: p.description_uz || "",
  description_ru: p.description_ru || "",
  tag: p.tag || "",
  sku: p.sku || "",
  group_id: p.groupId || "",
  color_name: p.colorName || "",
  sales: Number(p.sales) || 0,
  is_deleted: !!p.isDeleted,
  article: p.article || "",
  is_original: !!p.isOriginal,
  brand_id: p.brand || null,
  height: String(p.height || ""),
  width: String(p.width || ""),
  length: String(p.length || ""),
  weight: String(p.weight || ""),
  barcode: p.barcode || "",
  video_url: p.videoUrl || "",
  created_at: p.createdAt ? (p.createdAt.toDate ? p.createdAt.toDate().toISOString() : p.createdAt) : new Date().toISOString()
});

const transformOrder = (o) => ({
  id: o.id,
  user_phone: o.userPhone || "",
  items: o.items || [],
  total: Number(o.total) || 0,
  address: o.address || "",
  coords: o.coords || null,
  status: o.status || "",
  created_at: o.createdAt ? (o.createdAt.toDate ? o.createdAt.toDate().toISOString() : o.createdAt) : new Date().toISOString(),
});

const transformUser = (u) => ({
  id: u.id,
  phone: u.phone || "",
  password: u.password || "",
  name: u.name || "",
  username: u.username || "",
  is_admin: !!u.isAdmin,
  ip_address: u.ipAddress || "",
  last_login: u.lastLogin ? (u.lastLogin.toDate ? u.lastLogin.toDate().toISOString() : u.lastLogin) : null,
  created_at: u.createdAt ? (u.createdAt.toDate ? u.createdAt.toDate().toISOString() : u.createdAt) : new Date().toISOString(),
});

async function main() {
  try {
    console.log("Starting full migration...");
    
    // 1. Categories
    await migrateCollection('categories', 'categories', (c) => ({
      id: c.id,
      name: c.name || "",
      name_uz: c.name_uz || c.name || "",
      name_ru: c.name_ru || c.name || "",
      parent_id: c.parentId || null,
      image: c.image || "",
      is_deleted: !!c.isDeleted,
      created_at: c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString()
    }));

    // 2. Brands
    await migrateCollection('brands', 'brands', (b) => ({
      id: b.id,
      name: b.name || "",
      name_uz: b.name_uz || b.name || "",
      name_ru: b.name_ru || b.name || "",
      image: b.image || "",
      is_deleted: !!b.isDeleted,
      created_at: b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toISOString() : new Date().toISOString()) : new Date().toISOString()
    }));

    // 3. Products
    await migrateCollection('products', 'products', transformProduct);

    // 4. Users
    await migrateCollection('users', 'users', transformUser);

    // 5. Orders
    await migrateCollection('orders', 'orders', transformOrder);

    // 6. Comments
    await migrateCollection('comments', 'comments', (c) => ({
      id: c.id,
      product_id: c.productId || "",
      user_id: c.userId || "",
      username: c.username || "",
      text: c.text || "",
      type: c.type || "review",
      parent_id: c.parentId || null,
      rating: Number(c.rating) || null,
      reactions: c.reactions || {},
      is_admin: !!c.isAdmin,
      is_edited: !!c.isEdited,
      created_at: c.timestamp || (c.createdAt ? (c.createdAt.toDate ? c.createdAt.toDate().toISOString() : c.createdAt) : new Date().toISOString())
    }));

    // 7. Banners
    await migrateCollection('banners', 'banners', (b) => ({
      id: b.id,
      title_uz: b.title_uz || "",
      title_ru: b.title_ru || "",
      subtitle_uz: b.subtitle_uz || "",
      subtitle_ru: b.subtitle_ru || "",
      image_url_uz: b.imageUrl_uz || "",
      image_url_ru: b.imageUrl_ru || "",
      link_type: b.linkType || "none",
      link_ids: Array.isArray(b.linkIds) ? b.linkIds : [],
      button_text: b.buttonText || "Sotib olish",
      active: b.active !== false,
      order_index: Number(b.order) || 0,
      tab_name_uz: b.tabName_uz || "",
      tab_name_ru: b.tabName_ru || "",
      created_at: b.createdAt ? (b.createdAt.toDate ? b.createdAt.toDate().toISOString() : b.createdAt) : new Date().toISOString()
    }));

    // 8. Settings
    await migrateCollection('settings', 'settings', (s) => ({
      id: s.id,
      data: s,
      updated_at: s.updatedAt ? (s.updatedAt.toDate ? s.updatedAt.toDate().toISOString() : s.updatedAt) : new Date().toISOString()
    }));

    // 9. Warehouses
    await migrateCollection('warehouses', 'warehouses', (w) => ({
      id: w.id,
      name: w.name || "",
      address: w.address || "",
      location: w.location || null,
      created_at: w.createdAt ? (w.createdAt.toDate ? w.createdAt.toDate().toISOString() : w.createdAt) : new Date().toISOString()
    }));

    // 10. Support Chats & Messages
    console.log("Migrating support chats and messages...");
    const chatsSnap = await firestore.collection('support_chats').get();
    for (const chatDoc of chatsSnap.docs) {
      const chat = chatDoc.data();
      const chatId = chatDoc.id;
      
      // Upsert chat session
      await supabase.from('support_chats').upsert({
        id: chatId,
        username: chat.username || chatId,
        last_message: chat.lastMessage || "",
        last_timestamp: chat.lastTimestamp ? (chat.lastTimestamp.toDate ? chat.lastTimestamp.toDate().toISOString() : chat.lastTimestamp) : null,
        status: chat.status || "active",
        unread_by_admin: Number(chat.unreadByAdmin) || 0,
        created_at: chat.createdAt ? (chat.createdAt.toDate ? chat.createdAt.toDate().toISOString() : chat.createdAt) : new Date().toISOString()
      });

      // Fetch and migrate messages
      const msgsSnap = await chatDoc.ref.collection('messages').get();
      const msgs = msgsSnap.docs.map(mDoc => {
        const m = mDoc.data();
        return {
          id: mDoc.id,
          chat_id: chatId,
          text: m.text || "",
          image: m.image || null,
          video: m.video || null,
          sender_id: m.senderId || "",
          sender_type: m.sender || "user",
          is_admin: !!m.isAdmin,
          created_at: m.timestamp ? (m.timestamp.toDate ? m.timestamp.toDate().toISOString() : m.timestamp) : new Date().toISOString()
        };
      });

      if (msgs.length > 0) {
        await supabase.from('support_messages').upsert(msgs);
      }
    }
    
    console.log("Migration finished successfully!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    process.exit();
  }
}

main();
