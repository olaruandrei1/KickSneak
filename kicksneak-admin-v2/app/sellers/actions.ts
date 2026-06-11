"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSellers(options: {
  search?: string;
  page: number;
  pageSize: number;
}) {
  const { search, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {
    IsDeleted: false,
  };

  if (search) {
    where.OR = [
      { StoreName: { contains: search, mode: "insensitive" } },
      { City: { contains: search, mode: "insensitive" } },
      { CompanyName: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.sellers.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        users: {
          select: { FirstName: true, LastName: true, FirebaseUid: true },
        },
        _count: {
          select: {
            stock_items: { where: { IsDeleted: false } },
            used_items: { where: { IsDeleted: false } },
          }
        }
      },
    }),
    prisma.sellers.count({ where }),
  ]);

  return { items, total };
}

export async function updateTrustScore(sellerId: string, score: number) {
  await prisma.sellers.update({
    where: { Id: sellerId },
    data: {
      TrustScore: score,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/sellers");
  return { success: true };
}

export async function toggleSellerBlock(sellerId: string, isBlocked: boolean, reason?: string) {
  await prisma.sellers.update({
    where: { Id: sellerId },
    data: {
      IsBlocked: isBlocked,
      Reason: reason || null,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/sellers");
  return { success: true };
}

export async function toggleSellerSuspended(sellerId: string, isSuspended: boolean, reason?: string) {
  await prisma.sellers.update({
    where: { Id: sellerId },
    data: {
      IsSuspended: isSuspended,
      Reason: reason || null,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/sellers");
  return { success: true };
}
