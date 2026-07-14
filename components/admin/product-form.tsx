"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { productSchema, variantSchema } from "../../lib/validations";

const schema = z.object({ product: productSchema, variants: z.array(variantSchema.extend({ id: z.string().optional() })).min(1) });
type Values = z.infer<typeof schema>;
type Category = { id: string; name: string };

export function ProductForm({ categories, initial }: { categories: Category[]; initial?: any }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [removingImage, setRemovingImage] = useState(false);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      product: {
        name: initial?.name || "", slug: initial?.slug || "", description: initial?.description || "", ingredients: initial?.ingredients || "",
        storage: initial?.storage || "Store airtight in a cool, dry place.", category_id: initial?.category_id || categories[0]?.id || "",
        image: initial?.image || null, featured: initial?.featured || false, best_seller: initial?.best_seller || false,
      },
      variants: initial?.product_variants?.map((variant: any) => ({ id: variant.id, weight: variant.weight, price: variant.price, stock: variant.stock, sku: variant.sku, active: variant.active })) || [{ weight: "125g", price: 90, stock: 20, sku: "", active: true }],
    },
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "variants" });
  const image = form.watch("product.image");

  async function upload(file: File) {
    const data = new FormData(); data.append("file", file);
    const response = await fetch("/api/uploads/product-image", { method: "POST", body: data });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error);
    form.setValue("product.image", json.url, { shouldDirty: true });
  }

  async function removeImage() {
    if (!image || !confirm("Remove this product image?")) return;
    setRemovingImage(true); setMessage("");
    try {
      const response = await fetch(
        initial?.id && image === initial.image
          ? `/api/products/${initial.id}/image`
          : `/api/uploads/product-image?url=${encodeURIComponent(image)}`,
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      form.setValue("product.image", null, { shouldDirty: true });
      setMessage(initial?.id && image === initial.image ? "Image removed." : "Image removed. Save changes to update this product.");
      router.refresh();
    } catch { setMessage("We could not remove this image. Please try again."); }
    finally { setRemovingImage(false); }
  }

  async function submit(values: Values) {
    setSaving(true); setMessage("");
    try {
      let id = initial?.id;
      if (!id) {
        const response = await fetch("/api/products", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
        const json = await response.json(); if (!response.ok) throw new Error(json.error); id = json.id;
      } else {
        const response = await fetch(`/api/products/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values.product) });
        if (!response.ok) throw new Error();
        for (const variant of values.variants) {
          const response = await fetch(variant.id ? `/api/product-variants/${variant.id}` : "/api/product-variants", { method: variant.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(variant.id ? variant : { product_id: id, variant }) });
          if (!response.ok) throw new Error();
        }
      }
      router.push("/admin/products"); router.refresh();
    } catch { setMessage("We could not save this product. Please review the details and try again."); }
    finally { setSaving(false); }
  }

  async function deleteVariant(id: string, index: number) { if (!confirm("Delete this variant?")) return; const response = await fetch(`/api/product-variants/${id}`, { method: "DELETE" }); if (response.ok) remove(index); else setMessage("Unable to delete this variant."); }
  async function deleteProduct() { if (!initial?.id || !confirm("Delete this product and all its variants?")) return; const response = await fetch(`/api/products/${initial.id}`, { method: "DELETE" }); if (response.ok) { router.push("/admin/products"); router.refresh(); } else setMessage("Unable to delete this product."); }

  return <form className="admin-form" onSubmit={form.handleSubmit(submit)}>
    <section><h2>Product details</h2>
      <input placeholder="Product name" {...form.register("product.name")}/><input placeholder="Slug" {...form.register("product.slug")}/>
      <select {...form.register("product.category_id")}>{categories.map(category => <option value={category.id} key={category.id}>{category.name}</option>)}</select>
      <textarea placeholder="Description" {...form.register("product.description")}/><textarea placeholder="Ingredients" {...form.register("product.ingredients")}/><textarea placeholder="Storage instructions" {...form.register("product.storage")}/>
      <label>Product image<input type="file" accept="image/*" onChange={event => event.target.files?.[0] && upload(event.target.files[0]).catch(() => setMessage("Image upload failed. Please try again."))}/></label>
      {image && <div className="admin-image-actions"><img className="admin-image" src={image} alt="Product preview"/><button type="button" className="admin-remove-image" onClick={removeImage} disabled={removingImage}>{removingImage ? "Removing..." : "Remove image"}</button></div>}
      <label><input type="checkbox" {...form.register("product.featured")}/> Featured product</label><label><input type="checkbox" {...form.register("product.best_seller")}/> Best seller</label>
    </section>
    <section><h2>Weight variants</h2>{fields.map((field, index) => <div className="variant-row" key={field.id}><input placeholder="Weight" {...form.register(`variants.${index}.weight`)}/><input type="number" placeholder="Price" {...form.register(`variants.${index}.price`)}/><input type="number" placeholder="Stock" {...form.register(`variants.${index}.stock`)}/><input placeholder="SKU" {...form.register(`variants.${index}.sku`)}/><button type="button" onClick={() => field.id && initial?.product_variants?.[index]?.id ? deleteVariant(initial.product_variants[index].id, index) : remove(index)}>Remove</button></div>)}<button type="button" className="secondary admin-add" onClick={() => append({ weight: "", price: 0, stock: 0, sku: "", active: true })}>Add variant</button></section>
    {message && <p role="alert">{message}</p>}<button className="add-cart" disabled={saving}>{saving ? "Saving..." : "Save changes"}</button>{initial && <button type="button" className="admin-delete" onClick={deleteProduct}>Delete product</button>}
  </form>;
}
