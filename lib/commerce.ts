export const shippingConfig = { flatFee: 60, freeShippingThreshold: 799, currency: "INR" } as const;
export const calculateShipping = (subtotal: number) => subtotal >= shippingConfig.freeShippingThreshold ? 0 : shippingConfig.flatFee;
