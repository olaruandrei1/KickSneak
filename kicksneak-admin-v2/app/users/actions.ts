"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUsers(options: {
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
      { FirstName: { contains: search, mode: "insensitive" } },
      { LastName: { contains: search, mode: "insensitive" } },
      { FirebaseUid: { contains: search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.users.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { CreatedAt: "desc" },
      include: {
        roles: true,
        user_contacts: {
          where: { IsDeleted: false, IsPrincipal: true }
        }
      },
    }),
    prisma.users.count({ where }),
  ]);

  return { items, total };
}

export async function toggleUserSuspended(userId: string, isSuspended: boolean) {
  await prisma.users.update({
    where: { Id: userId },
    data: {
      IsSuspended: isSuspended,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function toggleUserBlocked(userId: string, isBlocked: boolean) {
  await prisma.users.update({
    where: { Id: userId },
    data: {
      IsBlocked: isBlocked,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function updateUserRole(userId: string, roleId: string) {
  await prisma.users.update({
    where: { Id: userId },
    data: {
      RoleId: roleId === "" ? null : roleId,
      ModifiedAt: new Date(),
      ModifiedBy: "Admin",
    },
  });

  revalidatePath("/users");
  return { success: true };
}

export async function getRoles() {
  return prisma.roles.findMany({
    where: { IsDeleted: false },
    orderBy: { Level: "asc" },
  });
}
