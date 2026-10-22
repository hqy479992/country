import { ActorType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../config/db.js";
import { requireActor } from "../auth/auth.middleware.js";
import { AppError } from "../../shared/errors/AppError.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { lockUser, readCart, summarizeCart } from "./cart.service.js";

export const cartRouter = Router();
cartRouter.use(requireActor(ActorType.USER));
const addSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(99).default(1),
  replaceCart: z.boolean().default(false),
});
const quantitySchema = z.object({ quantity: z.number().int().min(1).max(99) });
cartRouter.get(
  "/",
  asyncHandler(async (req, res) =>
    res.json({ data: await readCart(prisma, req.actor!.id) }),
  ),
);
cartRouter.get(
  "/quote",
  asyncHandler(async (req, res) =>
    res.json({ data: summarizeCart(await readCart(prisma, req.actor!.id)) }),
  ),
);
cartRouter.post(
  "/items",
  asyncHandler(async (req, res) => {
    const input = addSchema.parse(req.body);
    const userId = req.actor!.id;
    const item = await prisma.$transaction(async (tx) => {
      await lockUser(tx, userId);
      const product = await tx.product.findUnique({
        where: { id: input.productId },
        include: { shop: true },
      });
      if (!product || !product.isOnSale)
        throw new AppError(404, "商品不存在或已下架", "PRODUCT_NOT_AVAILABLE");
      if (product.shop.status !== "OPEN")
        throw new AppError(409, "商家当前休息中", "SHOP_CLOSED");
      const items = await readCart(tx, userId);
      const conflict = items.some(
        (current) => current.shopId !== product.shopId,
      );
      if (conflict && !input.replaceCart)
        throw new AppError(
          409,
          "购物车已有其他商家的商品，是否清空后换店？",
          "CART_SHOP_CONFLICT",
        );
      const existing = !conflict
        ? items.find((current) => current.productId === product.id)
        : undefined;
      const quantity = (existing?.quantity || 0) + input.quantity;
      if (quantity > product.stock || quantity > 99)
        throw new AppError(
          409,
          "商品库存不足或已达限购数量",
          "STOCK_NOT_ENOUGH",
        );
      if (conflict) await tx.cartItem.deleteMany({ where: { userId } });
      return existing
        ? tx.cartItem.update({ where: { id: existing.id }, data: { quantity } })
        : tx.cartItem.create({
            data: {
              userId,
              shopId: product.shopId,
              productId: product.id,
              quantity,
            },
          });
    });
    res.status(201).json({ data: item });
  }),
);
const updateQuantity = asyncHandler(async (req, res) => {
  const input = quantitySchema.parse(req.body);
  const userId = req.actor!.id;
  const item = await prisma.$transaction(async (tx) => {
    await lockUser(tx, userId);
    const current = await tx.cartItem.findFirst({
      where: { id: req.params.itemId, userId },
      include: { product: true, shop: true },
    });
    if (!current)
      throw new AppError(404, "购物车商品不存在", "CART_ITEM_NOT_FOUND");
    // Allow reducing invalid cart quantities so a sold-out item can be removed.
    if (
      input.quantity > current.quantity &&
      (!current.product.isOnSale ||
        current.product.stock < input.quantity ||
        current.shop.status !== "OPEN")
    )
      throw new AppError(
        409,
        "商品库存不足、已下架或商家休息中",
        "PRODUCT_NOT_AVAILABLE",
      );
    return tx.cartItem.update({
      where: { id: current.id },
      data: { quantity: input.quantity },
    });
  });
  res.json({ data: item });
});
cartRouter.patch("/items/:itemId", updateQuantity);
cartRouter.post("/items/:itemId/quantity", updateQuantity);
cartRouter.delete(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      await lockUser(tx, req.actor!.id);
      await tx.cartItem.deleteMany({
        where: { id: req.params.itemId, userId: req.actor!.id },
      });
    });
    res.status(204).send();
  }),
);
cartRouter.delete(
  "/",
  asyncHandler(async (req, res) => {
    await prisma.$transaction(async (tx) => {
      await lockUser(tx, req.actor!.id);
      await tx.cartItem.deleteMany({ where: { userId: req.actor!.id } });
    });
    res.status(204).send();
  }),
);
