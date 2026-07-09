
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5005";
const INTERNAL_TOKEN = process.env.KS_ADMIN_PASSWORD || "";

/** Helper — fetch with internal service token */
async function internalFetch(path: string, init?: RequestInit) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
      ...(init?.headers ?? {}),
    },
  });
}

export async function sendBroadcast(options: any) {
  try {
    const res = await internalFetch("/admin/notifications/broadcast", {
      method: "POST",
      body: JSON.stringify({
         Title: options.title,
         Body: options.body,
         Target: options.target || "all",
         Type: options.type || "system",
         RoleId: options.target === "role" ? options.roleId : undefined,
         UserId: options.target === "user" ? options.userId : undefined
      })
    });
    if (!res.ok) throw new Error("API failed: " + res.status);
    
    const data = await res.json().catch(() => ({}));
    revalidatePath("/notifications");
    
    if (data && data.success === false) {
      throw new Error(data.message || "Backend rejected broadcast");
    }
    
    return { success: true, count: data.recipientCount || data.count || 0 };
  } catch (err: any) {
    console.error("Broadcast failed", err);
    return { success: false, message: err.message };
  }
}

export async function getRecentBroadcasts() {
  try {
    const res = await internalFetch("/admin/notifications/broadcasts");
    if (!res.ok) throw new Error("API failed: " + res.status);
    const data = await res.json();
    const list = Array.isArray(data) ? data : (data.broadcasts ?? data.value ?? []);
    // Backend BroadcastHistoryDto → shape the client component expects.
    return list.map((b: any) => ({
      title: b.title ?? "",
      body: b.body ?? "",
      type: b.type ?? "system",
      target: b.target ?? "all",
      createdAt: b.createdAt,
      count: b.recipientCount ?? b.count ?? 0,
    }));
  } catch (err: any) {
    console.error("getRecentBroadcasts failed, returning []", err);
    return [];
  }
}

export async function searchUsers(query: string) {
  if (!query || query.trim().length < 2) return [];

  const q = query.trim();

  try {
    const users = await prisma.users.findMany({
      where: {
        IsDeleted: false,
        OR: [
          { FirstName: { contains: q, mode: "insensitive" } },
          { LastName:  { contains: q, mode: "insensitive" } },
          { FirebaseUid: { contains: q, mode: "insensitive" } },
        ],
      },
      select: {
        Id: true,
        FirstName: true,
        LastName: true,
        FirebaseUid: true,
      },
      take: 20,
      orderBy: { FirstName: "asc" },
    });

    return users;
  } catch (err: any) {
    console.error("searchUsers failed", err);
    return [];
  }
}
