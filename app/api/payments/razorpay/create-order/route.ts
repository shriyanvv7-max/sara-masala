import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createClient } from "../../../../../lib/supabase/server";
import { supabaseAdmin } from "../../../../../lib/supabase/admin";
import { checkoutSchema } from "../../../../../lib/validations";
import { calculateShipping, shippingConfig } from "../../../../../lib/commerce";
import { getRazorpay } from "../../../../../lib/razorpay";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed=checkoutSchema.safeParse(await request.json()); if(!parsed.success) return NextResponse.json({error:"Please check your checkout details."},{status:400});
  const auth=await createClient(); const {data:{user}}=await auth.auth.getUser(); const db=supabaseAdmin(); const ids=parsed.data.items.map(item=>item.variant_id);
  const {data:variants,error}=await db.from("product_variants").select("id,weight,price,stock,sku,active,products(id,name,slug)").in("id",ids); if(error||!variants||variants.length!==ids.length)return NextResponse.json({error:"One or more products are no longer available."},{status:409});
  let subtotal=0; const snapshots=[] as any[];
  for(const item of parsed.data.items){const variant:any=variants.find((entry:any)=>entry.id===item.variant_id); if(!variant?.active||variant.stock<item.quantity)return NextResponse.json({error:`${variant?.products?.name||"A product"} does not have enough stock.`},{status:409}); const unit=Number(variant.price); const line=unit*item.quantity; subtotal+=line; snapshots.push({variant_id:variant.id,product_id:variant.products.id,product_name:variant.products.name,weight:variant.weight,sku:variant.sku,quantity:item.quantity,price:unit,unit_price:unit,line_total:line});}
  const shipping=calculateShipping(subtotal); const total=subtotal+shipping; const orderNumber=`SM-${new Date().getFullYear()}-${randomUUID().slice(0,8).toUpperCase()}`;
  const {data:order,error:orderError}=await db.from("orders").insert({order_number:orderNumber,customer_id:user?.id||null,customer_name:parsed.data.customer.name,customer_email:parsed.data.customer.email,customer_phone:parsed.data.customer.phone,shipping_address:parsed.data.address,status:"pending",payment_status:"pending",payment_method:"razorpay",currency:shippingConfig.currency,subtotal,shipping,discount:0,total}).select("id,order_number,confirmation_token").single(); if(orderError||!order)return NextResponse.json({error:"Unable to prepare your order."},{status:500});
  const {error:itemError}=await db.from("order_items").insert(snapshots.map(item=>({...item,order_id:order.id}))); if(itemError){await db.from("orders").delete().eq("id",order.id);return NextResponse.json({error:"Unable to prepare order items."},{status:500});}
  try { const razorOrder=await getRazorpay().orders.create({amount:Math.round(total*100),currency:"INR",receipt:orderNumber,notes:{internal_order_id:order.id}}); await db.from("orders").update({razorpay_order_id:razorOrder.id}).eq("id",order.id); return NextResponse.json({internalOrderId:order.id,orderNumber,confirmationToken:order.confirmation_token,razorpayOrderId:razorOrder.id,amount:razorOrder.amount,currency:"INR",key:process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,customer:parsed.data.customer}); } catch(error) { await db.from("orders").update({payment_status:"failed"}).eq("id",order.id); console.error("Razorpay create order failed",error); return NextResponse.json({error:"Unable to start payment. Please try again."},{status:502}); }
}
