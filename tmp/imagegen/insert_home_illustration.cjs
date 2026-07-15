const fs = require("fs");

const path = "components/home/home-page.tsx";
let source = fs.readFileSync(path, "utf8");
source = source.replace(
  'style={{background:product.color}}>{product.image?',
  'style={{background:product.color}}><GrandmotherIllustration color={product.color}/><div className="pack-content">{product.image?',
);
source = source.replace(
  '<i>Just Like Paati Made It</i></a><div className="product-copy">',
  '<i>Just Like Paati Made It</i></div></a><div className="product-copy">',
);
fs.writeFileSync(path, source);
