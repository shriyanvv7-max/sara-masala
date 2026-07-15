const fs = require("fs");

const path = "components/store.tsx";
let source = fs.readFileSync(path, "utf8");
source = source.replace(
  '<div className="detail-pack" style={{background:product.color}}>',
  '<div className="detail-pack" style={{background:product.color}}><GrandmotherIllustration color={product.color} className="detail-grandmother"/><div className="detail-pack-content">',
);
source = source.replace(
  '<i>Just Like Paati Made It</i></div><div><p className="eyebrow">{product.category.name}</p><h1>{product.name}</h1><div className="stars">',
  '<i>Just Like Paati Made It</i></div></div><div><p className="eyebrow">{product.category.name}</p><h1>{product.name}</h1><div className="stars">',
);
fs.writeFileSync(path, source);
