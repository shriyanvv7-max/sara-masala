import Link from "next/link";
import { PublicLogo } from "../components/ui/public-logo";

export default function NotFound() {
  return <main className="content-page"><PublicLogo className="brand" imageClassName="store-logo-image" priority /><p className="eyebrow">PAGE NOT FOUND</p><h1>This page wandered<br /><em>out of the pantry.</em></h1><p>Let’s get you back to something delicious.</p><div className="confirmation-actions"><Link className="add-cart" href="/">Go home</Link><Link className="add-cart" href="/shop">Shop the pantry</Link></div></main>;
}
