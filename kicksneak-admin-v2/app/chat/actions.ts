"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getChatSessions() {
  const sessions = await prisma.chat_sessions.findMany({
    where: {
      status: { not: "closed" },
    },
    orderBy: { created_at: "desc" },
  });

  if (sessions.length === 0) return [];

  // Load user info for these sessions (user_id is FirebaseUid)
  const userUids = sessions.map(s => s.user_id);
  const users = await prisma.users.findMany({
    where: {
      FirebaseUid: { in: userUids },
      IsDeleted: false,
    },
    select: {
      FirebaseUid: true,
      FirstName: true,
      LastName: true,
      ProfilePhoto: true,
    },
  });

  const userMap = new Map(users.map(u => [u.FirebaseUid, u]));

  // Load last message for each session to show in the sidebar
  const sessionIds = sessions.map(s => s.id);
  const messages = await prisma.chat_messages.findMany({
    where: {
      session_id: { in: sessionIds },
    },
    orderBy: { created_at: "desc" },
  });

  const lastMessageMap = new Map<string, any>();
  messages.forEach(m => {
    if (!lastMessageMap.has(m.session_id)) {
      lastMessageMap.set(m.session_id, m);
    }
  });

  return sessions.map(s => {
    const user = userMap.get(s.user_id);
    const lastMsg = lastMessageMap.get(s.id);
    return {
      id: s.id,
      user_id: s.user_id,
      title: s.title,
      status: s.status,
      created_at: s.created_at,
      closed_at: s.closed_at,
      chat_type: s.chat_type,
      user: user ? {
        name: `${user.FirstName || ""} ${user.LastName || ""}`.trim() || "Utilizator",
        avatar: user.ProfilePhoto || "",
      } : { name: "Utilizator", avatar: "" },
      lastMessage: lastMsg ? {
        content: lastMsg.content,
        role: lastMsg.role,
        created_at: lastMsg.created_at,
      } : null,
    };
  });
}

export async function getSessionMessages(sessionId: string) {
  return prisma.chat_messages.findMany({
    where: { session_id: sessionId },
    orderBy: { created_at: "asc" },
  });
}

export async function sendAdminMessage(sessionId: string, content: string) {
  const newMsg = await prisma.chat_messages.create({
    data: {
      id: crypto.randomUUID(),
      session_id: sessionId,
      role: "admin",
      content: content,
      created_at: new Date(),
    },
  });

  revalidatePath("/chat");
  return newMsg;
}

export async function takeOverSession(sessionId: string) {
  // Changes status to 'agent' so Ollama stops responding (it checks for status != 'active')
  await prisma.chat_sessions.update({
    where: { id: sessionId },
    data: { status: "agent" },
  });

  revalidatePath("/chat");
  return { success: true };
}

export async function closeSession(sessionId: string) {
  await prisma.chat_sessions.update({
    where: { id: sessionId },
    data: {
      status: "closed",
      closed_at: new Date(),
    },
  });

  revalidatePath("/chat");
  return { success: true };
}
