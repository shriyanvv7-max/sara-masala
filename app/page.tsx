import { HomePage } from "../components/home/home-page";
import { getFeaturedProducts } from "../lib/products";

export default async function Page() { return <HomePage featuredProducts={await getFeaturedProducts()} />; }
