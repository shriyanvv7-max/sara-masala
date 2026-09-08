import Image from "next/image";

const illustrationTones: Record<string, string> = {
  "#294b35": "green",
  "#e8a317": "yellow",
  "#b33939": "red",
  "#c44a3d": "red",
  "#a66b3d": "orange",
  "#8b5e3c": "brown",
  "#593b2b": "brown",
  "#93422e": "brown",
};

export function GrandmotherIllustration({ color, className = "" }: { color: string; className?: string }) {
  const tone = illustrationTones[color.toLowerCase()] ?? "brown";
  return <Image className={`grandmother-illustration ${className}`.trim()} src={`/images/illustrations/grandmother-${tone}.webp`} alt="" aria-hidden="true" width={627} height={627} sizes="(max-width: 760px) 42vw, 260px" />;
}
