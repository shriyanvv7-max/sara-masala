"use client";

import { motion } from "framer-motion";
import { Heart, Instagram, Menu, Search, ShoppingBag, Star, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PrimaryButton, SecondaryButton } from "../ui/buttons";
import { SectionHeading } from "../ui/section-heading";
import { useCart } from "../cart-provider";
import type { Product } from "../../lib/products";
import { PublicLogo } from "../ui/public-logo";

const categories = [
  ["Spice Powders", "Everyday essentials, freshly ground", "/images/references/whole-spices.jpg"],
  ["Signature Masalas", "A world of slow-cooked flavour", "/images/references/chilli-dabba.jpg"],
  ["Traditional Podi", "A little comfort in every spoon", "/images/references/sambar.jpg"],
] as const;
const recipes = [
  ["Chettinad Chicken Curry", "45 min", "/images/references/chettinad-curry.jpg"],
  ["Classic Sambar", "35 min", "/images/references/sambar.jpg"],
  ["Masala Dabba Stories", "20 min", "/images/references/chilli-dabba.jpg"],
] as const;

export function HomePage({ featuredProducts }: { featuredProducts: Product[] }) {
  const [open, setOpen] = useState(false); const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  useEffect(() => { const f = () => setScrolled(scrollY > 30); addEventListener("scroll", f); return () => removeEventListener("scroll", f); }, []);
  return <main>
    <nav className={`nav ${scrolled ? "nav-solid" : ""}`}>
      <PublicLogo className="brand public-header-logo" imageClassName="public-logo-image" priority />
      <div className="navlinks">{[["Home","/"],["Shop","/shop"],["Recipes","/recipes"],["Our Story","/about"],["Contact","/contact"]].map(([x,href]) => <a key={x} href={href}>{x}</a>)}</div>
      <div className="navactions"><Search size={20}/><a className="cart-link" href="/cart" aria-label="Cart"><ShoppingBag size={20}/>{count>0&&<b>{count}</b>}</a><button className="mobile-menu" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X/> : <Menu/>}</button><a href="/shop" className="nav-cta">Shop now</a></div>
      {open && <div className="mobile-links">{[["Home","/"],["Shop","/shop"],["Recipes","/recipes"],["Our Story","/about"],["Contact","/contact"]].map(([x,href]) => <a onClick={() => setOpen(false)} key={x} href={href}>{x}</a>)}</div>}
    </nav>

    <section className="hero" id="top">
      <div className="hero-image"/><div className="hero-shade"/>
      <motion.div className="hero-content" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.8}}>
        <p className="hero-kicker">SMALL-BATCH SOUTH INDIAN GOODNESS</p>
        <h1>Just Like<br/><em>Paati Made It.</em></h1>
        <p>Traditional recipes crafted with authentic ingredients and freshly ground spices.</p>
        <div className="hero-buttons"><PrimaryButton href="/shop">Shop the collection</PrimaryButton><SecondaryButton href="/recipes">Explore recipes</SecondaryButton></div>
      </motion.div>
      <div className="hero-badges"><span>NO PRESERVATIVES</span><i/><span>FRESHLY GROUND</span><i/><span>SMALL BATCH</span></div>
      <div className="spice spice-one">✦</div><div className="spice spice-two">✳</div>
    </section>

    <section className="categories section" id="shop"><SectionHeading eyebrow="SHOP BY MOOD" title="A spice for every story" body="From the dishes you grew up with to new favourites waiting to happen."/>
      <div className="category-grid">{categories.map(([name,copy,img],i) => <motion.a whileHover={{y:-8}} href="#products" className="category-card" key={name}><img src={img} alt=""/><div><span>0{i+1}</span><h3>{name}</h3><p>{copy}</p><b>Discover →</b></div></motion.a>)}</div>
    </section>

    <section className="products section" id="products"><SectionHeading eyebrow="THE SARA PANTRY" title="Made for everyday magic"/>
      <div className="product-grid">{featuredProducts.map(product => { const variant=product.variants[0]; if(!variant)return null; return <motion.article whileHover={{y:-7}} className="product-card" key={product.id}><button className="wish" aria-label={`Add ${product.name} to wish list`}><Heart size={17}/></button><a href={`/product/${product.slug}`} className="pack" style={{background:product.color}}>{product.image?<img className="pack-image" src={product.image} alt=""/>:<PublicLogo linked={false} imageClassName="product-logo"/>}<b>{product.name}</b><i>Just Like Paati Made It</i></a><div className="product-copy"><p>{product.category.name}</p><h3>{product.name}</h3><div><strong>₹{variant.price}</strong><span>{variant.weight}</span></div><a href={`/product/${product.slug}`} className="quick-add">View product <b>→</b></a></div></motion.article> })}</div>
      <div className="center"><SecondaryButton href="/shop">View all products</SecondaryButton></div>
    </section>

    <section className="promise"><div className="promise-intro"><p className="eyebrow">OUR PROMISE</p><h2>Nothing to hide.<br/>Everything to savour.</h2></div><div className="promise-grid">{[["01","Traditional recipes","Built on family know-how, not shortcuts."],["02","Freshly ground","For the fragrance that makes a kitchen feel like home."],["03","No preservatives","Only honest ingredients, handled with care."],["04","Authentic ingredients","Sourced for flavour, never just convenience."]].map(([num,title,copy]) => <div className="promise-card" key={title}><span>{num}</span><h3>{title}</h3><p>{copy}</p></div>)}</div></section>

    <section className="story section" id="our-story"><div className="story-photo"><img src="/images/references/whole-spices.jpg" alt="A colourful collection of whole Indian spices"/><span>EST. 2026<br/>MYSURU</span></div><div className="story-copy"><p className="eyebrow">FROM OUR KITCHEN</p><h2>Made with memories,<br/><em>shared with love.</em></h2><p>At Sara, every blend begins with a memory of home: the dry roast before dawn, the unmistakable scent of curry leaves, and Paati's instinct for the perfect pinch.</p><p>We honour those rituals in small batches, so every meal feels a little more like it was made for you.</p><a href="/about" className="text-link">Meet the family behind Sara <b>→</b></a></div></section>

    <section className="recipes section" id="recipes"><SectionHeading eyebrow="FROM THE SARA TABLE" title="Cook something memorable"/><div className="recipe-grid">{recipes.map(([name,time,img]) => <motion.article whileHover={{y:-6}} className="recipe-card" key={name}><img src={img} alt={name}/><div><span>RECIPE · {time}</span><h3>{name}</h3><a href="/recipes">View recipe <b>→</b></a></div></motion.article>)}</div><div className="center"><PrimaryButton href="/recipes">Cook with Sara</PrimaryButton></div></section>

    <section className="quote"><span>“</span><blockquote>It smells exactly like the powder my grandmother made - warm, fresh, and somehow full of love.</blockquote><div className="stars">★★★★★</div><p>MEERA R. · CHENNAI</p></section>

    <section className="instagram section"><SectionHeading eyebrow="FOLLOW ALONG" title="A little everyday deliciousness" body="@sara.masala_co · Share your Sara table with us"/><div className="insta-grid">{["/images/references/chettinad-curry.jpg","/images/references/sambar.jpg","/images/references/whole-spices.jpg","/images/references/chilli-dabba.jpg","/images/references/chettinad-curry.jpg"].map((src,i) => <a key={`${src}-${i}`} href="https://www.instagram.com/sara.masala_co/?hl=en" target="_blank" rel="noreferrer" className="insta"><img src={src} alt={`Sara Masala inspiration ${i+1}`}/><Instagram/></a>)}</div></section>

    <footer id="contact"><div className="footer-top"><div><PublicLogo className="official-logo" imageClassName="footer-logo-image"/><p>Small-batch spices<br/>with a whole lot of heart.</p></div><div><h4>EXPLORE</h4><a href="/shop">Shop all</a><a href="/recipes">Recipes</a><a href="/about">Our story</a></div><div><h4>KEEP IN TOUCH</h4><p>For masala stories, fresh recipes<br/>and a little kitchen magic.</p><div className="email"><input aria-label="Email address" placeholder="Your email address"/><button aria-label="Subscribe">→</button></div></div></div><div className="footer-bottom"><span>© 2026 SARA MASALA</span><span>MADE WITH ♥ IN MYSURU</span><a href="https://www.instagram.com/sara.masala_co/?hl=en" target="_blank" rel="noreferrer">@SARA.MASALA_CO</a></div></footer>
  </main>;
}
