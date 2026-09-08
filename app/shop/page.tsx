import { ShopClient } from "../../components/store"; import { getProducts } from "../../lib/products";
import { publicPageMetadata } from "../../lib/seo";
export const metadata=publicPageMetadata("Shop", "Shop Sara Masala spice powders, masalas and traditional podis, freshly ground and carefully prepared.", "/shop");
export const dynamic = "force-dynamic";
export default async function Shop(){return <ShopClient products={await getProducts()}/>}
