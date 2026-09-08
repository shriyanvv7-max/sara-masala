import "server-only";
import { revalidateTag } from "next/cache";

export function revalidateProductCatalog() {
  revalidateTag("product-catalog");
}
