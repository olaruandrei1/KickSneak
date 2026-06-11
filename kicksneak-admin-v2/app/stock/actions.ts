"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getVerificationList(options: {
  type: "stock" | "used";
  statusFilter?: number; // 0 = Pending, 1 = Verified, 3 = Rejected
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { type, statusFilter, search, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {
    IsDeleted: false,
  };

  if (statusFilter !== undefined) {
    where.StatusItem = statusFilter;
  }

  // Handle search filter (cross-relation search)
  if (search) {
    where.OR = [
      {
        products: {
          Title: { contains: search, mode: "insensitive" },
        },
      },
      {
        sellers: {
          StoreName: { contains: search, mode: "insensitive" },
        },
      },
    ];
  }

  if (type === "stock") {
    const [items, total] = await Promise.all([
      prisma.stock_items.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { CreatedAt: "desc" },
        include: {
          products: {
            include: {
              brands: { select: { Name: true } },
              product_photos: {
                where: { IsDeleted: false, IsPrimary: true },
              },
            },
          },
          sellers: {
            include: {
              users: { select: { FirstName: true, LastName: true } },
            },
          },
          sizes: true,
        },
      }),
      prisma.stock_items.count({ where }),
    ]);
    return { items, total };
  } else {
    const [items, total] = await Promise.all([
      prisma.used_items.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { CreatedAt: "desc" },
        include: {
          products: {
            include: {
              brands: { select: { Name: true } },
            },
          },
          used_item_photos: {
            where: { IsDeleted: false, IsPrimary: true },
          },
          sellers: {
            include: {
              users: { select: { FirstName: true, LastName: true } },
            },
          },
          sizes: true,
        },
      }),
      prisma.used_items.count({ where }),
    ]);
    return { items, total };
  }
}

// 1. Approve Stock Item (New Sneaker)
export async function approveStockItem(stockItemId: string) {
  // Update stock item status to Active (1)
  await prisma.stock_items.update({
    where: { Id: stockItemId },
    data: {
      StatusItem: 1, // Active
      RefuseReason: null,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  // Send Notification to Seller
  const stockItem = await prisma.stock_items.findUnique({
    where: { Id: stockItemId },
    include: {
      sellers: true,
      products: true,
    },
  });

  if (stockItem?.sellers?.UserId) {
    await prisma.notifications.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: stockItem.sellers.UserId,
        Type: "info",
        Title: "Produs aprobat pentru listare",
        Body: `Produsul tău nou "${stockItem.products.Title}" (Mărime: ${stockItem.Id.substring(0, 5)}) la prețul de ${stockItem.Price} RON a fost verificat fizic și este acum ACTIV pe platformă!`,
        IsRead: false,
        IsDeleted: false,
        CreatedAt: new Date(),
        CreatedBy: "Admin",
      },
    });
  }

  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}

// 2. Reject Stock Item (New Sneaker)
export async function rejectStockItem(stockItemId: string, refuseReason: string) {
  // Update stock item status to Refused (3) and set reason
  await prisma.stock_items.update({
    where: { Id: stockItemId },
    data: {
      StatusItem: 3, // Refused
      RefuseReason: refuseReason,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  // Send Notification to Seller with reason
  const stockItem = await prisma.stock_items.findUnique({
    where: { Id: stockItemId },
    include: {
      sellers: true,
      products: true,
    },
  });

  if (stockItem?.sellers?.UserId) {
    await prisma.notifications.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: stockItem.sellers.UserId,
        Type: "warning",
        Title: "Produs respins la verificare",
        Body: `Produsul tău nou "${stockItem.products.Title}" la prețul de ${stockItem.Price} RON a fost respins. Motiv: ${refuseReason}`,
        IsRead: false,
        IsDeleted: false,
        CreatedAt: new Date(),
        CreatedBy: "Admin",
      },
    });
  }

  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}

// 3. Approve Used Item (Used Sneaker)
export async function approveUsedItem(usedItemId: string) {
  // Update used item status to Active (1)
  await prisma.used_items.update({
    where: { Id: usedItemId },
    data: {
      StatusItem: 1, // Active
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  // Send Notification to Seller
  const usedItem = await prisma.used_items.findUnique({
    where: { Id: usedItemId },
    include: {
      sellers: true,
      products: true,
    },
  });

  if (usedItem?.sellers?.UserId) {
    await prisma.notifications.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: usedItem.sellers.UserId,
        Type: "info",
        Title: "Produs purtat aprobat pentru listare",
        Body: `Produsul tău purtat "${usedItem.products.Title}" (Condiție: ${usedItem.Condition}/10) la prețul de ${usedItem.Price} RON a fost aprobat și este acum ACTIV pe platformă!`,
        IsRead: false,
        IsDeleted: false,
        CreatedAt: new Date(),
        CreatedBy: "Admin",
      },
    });
  }

  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}

// 4. Reject Used Item (Used Sneaker)
export async function rejectUsedItem(usedItemId: string, refuseReason: string) {
  // Update used item status to Refused (3)
  await prisma.used_items.update({
    where: { Id: usedItemId },
    data: {
      StatusItem: 3, // Refused
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  // Send Notification to Seller with reason (since used_items has no RefuseReason column)
  const usedItem = await prisma.used_items.findUnique({
    where: { Id: usedItemId },
    include: {
      sellers: true,
      products: true,
    },
  });

  if (usedItem?.sellers?.UserId) {
    await prisma.notifications.create({
      data: {
        Id: crypto.randomUUID(),
        UserId: usedItem.sellers.UserId,
        Type: "warning",
        Title: "Produs purtat respins la verificare",
        Body: `Produsul tău purtat "${usedItem.products.Title}" la prețul de ${usedItem.Price} RON a fost respins la verificare. Motiv: ${refuseReason}`,
        IsRead: false,
        IsDeleted: false,
        CreatedAt: new Date(),
        CreatedBy: "Admin",
      },
    });
  }

  revalidatePath("/stock");
  revalidatePath("/");
  return { success: true };
}
