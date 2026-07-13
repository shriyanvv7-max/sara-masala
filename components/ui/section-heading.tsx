type Props = { eyebrow: string; title: string; body?: string; align?: "left" | "center" };
export function SectionHeading({ eyebrow, title, body, align = "center" }: Props) {
  return <div className={`heading ${align}`}>
    <p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{body && <p className="lede">{body}</p>}
  </div>;
}
