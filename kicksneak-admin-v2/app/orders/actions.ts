"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getOrders(options: {
  statusFilter?: number; // 0=Pending, 1=Confirmed, 2=Shipped, 3=Delivered, 4=Cancelled, 5=Returned
  page: number;
  pageSize: number;
}) {
  const { statusFilter, page, pageSize } = options;
  const skip = (page - 1) * pageSize;

  const where: any = {
    IsDeleted: false,
  };

  if (statusFilter !== undefined) {
    where.Status = statusFilter;
  }

  const [items, total] = await Promise.all([
    prisma.orders.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        users: {
          select: { Id: true, FirstName: true, LastName: true, FirebaseUid: true },
        },
        stock_items: {
          include: {
            products: {
              select: { Title: true, BrandId: true, brands: { select: { Name: true } } },
            },
            sizes: { select: { SizeLabel: true } },
          },
        },
        used_items: {
          include: {
            products: {
              select: { Title: true, BrandId: true, brands: { select: { Name: true } } },
            },
            sizes: { select: { SizeLabel: true } },
          },
        },
        user_addresses_orders_BuyerAddressIdTouser_addresses: true,
      },
    }),
    prisma.orders.count({ where }),
  ]);

  return { items, total };
}

export async function updateOrderStatus(orderId: string, status: number) {
  const order = await prisma.orders.update({
    where: { Id: orderId },
    data: {
      Status: status,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
    include: {
      users: true,
    },
  });

  // Send notification to buyer
  let statusText = "";
  if (status === 1) statusText = "Confirmată";
  else if (status === 2) statusText = "Expediată";
  else if (status === 3) statusText = "Livrată";
  else if (status === 4) statusText = "Anulată";
  else if (status === 5) statusText = "Returnată";

  await prisma.notifications.create({
    data: {
      Id: crypto.randomUUID(),
      UserId: order.BuyerId,
      Type: status === 4 ? "danger" : "info",
      Title: `Comanda ta a fost ${statusText.toLowerCase()}`,
      Body: `Comanda ta cu ID-ul ${orderId.substring(0, 8)} este acum în starea: ${statusText}.`,
      IsRead: false,
      IsDeleted: false,
      CreatedAt: new Date(),
      CreatedBy: "Admin",
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

export async function updateTrackingNumber(orderId: string, trackingNumber: string) {
  // If we set tracking, we automatically advance status to Shipped (2)
  await prisma.orders.update({
    where: { Id: orderId },
    data: {
      TrackingNumber: trackingNumber,
      Status: 2, // Shipped
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}

export async function refundOrder(orderId: string) {
  // Refund process mock: cancel order (4) and print log
  await prisma.orders.update({
    where: { Id: orderId },
    data: {
      Status: 4, // Cancelled/Refunded
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  console.log(`[REFUND FLOW] Refund initiated successfully via Stripe mock for order: ${orderId}`);

  revalidatePath("/orders");
  revalidatePath("/");
  return { success: true };
}
