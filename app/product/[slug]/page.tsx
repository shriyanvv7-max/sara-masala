import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductDetail } from "../../../components/store";
import { getProduct, getRelatedProducts } from "../../../lib/products";
import { BRAND_IMAGE, SITE_URL, safeJsonLd } from "../../../lib/seo";

type ProductPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found", robots: { index: false, follow: false } };
  const path = `/product/${encodeURIComponent(product.slug)}`;
  const image = product.image || BRAND_IMAGE;
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      url: path,
      siteName: "Sara Masala",
      title: `${product.name} | Sara Masala`,
      description: product.description,
      images: [{ url: image, alt: product.image ? product.name : "Sara Masala — Just Like Paati Made It" }],
    },
    twitter: { card: "summary_large_image", title: `${product.name} | Sara Masala`, description: product.description, images: [image] },
  };
}

export default async function Product({ params }: ProductPageProps) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const productUrl = `${SITE_URL}/product/${encodeURIComponent(product.slug)}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: [product.image || `${SITE_URL}${BRAND_IMAGE}`],
    url: productUrl,
    brand: { "@type": "Brand", name: "Sara Masala" },
    offers: product.variants.map(variant => ({
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "INR",
      price: variant.price,
      availability: variant.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} /><ProductDetail product={product} relatedProducts={await getRelatedProducts(product.category.id, product.id)} /></>;
}
