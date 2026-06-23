import type { Prisma } from "@prisma/client";
import { Router } from "express";
import { prisma } from "../../config/db.js";
import { asyncHandler } from "../../shared/middleware/asyncHandler.js";
import { AppError } from "../../shared/errors/AppError.js";

export const shopRouter = Router();

const productCategories = ["FOOD", "DRINK", "FRUIT_VEGETABLE", "CONVENIENCE"] as const;
const shopSortModes = ["COMPREHENSIVE", "DISTANCE", "MIN_ORDER", "DELIVERY_FEE", "SPEED", "SALES"] as const;

function readQueryValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function containsKeyword(keyword: string) {
  return { contains: keyword, mode: "insensitive" as const };
}

function buildShopOrderBy(sortBy: (typeof shopSortModes)[number]): Prisma.ShopOrderByWithRelationInput[] {
  if (sortBy === "MIN_ORDER") {
    return [{ minOrderAmount: "asc" }, { createdAt: "desc" }];
  }
  if (sortBy === "DELIVERY_FEE") {
    return [{ deliveryFee: "asc" }, { createdAt: "desc" }];
  }
  if (sortBy === "SALES") {
    return [{ orders: { _count: "desc" } }, { createdAt: "desc" }];
  }

  return [{ createdAt: "desc" }];
}

shopRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rawCategory = readQueryValue(req.query.category);
    const rawSortBy = readQueryValue(req.query.sortBy);
    const keyword = readQueryValue(req.query.keyword);
    const category = rawCategory && productCategories.includes(rawCategory as (typeof productCategories)[number])
      ? (rawCategory as (typeof productCategories)[number])
      : undefined;
    const sortBy = rawSortBy && shopSortModes.includes(rawSortBy as (typeof shopSortModes)[number])
      ? (rawSortBy as (typeof shopSortModes)[number])
      : "COMPREHENSIVE";
    const productWhere: Prisma.ProductWhereInput = {
      isOnSale: true,
      ...(category ? { category } : {})
    };
    const productKeywordWhere: Prisma.ProductWhereInput = {
      ...productWhere,
      OR: [
        { name: containsKeyword(keyword) },
        { description: containsKeyword(keyword) }
      ]
    };
    const where: Prisma.ShopWhereInput = {
      status: "OPEN",
      ...(category
        ? {
            products: {
              some: productWhere
            }
          }
        : {}),
      ...(keyword
        ? {
            OR: [
              { name: containsKeyword(keyword) },
              { address: containsKeyword(keyword) },
              { announcement: containsKeyword(keyword) },
              { businessHours: containsKeyword(keyword) },
              {
                products: {
                  some: productKeywordWhere
                }
              }
            ]
          }
        : {})
    };

    const shops = await prisma.shop.findMany({
      where,
      orderBy: buildShopOrderBy(sortBy),
      select: {
        id: true,
        merchantId: true,
        name: true,
        logoUrl: true,
        coverUrl: true,
        announcement: true,
        address: true,
        phone: true,
        businessHours: true,
        deliveryFee: true,
        minOrderAmount: true,
        status: true,
        products: {
          where: productWhere,
          orderBy: { createdAt: "desc" },
          take: 4
        },
        _count: {
          select: { orders: true }
        }
      }
    });

    res.json({ data: shops });
  })
);

shopRouter.get(
  "/:shopId",
  asyncHandler(async (req, res) => {
    const shop = await prisma.shop.findUnique({
      where: { id: req.params.shopId },
      include: {
        products: {
          where: { isOnSale: true },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!shop) {
      throw new AppError(404, "商家不存在", "SHOP_NOT_FOUND");
    }

    res.json({ data: shop });
  })
);
