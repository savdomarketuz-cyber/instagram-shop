import { Metadata, ResolvingMetadata } from 'next';
import { db, doc, getDoc } from "@/lib/firebase";

type Props = {
  params: { id: string };
  children: React.ReactNode;
};

export async function generateMetadata(
  { params }: Props,
  parent: ResolvingMetadata
): Promise<Metadata> {
  // fetch data
  const docRef = doc(db, "products", params.id);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return {
      title: 'Velari | Mahsulot topilmadi',
    };
  }

  const product = docSnap.data();
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
