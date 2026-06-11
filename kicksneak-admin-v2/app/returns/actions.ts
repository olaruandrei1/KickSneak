"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getReturns(options: {
  page: number;
  pageSize: number;
}) {
  const { page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where = { IsDeleted: false };

  const [items, total] = await Promise.all([
    prisma.returns.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        users: { select: { FirstName: true, LastName: true } },
        orders: {
          include: {
            stock_items: {
              include: {
                products: { select: { Title: true } },
              },
            },
            used_items: {
              include: {
                products: { select: { Title: true } },
              },
            },
          },
        },
      },
    }),
    prisma.returns.count({ where }),
  ]);

  return { items, total };
}

export async function processReturn(returnId: string, status: number, rejectReason?: string) {
  // 1. Update Return Status (1=Approved, 2=Rejected)
  const ret = await prisma.returns.update({
    where: { Id: returnId },
    data: {
      Status: status,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
    include: {
      orders: true,
    },
  });

  // 2. If approved, update order status to Returned (5)
  if (status === 1) {
    await prisma.orders.update({
      where: { Id: ret.OrderId },
      data: {
        Status: 5, // Returned
        ModifiedAt: new Date(),
        ModifiedBy: "Admin",
      },
    });
  }

  // 3. Send Notification to Buyer
  const buyerId = ret.UserId;
  let title = "";
  let body = "";
  if (status === 1) {
    title = "Cerere retur aprobată";
    body = `Cererea ta de retur pentru comanda #${ret.OrderId.substring(0, 8)} a fost aprobată. Fondurile vor fi rambursate în curând.`;
  } else {
    title = "Cerere retur respinsă";
    body = `Cererea ta de retur pentru comanda #${ret.OrderId.substring(0, 8)} a fost respinsă. Motiv: ${rejectReason || "Neîndeplinirea condițiilor de retur."}`;
  }

  await prisma.notifications.create({
    data: {
      Id: crypto.randomUUID(),
      UserId: buyerId,
      Type: status === 1 ? "info" : "warning",
      Title: title,
      Body: body,
      IsRead: false,
      IsDeleted: false,
      CreatedAt: new Date(),
      CreatedBy: "Admin",
    },
  });

  revalidatePath("/returns");
  revalidatePath("/orders");
  return { success: true };
}
