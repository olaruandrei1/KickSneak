"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { indexProduct, deleteProductFromIndex } from "@/lib/elasticsearch";
import crypto from "crypto";

export async function getProducts(options: {
  search?: string;
  brandId?: string;
  categoryId?: string;
  page: number;
  pageSize: number;
}) {
  const { search, brandId, categoryId, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {
    IsDeleted: false,
  };

  if (search) {
    where.OR = [
      { Title: { contains: search, mode: "insensitive" } },
      { ProductUniversalId: { contains: search, mode: "insensitive" } },
      { ShortDescription: { contains: search, mode: "insensitive" } },
    ];
  }

  if (brandId) {
    where.BrandId = brandId;
  }

  if (categoryId) {
    where.CategoryId = categoryId;
  }

  const [items, total] = await Promise.all([
    prisma.products.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        brands: { select: { Name: true } },
        categories: { select: { Name: true } },
        product_photos: {
          where: { IsDeleted: false },
          orderBy: { DisplayOrder: "asc" },
        },
        stock_items: {
          where: { IsDeleted: false },
        }
      },
    }),
    prisma.products.count({ where }),
  ]);

  return { items, total };
}

export async function saveProduct(data: {
  Id?: string;
  Title: string;
  BrandId?: string;
  CategoryId?: string;
  GenderId?: string;
  FitId?: string;
  ColorId?: string;
  MaterialId?: string;
  RetailPrice: number;
  ReleaseDate?: string;
  ProductUniversalId?: string;
  ShortDescription?: string;
  Description?: string;
  ImageUrls?: string[];
  PrimaryImageUrl?: string;
}) {
  const isEdit = !!data.Id;
  const productId = data.Id || crypto.randomUUID();

  const productData: any = {
    Title: data.Title,
    BrandId: data.BrandId || null,
    CategoryId: data.CategoryId || null,
    GenderId: data.GenderId || null,
    FitId: data.FitId || null,
    ColorId: data.ColorId || null,
    MaterialId: data.MaterialId || null,
    RetailPrice: data.RetailPrice,
    ReleaseDate: data.ReleaseDate ? new Date(data.ReleaseDate) : null,
    ProductUniversalId: data.ProductUniversalId || "",
    ShortDescription: data.ShortDescription || "",
    Description: data.Description || "",
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!isEdit) {
    productData.Id = productId;
    productData.CreatedAt = new Date();
    productData.CreatedBy = "Admin";
  }

  // Use a transaction to save product and photos
  await prisma.$transaction(async (tx) => {
    // 1. Save or Update Product
    if (isEdit) {
      await tx.products.update({
        where: { Id: productId },
        data: productData,
      });
    } else {
      await tx.products.create({
        data: productData,
      });
    }

    // 2. Handle Photos if provided
    if (data.ImageUrls) {
      // Mark existing photos as deleted if editing
      if (isEdit) {
        await tx.product_photos.updateMany({
          where: { ProductId: productId },
          data: { IsDeleted: true },
        });
      }

      // Add new photos
      for (let i = 0; i < data.ImageUrls.length; i++) {
        const url = data.ImageUrls[i];
        const isPrimary = url === data.PrimaryImageUrl || (i === 0 && !data.PrimaryImageUrl);
        
        await tx.product_photos.create({
          data: {
            Id: crypto.randomUUID(),
            ProductId: productId,
            PhotoUrl: url,
            IsPrimary: isPrimary,
            DisplayOrder: i,
            IsDeleted: false,
            CreatedAt: new Date(),
            CreatedBy: "Admin",
          },
        });
      }
    }
  });

  // Index product in Elasticsearch in background
  // (We do not await this, so it does not block user interaction)
  indexProduct(productId);

  revalidatePath("/products");
  revalidatePath("/");
  
  return { success: true, productId };
}

export async function softDeleteProduct(productId: string) {
  await prisma.products.update({
    where: { Id: productId },
    data: { 
      IsDeleted: true,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin"
    },
  });

  // Remove product from Elasticsearch in background
  deleteProductFromIndex(productId);

  revalidatePath("/products");
  revalidatePath("/");

  return { success: true };
}

export async function getAutocompleteOptions() {
  const [brands, categories, colors, materials, genders, fits] = await Promise.all([
    prisma.brands.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
    prisma.categories.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
    prisma.colors.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
    prisma.materials.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
    prisma.genders.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
    prisma.fits.findMany({ where: { IsDeleted: false }, select: { Id: true, Name: true }, orderBy: { Name: "asc" } }),
  ]);

  return { brands, categories, colors, materials, genders, fits };
}
