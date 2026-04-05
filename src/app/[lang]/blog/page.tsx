import { supabaseAdmin } from "@/lib/supabase";
import { mapBlog } from "@/lib/mappers";
import { translations } from "@/lib/translations";
import Link from "next/link";
import { Calendar, Clock, Eye, ArrowRight, Sparkles } from "lucide-react";
import { Metadata } from "next";

export async function generateMetadata({ params: { lang } }: any): Promise<Metadata> {
    const t = translations[lang as 'uz' | 'ru'];
    return {
        title: `${t.blog.title} | Velari`,
        description: t.blog.subtitle,
    };
}

export default async function BlogPage({ params: { lang } }: any) {
    const t = translations[lang as 'uz' | 'ru'];

    const { data: blogsData } = await supabaseAdmin
        .from("blogs")
        .select("*")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

    const blogs = (blogsData || []).map(mapBlog);

    return (
        <main className="min-h-screen bg-[#F8F9FA] pt-32 pb-20 px-4 md:px-10">
            <div className="max-w-7xl mx-auto">
                
                {/* Hero Section */}
                <div className="mb-20 text-center relative">
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-10 animate-pulse pointer-events-none">
                        <Sparkles size={120} className="text-emerald-500" />
                    </div>
                    <h1 className="text-5xl md:text-8xl font-black tracking-tighter italic uppercase mb-6 relative">
                        {t.blog.title}
                    </h1>
                    <p className="text-gray-400 font-black italic uppercase tracking-[0.4em] text-[10px] md:text-xs max-w-sm mx-auto leading-loose bg-white/50 backdrop-blur-sm py-2 rounded-full">
                        {t.blog.subtitle}
                    </p>
                </div>

                {blogs.length === 0 ? (
                    <div className="bg-white rounded-[64px] p-24 text-center shadow-sm border border-gray-100 flex flex-col items-center gap-6">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-200">
                            <Sparkles size={40} />
                        </div>
                        <p className="text-gray-300 font-black italic text-xl uppercase tracking-tighter">{t.blog.noPosts}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                        {blogs.map((blog) => (
                            <Link 
                                key={blog.id} 
                                href={`/${lang}/blog/${blog.slug}`}
                                className="group bg-white rounded-[48px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-3 transition-all duration-700 border border-transparent hover:border-emerald-50"
                            >
                                <div className="aspect-[16/11] overflow-hidden relative">
                                    {blog.image ? (
                                        <img 
                                            src={blog.image} 
                                            alt={lang === 'uz' ? blog.title_uz : blog.title_ru}
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-emerald-50 flex items-center justify-center text-emerald-200">
                                            <Sparkles size={60} />
                                        </div>
                                    )}
                                    <div className="absolute top-8 left-8">
                                        <span className="bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-black/5">
                                            {blog.category || 'Insights'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-10">
                                    <div className="flex items-center gap-6 text-gray-400 text-[9px] font-black uppercase tracking-widest mb-6 opacity-60">
                                        <div className="flex items-center gap-2"><Calendar size={14} className="text-emerald-500" /> {new Date(blog.created_at).toLocaleDateString()}</div>
                                        <div className="flex items-center gap-2"><Clock size={14} className="text-emerald-500" /> {blog.readTime} {t.blog.readTime}</div>
                                    </div>
                                    <h2 className="text-2xl font-black tracking-tighter italic leading-tight mb-5 group-hover:text-emerald-600 transition-colors duration-300">
                                        {lang === 'uz' ? blog.title_uz : blog.title_ru}
                                    </h2>
                                    <p className="text-gray-400 text-sm font-medium line-clamp-2 mb-8 leading-relaxed opacity-80">
                                        {lang === 'uz' ? blog.excerpt_uz : blog.excerpt_ru}
                                    </p>
                                    <div className="flex items-center justify-between pt-8 border-t border-gray-50">
                                        <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 group-hover:gap-5 transition-all duration-500">
                                            {t.blog.readMore} <ArrowRight size={16} />
                                        </span>
                                        <div className="flex items-center gap-2 text-gray-300 text-[10px] font-black italic">
                                            <Eye size={14} /> {blog.views}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
