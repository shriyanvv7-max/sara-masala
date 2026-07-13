import { ShopClient } from "../../components/store"; import { getProducts } from "../../lib/products";
export const metadata={title:"Shop | Sara Masala"};
export default async function Shop(){return <ShopClient products={await getProducts()}/>}
