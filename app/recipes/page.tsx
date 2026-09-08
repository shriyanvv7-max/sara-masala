"use client";

import Image from "next/image";
import { useState } from "react";
import { StoreNav } from "../../components/store";

const recipes = [
  ["Chettinad Chicken Curry", "A bold, roasted curry made for a slow Sunday.", "/images/references/chettinad-curry.jpg"],
  ["Classic Sambar", "The hearty soul of a South Indian table.", "/images/references/sambar.jpg"],
  ["Pepper Rasam", "A warming bowl of peppery comfort.", "/images/references/whole-spices.jpg"],
  ["Paneer Masala", "Rich, bright and beautifully spiced.", "/images/references/chilli-dabba.jpg"],
  ["Mushroom Masala", "Earthy mushrooms in a deep masala gravy.", "/images/references/chettinad-curry.jpg"],
];

export default function Recipes() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | null>(null);
  return <><StoreNav /><main className="recipes-page">
    <p className="eyebrow">FROM THE SARA TABLE</p><h1>Recipes for<br /><em>every gathering.</em></h1>
    <input className="recipe-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search recipes" />
    <div className="recipe-grid">{recipes.filter(recipe => recipe[0].toLowerCase().includes(query.toLowerCase())).map(recipe =>
      <button type="button" className="recipe-card" onClick={() => setActive(recipe[0])} key={recipe[0]}>
        <Image src={recipe[2]} alt="" width={736} height={736} sizes="(max-width: 760px) 88vw, 31vw" />
        <div><span>RECIPE</span><h3>{recipe[0]}</h3><p>{recipe[1]}</p></div>
      </button>,
    )}</div>
    {active && <div className="modal" role="dialog" aria-modal="true"><div>
      <button type="button" aria-label="Close recipe" onClick={() => setActive(null)}>×</button>
      <p className="eyebrow">SARA RECIPE</p><h2>{active}</h2>
      <p>Made with a generous spoonful of Sara Masala. Full recipe details will arrive with the next kitchen story.</p>
    </div></div>}
  </main></>;
}
