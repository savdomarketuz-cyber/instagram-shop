import { Metadata, ResolvingMetadata } from 'next';
import { supabaseAdmin } from "@/lib/supabase";

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { data: product } = await supabaseAdmin
    .from("products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) {
    return {
      title: 'Velari | Mahsulot topilmadi',
    };
  }

  const previousImages = (await parent).openGraph?.images || [];

  return {
    title: `${product.name_uz || product.name} | Velari`,
    description: product.description_uz || product.description || `Velari do'konida ${product.name} hamyonbop narxlarda.`,
    openGraph: {
      title: `${product.name_uz || product.name} | Velari Uzbekistan`,
      description: product.description_uz || product.description,
      images: [product.image, ...previousImages],
      url: `https://velari.uz/products/${params.id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${product.name_uz || product.name} | Velari`,
      description: product.description_uz || product.description,
      images: [product.image],
    },
  };
}

export default function ProductLayout({ children }: Props) {
  return <>{children}</>;
}
