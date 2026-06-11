"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function sendBroadcast(options: {
  title: string;
  body: string;
  type: string;
  target: "all" | "sellers" | "role" | "user";
  roleId?: string;
  userId?: string;
}) {
  const { title, body, type, target, roleId, userId } = options;

  let targetUserIds: string[] = [];

  if (target === "all") {
    const users = await prisma.users.findMany({
      where: { IsDeleted: false },
      select: { Id: true },
    });
    targetUserIds = users.map(u => u.Id);
  } else if (target === "sellers") {
    const sellers = await prisma.sellers.findMany({
      where: { IsDeleted: false },
      select: { UserId: true },
    });
    targetUserIds = sellers.map(s => s.UserId);
  } else if (target === "role" && roleId) {
    const users = await prisma.users.findMany({
      where: { RoleId: roleId, IsDeleted: false },
      select: { Id: true },
    });
    targetUserIds = users.map(u => u.Id);
  } else if (target === "user" && userId) {
    targetUserIds = [userId];
  }

  if (targetUserIds.length === 0) {
    return { success: false, message: "Nu s-a găsit niciun utilizator țintă." };
  }

  // Create notifications in chunks or createMany
  const notificationsData = targetUserIds.map(uid => ({
    Id: crypto.randomUUID(),
    UserId: uid,
    Type: type,
    Title: title,
    Body: body,
    IsRead: false,
    IsDeleted: false,
    CreatedAt: new Date(),
    CreatedBy: "Admin",
  }));

  // Prisma createMany is supported on PostgreSQL
  await prisma.notifications.createMany({
    data: notificationsData,
  });

  revalidatePath("/notifications");
  return { success: true, count: targetUserIds.length };
}

export async function getRecentBroadcasts() {
  // Fetch last 200 notifications to group them in memory
  const notifications = await prisma.notifications.findMany({
    where: { IsDeleted: false, CreatedBy: "Admin" },
    orderBy: { CreatedAt: "desc" },
    take: 200,
  });

  // Group by Title, Body, Type, and approximate CreatedAt (within same second)
  const broadcastsMap = new Map<string, {
    title: string;
    body: string;
    type: string;
    createdAt: Date;
    count: number;
  }>();

  notifications.forEach(n => {
    // Generate key based on title, body, and timestamp rounded to nearest minute
    const dateStr = new Date(n.CreatedAt).toISOString().substring(0, 16); // Round to minute
    const key = `${n.Title}-${n.Body}-${n.Type}-${dateStr}`;

    if (broadcastsMap.has(key)) {
      broadcastsMap.get(key)!.count += 1;
    } else {
      broadcastsMap.set(key, {
        title: n.Title || "",
        body: n.Body || "",
        type: n.Type || "info",
        createdAt: n.CreatedAt,
        count: 1,
      });
    }
  });

  return Array.from(broadcastsMap.values()).slice(0, 10);
}

export async function searchUsers(query: string) {
  if (!query || query.length < 2) return [];

  return prisma.users.findMany({
    where: {
      IsDeleted: false,
      OR: [
        { FirstName: { contains: query, mode: "insensitive" } },
        { LastName: { contains: query, mode: "insensitive" } },
        { FirebaseUid: { contains: query, mode: "insensitive" } },
      ],
    },
    select: {
      Id: true,
      FirstName: true,
      LastName: true,
      FirebaseUid: true,
    },
    take: 10,
  });
}
