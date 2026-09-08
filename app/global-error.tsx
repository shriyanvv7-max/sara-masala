"use client";

import Link from "next/link";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body><main className="content-page"><p className="eyebrow">SARA MASALA</p><h1>Something went<br /><em>off recipe.</em></h1><p>We couldn’t load this page right now. Please try again.</p><div className="confirmation-actions"><button type="button" className="add-cart" onClick={reset}>Try again</button><Link className="add-cart" href="/">Go home</Link></div></main></body></html>;
}
