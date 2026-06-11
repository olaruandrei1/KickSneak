"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getReviews(options: {
  page: number;
  pageSize: number;
}) {
  const { page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where = { IsDeleted: false };

  const [items, total] = await Promise.all([
    prisma.reviews.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        users: { select: { FirstName: true, LastName: true } },
        sellers: { select: { StoreName: true } },
      },
    }),
    prisma.reviews.count({ where }),
  ]);

  return { items, total };
}

export async function deleteReview(reviewId: string) {
  await prisma.reviews.update({
    where: { Id: reviewId },
    data: {
      IsDeleted: true,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/reviews");
  return { success: true };
}
