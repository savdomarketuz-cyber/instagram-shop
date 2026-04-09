import { supabaseAdmin } from "@/lib/supabase-admin";
import { Metadata } from "next";
import { cache } from "react";
import { mapBlog, mapProduct } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import Link from "next/link";
import { ChevronLeft, Calendar, Clock, Eye, Share2 } from "lucide-react";
import { notFound } from "next/navigation";
import LinkedProducts from "./LinkedProducts";

const getBlogData = cache(async (slug: string) => {
    const { data } = await supabaseAdmin
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("is_deleted", false)
        .single();
    
    return data ? mapBlog(data) : null;
});

export async function generateMetadata({ params: { lang, slug } }: { params: { lang: string, slug: string } }): Promise<Metadata> {
    const blog = await getBlogData(slug);
    if (!blog) return { title: 'Maqola topilmadi | Velari' };

    const title = lang === 'uz' ? blog.title_uz : blog.title_ru;
    const description = (lang === 'uz' ? blog.excerpt_uz || blog.content_uz : blog.excerpt_ru || blog.content_ru).substring(0, 160);
    const baseUrl = "https://velari.uz";

    return {
        title: `${title} | Velari Insights`,
        description,
        openGraph: {
            title,
            description,
            url: `${baseUrl}/${lang}/blog/${slug}`,
            images: [{ url: blog.image || "/og-image.png" }],
            type: 'article',
        },
        alternates: {
            canonical: `/blog/${slug}`,
            languages: {
                'uz-UZ': `/uz/blog/${slug}`,
                'ru-RU': `/ru/blog/${slug}`,
            },
        },
    };
}

export default async function BlogPostPage({ params: { lang, slug } }: { params: { lang: string, slug: string } }) {
    const t = translations[lang as 'uz' | 'ru'];

    // 1. Fetch Blog
    const { data: blogData } = await supabaseAdmin
        .from("blogs")
        .select("*")
        .eq("slug", slug)
        .eq("is_deleted", false)
        .single();

    if (!blogData) notFound();
    const blog = mapBlog(blogData);

    // 2. Fetch Linked Products
    let linkedProducts: any[] = [];
    if (blog.linkedProductIds && blog.linkedProductIds.length > 0) {
        const { data: pData } = await supabaseAdmin
            .from("products")
            .select("*")
            .in("id", blog.linkedProductIds)
            .eq("is_deleted", false);
        
        if (pData) linkedProducts = pData.map(mapProduct);
    }

    // 3. Increment Views (Simple update)
    await supabaseAdmin.from("blogs").update({ views: (blog.views || 0) + 1 }).eq("id", blog.id);

    return (
        <main className="min-h-screen bg-white pb-32">
            
            {/* 1. Header Navigation */}
            <div className="fixed top-24 left-0 right-0 z-50 pointer-events-none">
                <div className="max-w-4xl mx-auto px-4 md:px-0">
                    <Link 
                        href={`/${lang}/blog`} 
                        className="pointer-events-auto inline-flex items-center gap-2 bg-white/80 backdrop-blur-2xl border border-gray-100 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-black/5"
                    >
                        <ChevronLeft size={16} className="text-emerald-500" /> {t.blog.backToList}
                    </Link>
                </div>
            </div>

            {/* 2. Hero Image Section */}
            <div className="w-full h-[60vh] md:h-[80vh] relative pt-24">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img 
                    src={blog.image || '/images/blog-placeholder.jpg'} 
                    alt={lang === 'uz' ? blog.title_uz : blog.title_ru}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-20" />
                
                <div className="absolute bottom-20 left-0 right-0 z-30 px-6 md:px-0">
                    <div className="max-w-4xl mx-auto">
                        <span className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] mb-8 shadow-2xl shadow-emerald-500/40">
                            {blog.category || 'INSIGHTS'}
                        </span>
                        <h1 className="text-4xl md:text-7xl font-black text-white italic tracking-tighter uppercase leading-[0.9] mb-10 drop-shadow-2xl">
                            {lang === 'uz' ? blog.title_uz : blog.title_ru}
                        </h1>
                        
                        <div className="flex flex-wrap items-center gap-10 text-white/70 text-[10px] font-black uppercase tracking-widest">
                            <div className="flex items-center gap-3"><Calendar size={16} className="text-emerald-400" /> {new Date(blog.created_at).toLocaleDateString()}</div>
                            <div className="flex items-center gap-3"><Clock size={16} className="text-emerald-400" /> {blog.readTime} {t.blog.readTime}</div>
                            <div className="flex items-center gap-3"><Eye size={16} className="text-emerald-400" /> {blog.views} {t.blog.views}</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. Content Section */}
            <div className="max-w-3xl mx-auto px-6 md:px-0 pt-20">
                <article className="prose prose-emerald prose-xl max-w-none">
                    <div className="text-gray-700 leading-[1.8] font-medium text-lg md:text-xl whitespace-pre-wrap tracking-tight">
                        {lang === 'uz' ? blog.content_uz : blog.content_ru}
                    </div>
                </article>

                <div className="mt-20 pt-10 border-t border-gray-100 flex items-center justify-between">
                    <button className="flex items-center gap-4 text-gray-400 font-black uppercase tracking-widest text-[10px] hover:text-black transition-colors group">
                        <Share2 size={16} className="group-hover:rotate-12 transition-transform" /> {lang === 'uz' ? 'Maqolani ulashing' : 'Поделиться статьей'}
                    </button>
                    <div className="text-gray-300 font-black italic text-[10px] tracking-widest">VELARI INSIGHTS</div>
                </div>
            </div>

            {/* 4. Linked Products Section (Client Side) */}
            <LinkedProducts products={linkedProducts} lang={lang as any} />

        </main>
    );
}
