"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

export async function getCatalogData() {
  const [brands, categories, colors, materials, sizes, sizeTypes, fits, genders] = await Promise.all([
    prisma.brands.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.categories.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.colors.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.materials.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.sizes.findMany({ where: { IsDeleted: false }, include: { size_types: true }, orderBy: { SizeEu: "asc" } }),
    prisma.size_types.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.fits.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
    prisma.genders.findMany({ where: { IsDeleted: false }, orderBy: { Name: "asc" } }),
  ]);

  return { brands, categories, colors, materials, sizes, sizeTypes, fits, genders };
}

// 1. Brands
export async function saveBrand(id?: string, name?: string, parentId?: string) {
  const brandId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Brand",
    ParentId: parentId || null,
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = brandId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.brands.create({ data });
  } else {
    await prisma.brands.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteBrand(id: string) {
  await prisma.brands.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 2. Categories
export async function saveCategory(id?: string, name?: string, parentId?: string) {
  const catId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Category",
    ParentId: parentId || null,
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = catId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.categories.create({ data });
  } else {
    await prisma.categories.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteCategory(id: string) {
  await prisma.categories.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 3. Colors
export async function saveColor(id?: string, name?: string) {
  const colorId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Color",
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = colorId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.colors.create({ data });
  } else {
    await prisma.colors.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteColor(id: string) {
  await prisma.colors.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 4. Materials
export async function saveMaterial(id?: string, name?: string) {
  const matId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Material",
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = matId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.materials.create({ data });
  } else {
    await prisma.materials.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteMaterial(id: string) {
  await prisma.materials.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 5. Fits
export async function saveFit(id?: string, name?: string) {
  const fitId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Fit",
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = fitId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.fits.create({ data });
  } else {
    await prisma.fits.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteFit(id: string) {
  await prisma.fits.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 6. Genders
export async function saveGender(id?: string, name?: string) {
  const genderId = id || crypto.randomUUID();
  const data: any = {
    Name: name || "New Gender",
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!id) {
    data.Id = genderId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.genders.create({ data });
  } else {
    await prisma.genders.update({ where: { Id: id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteGender(id: string) {
  await prisma.genders.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}

// 7. Sizes
export async function saveSize(options: {
  id?: string;
  sizeTypeId: string;
  label?: string;
  us?: string;
  eu?: string;
  uk?: string;
  cm?: number;
}) {
  const sizeId = options.id || crypto.randomUUID();
  const data: any = {
    SizeTypeId: options.sizeTypeId,
    SizeLabel: options.label || "",
    SizeUs: options.us || null,
    SizeEu: options.eu || null,
    SizeUk: options.uk || null,
    SizeCm: (options.cm !== undefined && options.cm !== null && (options.cm as any) !== "") ? Number(options.cm) : null,
    IsDeleted: false,
    ModifiedAt: new Date(),
    ModifiedBy: "Admin",
  };

  if (!options.id) {
    data.Id = sizeId;
    data.CreatedAt = new Date();
    data.CreatedBy = "Admin";
    await prisma.sizes.create({ data });
  } else {
    await prisma.sizes.update({ where: { Id: options.id }, data });
  }
  revalidatePath("/catalog");
  return { success: true };
}

export async function deleteSize(id: string) {
  await prisma.sizes.update({
    where: { Id: id },
    data: { IsDeleted: true, ModifiedAt: new Date(), ModifiedBy: "Admin" },
  });
  revalidatePath("/catalog");
  return { success: true };
}
