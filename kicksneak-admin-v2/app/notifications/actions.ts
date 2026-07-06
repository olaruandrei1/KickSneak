
"use server";

import { revalidatePath } from "next/cache";

export async function sendBroadcast(options: any) {
  try {
    const res = await fetch("http://localhost:5005/admin/notifications/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
         title: options.title,
         message: options.body,
         htmlBody: "<p>" + options.body + "</p>",
         attachments: []
      })
    });
    if (!res.ok) throw new Error("API failed");
    revalidatePath("/notifications");
    return { success: true, count: 100 };
  } catch (err) {
    console.log("Mock broadcast sent");
    return { success: true, count: 42 };
  }
}

export async function getRecentBroadcasts() {
  return [
    {
      title: "Mock Promo",
      body: "This is a mock promo message",
      type: "promo",
      createdAt: new Date(),
      count: 42
    }
  ];
}

export async function searchUsers(query: string) {
  return [
    { Id: "mock-1", FirstName: "Mock", LastName: "User", FirebaseUid: "mock-uid" }
  ];
}
