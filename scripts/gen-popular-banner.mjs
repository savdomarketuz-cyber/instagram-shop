// Bazadagi real mashhur mahsulotlardan "Velari'da mashhur" banner HTML'ini generatsiya qiladi.
// Ishlatish: node scripts/gen-popular-banner.mjs > banner.html
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// .env.local'ni o'qiymiz
const env = {};
for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const slugify = (item) => {
    const name = (item.name_uz || item.name || "product").toLowerCase();
    const slug = name.replace(/[^a-z0-9\s]/g, "").trim().replace(/\s+/g, "-");
    return `${slug}--${item.article || item.id}`;
};
const esc = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fmt = (n) => Number(n || 0).toLocaleString("ru-RU") + " so'm";

const { data, error } = await supabase
    .from("products")
    .select("id,name,name_uz,name_ru,article,image,images,price,old_price,sales,stock,stock_details")
    .eq("is_deleted", false)
    .order("sales", { ascending: false })
    .limit(40);

if (error) { console.error("DB xato:", error.message); process.exit(1); }

const inStock = (data || []).filter((p) => {
    const t = p.stock_details ? Object.values(p.stock_details).reduce((a, b) => a + (Number(b) || 0), 0) : (p.stock || 0);
    return t > 0;
});
const top = inStock.slice(0, 6);

const card = (p, clone) => {
    const slug = slugify(p);
    const imgs = Array.isArray(p.images) ? p.images.filter((u) => u && !String(u).toLowerCase().endsWith(".mp4")) : [];
    const img = imgs[0] || p.image || "";
    const name = p.name_uz || p.name || "";
    const attrs = clone ? ' aria-hidden="true" tabindex="-1"' : "";
    return `      <a class="vlrCard" href="/uz/products/${esc(slug)}"${attrs}><img class="vlrMedia" src="${esc(img)}" alt="${esc(name)}" loading="lazy"><div class="vlrInfo"><span class="vlrName">${esc(name)}</span><span class="vlrPrice">${fmt(p.price)}</span></div></a>`;
};

const cards = [...top.map((p) => card(p, false)), ...top.map((p) => card(p, true))].join("\n");

const html = `<div style="container-type:size; position:relative; width:100%; height:100%; box-sizing:border-box; overflow:hidden; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; background:linear-gradient(125deg,#160a28 0%,#241047 45%,#0d2e54 100%); display:flex; flex-direction:column; padding:clamp(12px,4cqmin,28px); gap:clamp(8px,2.4cqmin,16px);">
  <style>
    @keyframes vlrScroll { from{ transform:translateX(0); } to{ transform:translateX(-50%); } }
    .vlrHead{ display:flex; align-items:center; justify-content:space-between; gap:10px; flex:0 0 auto; }
    .vlrTtl{ color:#fff; font-weight:800; font-size:clamp(14px,4.6cqmin,26px); letter-spacing:-.01em; }
    .vlrTtl span{ background:linear-gradient(90deg,#ff80ab,#ffd180); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .vlrAll{ color:#e0d7ff; font-weight:600; font-size:clamp(10px,2.8cqmin,14px); white-space:nowrap; padding:clamp(5px,1.6cqmin,9px) clamp(10px,2.8cqmin,16px); border:1px solid rgba(255,255,255,.25); border-radius:999px; background:rgba(255,255,255,.08); text-decoration:none; }
    .vlrView{ position:relative; flex:1 1 auto; min-height:0; overflow:hidden; -webkit-mask:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); mask:linear-gradient(90deg,transparent,#000 5%,#000 95%,transparent); }
    .vlrTrack{ display:flex; gap:clamp(8px,2.4cqmin,16px); height:100%; width:max-content; animation:vlrScroll 30s linear infinite; }
    .vlrView:hover .vlrTrack{ animation-play-state:paused; }
    .vlrCard{ flex:0 0 auto; width:clamp(132px,40cqw,184px); height:100%; display:flex; flex-direction:column; border-radius:clamp(10px,2.4cqmin,18px); overflow:hidden; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); text-decoration:none; }
    .vlrMedia{ flex:1 1 auto; min-height:0; width:100%; object-fit:cover; display:block; background:#1a1230; }
    .vlrInfo{ flex:0 0 auto; padding:clamp(6px,1.8cqmin,12px); display:flex; flex-direction:column; gap:2px; }
    .vlrName{ color:#fff; font-weight:600; font-size:clamp(10px,2.6cqmin,14px); line-height:1.25; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .vlrPrice{ color:#ffd180; font-weight:700; font-size:clamp(11px,2.8cqmin,15px); }
  </style>

  <div class="vlrHead">
    <div class="vlrTtl">Velari'da <span>mashhur</span></div>
    <a class="vlrAll" href="/uz/catalog">Hammasi →</a>
  </div>

  <div class="vlrView">
    <div class="vlrTrack">
${cards}
    </div>
  </div>
</div>`;

console.log("\n===== TOP MAHSULOTLAR =====");
top.forEach((p, i) => console.log(`${i + 1}. ${p.name_uz || p.name} — ${fmt(p.price)} (sales: ${p.sales || 0})`));
console.log("\n===== BANNER HTML (pastdagini nusxalang) =====\n");
console.log(html);
