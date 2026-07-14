import Image from "next/image";
import Link from "next/link";
type Props = { className?: string; imageClassName?: string; priority?: boolean; linked?: boolean };
export function PublicLogo({ className = "", imageClassName = "", priority = false, linked = true }: Props) {
  const image = <Image className={imageClassName} src="/images/sara-masala-logo-transparent.png" alt="Sara Masala" width={1889} height={832} priority={priority} />;
  return linked ? <Link href="/" className={className} aria-label="Sara Masala home">{image}</Link> : image;
}
