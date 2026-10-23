import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Product, Language } from "@/types";
import { getProductSlug } from "@/lib/slugify";
import { Check, X, Sparkles, ArrowRight, ShoppingBag, AlertCircle, Info } from "lucide-react";

interface BlogContentRendererProps {
    content: string;
    lang: Language;
    products?: Product[];
}

export default function BlogContentRenderer({ content, lang, products = [] }: BlogContentRendererProps) {
    if (!content) return null;

    const productsMap = new Map<string, Product>();
    for (const p of products) {
        if (p.id) productsMap.set(p.id.toLowerCase(), p);
        if (p.article) productsMap.set(p.article.toLowerCase(), p);
    }

    // Split content into blocks by double newlines or special section delimiters
    const rawParagraphs = content.split(/\n\s*\n/);

    const elements: React.ReactNode[] = [];

    for (let i = 0; i < rawParagraphs.length; i++) {
        const block = rawParagraphs[i].trim();
        if (!block) continue;

        // 1. Table Detection (Markdown table: lines starting with |)
        if (block.includes("|") && block.split("\n").filter(l => l.trim().startsWith("|")).length >= 2) {
            const tableLines = block.split("\n").filter(l => l.trim().startsWith("|"));
            const headerRow = tableLines[0];
            const dataRows = tableLines.slice(2); // Skip separator (|---|---|)

            const parseRow = (rowStr: string) =>
                rowStr
                    .split("|")
                    .map(c => c.trim())
                    .filter((c, idx, arr) => idx > 0 && idx < arr.length - 1);

            const headers = parseRow(headerRow);

            elements.push(
                <div key={`table-${i}`} className="my-8 overflow-x-auto rounded-2xl border border-[rgba(15,20,16,0.08)] bg-white/80 backdrop-blur-md shadow-xs">
                    <table className="w-full text-left text-sm text-[#111612]">
                        <thead className="bg-[#2D6E3E] text-white font-semibold">
                            <tr>
                                {headers.map((h, hIdx) => (
                                    <th key={hIdx} className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider">
                                        {formatInlineText(h)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[rgba(15,20,16,0.06)]">
                            {dataRows.map((rowStr, rIdx) => {
                                const cells = parseRow(rowStr);
                                if (cells.length === 0) return null;
                                return (
                                    <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-white" : "bg-emerald-50/20"}>
                                        {cells.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-4 py-3 text-xs sm:text-sm font-medium text-[#111612]/90">
                                                {formatInlineText(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            );
            continue;
        }

        // 2. Headings
        if (block.startsWith("## ")) {
            elements.push(
                <h2 key={`h2-${i}`} className="text-2xl sm:text-3xl font-bold tracking-tight text-[#111612] mt-12 mb-4 flex items-center gap-3">
                    <span className="w-2 h-7 bg-[#2D6E3E] rounded-full inline-block shrink-0" />
                    <span>{formatInlineText(block.replace(/^##\s+/, ""))}</span>
                </h2>
            );
            continue;
        }

        if (block.startsWith("### ")) {
            elements.push(
                <h3 key={`h3-${i}`} className="text-xl sm:text-2xl font-bold tracking-tight text-[#111612] mt-8 mb-3">
                    {formatInlineText(block.replace(/^###\s+/, ""))}
                </h3>
            );
            continue;
        }

        // 3. Inline Product Embed: [product:UUID] or [product:article]
        const productMatch = block.match(/^\[product:([a-zA-Z0-9_-]+)\]$/i);
        if (productMatch) {
            const pid = productMatch[1].toLowerCase();
            const product = productsMap.get(pid);
            if (product) {
                elements.push(renderInlineProductCard(product, lang, `embed-${i}`));
                continue;
            }
        }

        // 4. Callout / Tip Block: > [!TIP] or > text or :::tip
        if (block.startsWith("> ") || block.startsWith(":::tip")) {
            const cleanText = block.replace(/^>\s*(\[!TIP\])?\s*/, "").replace(/^:::tip\s*/, "").replace(/:::$/, "").trim();
            elements.push(
                <div key={`callout-${i}`} className="my-6 p-4 sm:p-5 rounded-2xl bg-emerald-50/80 border border-emerald-500/20 flex items-start gap-3.5 backdrop-blur-md">
                    <div className="w-8 h-8 rounded-xl bg-[#2D6E3E] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                        <Sparkles size={16} />
                    </div>
                    <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed font-medium">
                        {formatInlineText(cleanText)}
                    </div>
                </div>
            );
            continue;
        }

        // 5. Pros & Cons Blocks
        if (block.startsWith(":::pros") || block.startsWith("[pros]")) {
            const lines = block
                .replace(/^:::pros/, "").replace(/:::$/, "")
                .replace(/^\[pros\]/, "").replace(/\[\/pros\]$/, "")
                .split("\n")
                .map(l => l.replace(/^[+*-\s]+/, "").trim())
                .filter(Boolean);

            elements.push(
                <div key={`pros-${i}`} className="my-6 p-4 sm:p-5 rounded-2xl bg-emerald-50/60 border border-emerald-500/20">
                    <div className="flex items-center gap-2 text-[#2D6E3E] font-bold text-sm mb-3">
                        <Check size={18} className="stroke-[3]" />
                        <span>{lang === "uz" ? "Afzalliklari (Plyuslari)" : "Преимущества"}</span>
                    </div>
                    <ul className="space-y-2">
                        {lines.map((l, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#111612]/90">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#2D6E3E] mt-2 shrink-0" />
                                <span>{formatInlineText(l)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            );
            continue;
        }

        if (block.startsWith(":::cons") || block.startsWith("[cons]")) {
            const lines = block
                .replace(/^:::cons/, "").replace(/:::$/, "")
                .replace(/^\[cons\]/, "").replace(/\[\/cons\]$/, "")
                .split("\n")
                .map(l => l.replace(/^[+*-\s]+/, "").trim())
                .filter(Boolean);

            elements.push(
                <div key={`cons-${i}`} className="my-6 p-4 sm:p-5 rounded-2xl bg-rose-50/70 border border-rose-500/20">
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-sm mb-3">
                        <AlertCircle size={18} className="stroke-[2.5]" />
                        <span>{lang === "uz" ? "Kamchiliklari / E'tibor berish kerak" : "Недостатки и нюансы"}</span>
                    </div>
                    <ul className="space-y-2">
                        {lines.map((l, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-xs sm:text-sm text-rose-950">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-2 shrink-0" />
                                <span>{formatInlineText(l)}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            );
            continue;
        }

        // 6. Bullet / Numbered List
        if (/^[-*•]\s+/.test(block)) {
            const listItems = block.split("\n").filter(l => /^[-*•]\s+/.test(l.trim()));
            elements.push(
                <ul key={`ul-${i}`} className="my-4 space-y-2 pl-2">
                    {listItems.map((li, lIdx) => (
                        <li key={lIdx} className="flex items-start gap-2.5 text-sm sm:text-base text-[#111612]/90 leading-relaxed">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#2D6E3E] mt-2.5 shrink-0" />
                            <span>{formatInlineText(li.replace(/^[-*•]\s+/, ""))}</span>
                        </li>
                    ))}
                </ul>
            );
            continue;
        }

        // 7. Regular Paragraph
        elements.push(
            <p key={`p-${i}`} className="text-base sm:text-lg text-[#111612]/90 leading-relaxed font-normal my-4">
                {formatInlineText(block)}
            </p>
        );
    }

    return <div className="space-y-2">{elements}</div>;
}

/** Format inline bold (**bold**), code (`code`), or inline [product:id] */
function formatInlineText(text: string): React.ReactNode {
    if (!text) return "";

    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

    return parts.map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return <strong key={index} className="font-bold text-[#111612]">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
            return <code key={index} className="px-1.5 py-0.5 rounded-md bg-emerald-50 text-[#2D6E3E] font-mono text-xs">{part.slice(1, -1)}</code>;
        }
        return part;
    });
}

/** Renders a sleek inline product card embedded inside the article */
function renderInlineProductCard(product: Product, lang: Language, key: string) {
    const slug = getProductSlug(product);
    const href = `/${lang}/products/${slug}`;
    const name = lang === "ru" && product.name_ru ? product.name_ru : (product.name_uz || product.name);
    const imgUrl = (product.images && product.images[0]) || "/images/product-placeholder.png";
    const inStock = (product.stock ?? 0) > 0;
    const formattedPrice = new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "uz-UZ").format(product.price);
    const rawOldPrice = product.oldPrice ?? (product as any).old_price;
    const formattedOldPrice = rawOldPrice ? new Intl.NumberFormat(lang === "ru" ? "ru-RU" : "uz-UZ").format(rawOldPrice) : null;

    return (
        <div
            key={key}
            className="my-8 p-4 sm:p-5 rounded-2xl bg-white border border-[rgba(15,20,16,0.08)] shadow-sm hover:shadow-md hover:border-[#2D6E3E]/30 transition-all duration-200"
        >
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                <Link href={href} className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-xl overflow-hidden bg-[#FAFAF6] relative border border-[rgba(15,20,16,0.04)]">
                    <img
                        src={imgUrl}
                        alt={name}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition-transform duration-200"
                        loading="lazy"
                    />
                </Link>

                <div className="flex-1 min-w-0 text-center sm:text-left">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${inStock ? "bg-emerald-50 text-[#2D6E3E] border border-emerald-500/20" : "bg-zinc-100 text-zinc-600"}`}>
                            {inStock ? (lang === "uz" ? "Omborda bor" : "В наличии") : (lang === "uz" ? "Mavjud emas" : "Нет в наличии")}
                        </span>
                        {product.article && (
                            <span className="text-[11px] text-[rgba(15,20,16,0.4)] font-mono">
                                Art: {product.article}
                            </span>
                        )}
                    </div>

                    <Link href={href} className="block text-sm sm:text-base font-bold text-[#111612] hover:text-[#2D6E3E] transition-colors line-clamp-2">
                        {name}
                    </Link>

                    <div className="mt-2 flex items-baseline justify-center sm:justify-start gap-2">
                        <span className="text-base sm:text-lg font-bold text-[#2D6E3E]">
                            {formattedPrice} {lang === "uz" ? "so'm" : "сум"}
                        </span>
                        {formattedOldPrice && (
                            <span className="text-xs text-[rgba(15,20,16,0.4)] line-through">
                                {formattedOldPrice} {lang === "uz" ? "so'm" : "сум"}
                            </span>
                        )}
                    </div>
                </div>

                <div className="shrink-0 w-full sm:w-auto">
                    <Link
                        href={href}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#2D6E3E] text-white text-xs font-semibold hover:bg-[#255b33] active:scale-95 transition-all shadow-xs"
                    >
                        <span>{lang === "uz" ? "Mahsulotni ko'rish" : "Посмотреть"}</span>
                        <ArrowRight size={14} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
