"use server";

import fs from "fs/promises";
import path from "path";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface SystemSettings {
  commissionPercent: number;
  buyerFeePercent: number;
  maintenanceMode: boolean;
  featuredBrands: string[]; // Brand UUIDs
  termsAndConditions: string;
}

const SETTINGS_FILE_PATH = path.join(process.cwd(), "settings.json");

const DEFAULT_SETTINGS: SystemSettings = {
  commissionPercent: 10,
  buyerFeePercent: 5,
  maintenanceMode: false,
  featuredBrands: [],
  termsAndConditions: `Termenii și Condițiile platformei KickSneak.
1. KickSneak este o piață online (marketplace) pentru sneakers, îmbrăcăminte și accesorii colecționabile.
2. Toate produsele vândute trebuie să treacă prin procesul nostru de verificare de către experți înainte de a fi livrate cumpărătorului.
3. Vânzătorii sunt responsabili de autenticitatea și conformitatea produselor livrate. Produsele false sau neconforme vor fi respinse, iar vânzătorului i se va percepe o taxă de penalizare și Trust Score-ul său va fi redus.
4. Plățile sunt procesate securizat, iar fondurile sunt eliberate către vânzător doar după confirmarea verificării pozitive.`,
};

// Load settings from settings.json
export async function getSystemSettings(): Promise<SystemSettings> {
  try {
    const fileExists = await fs.access(SETTINGS_FILE_PATH).then(() => true).catch(() => false);
    if (!fileExists) {
      // Create settings.json with default settings if it doesn't exist
      await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(DEFAULT_SETTINGS, null, 2), "utf-8");
      return DEFAULT_SETTINGS;
    }
    const data = await fs.readFile(SETTINGS_FILE_PATH, "utf-8");
    return JSON.parse(data) as SystemSettings;
  } catch (error) {
    console.error("Error loading system settings:", error);
    return DEFAULT_SETTINGS;
  }
}

// Save settings to settings.json
export async function saveSystemSettings(settings: SystemSettings) {
  try {
    // Validate inputs
    if (settings.commissionPercent < 0 || settings.commissionPercent > 100) {
      throw new Error("Comisionul vânzătorului trebuie să fie între 0% și 100%.");
    }
    if (settings.buyerFeePercent < 0 || settings.buyerFeePercent > 100) {
      throw new Error("Taxa cumpărătorului trebuie să fie între 0% și 100%.");
    }

    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2), "utf-8");
    revalidatePath("/settings");
    return { success: true, message: "Setările au fost salvate cu succes!" };
  } catch (error: any) {
    console.error("Error saving system settings:", error);
    return { success: false, error: error.message || "A apărut o eroare la salvarea setărilor." };
  }
}

// Fetch all active brands for the featured brands selection
export async function getBrands() {
  try {
    const brands = await prisma.brands.findMany({
      where: {
        IsDeleted: false,
      },
      orderBy: {
        Name: "asc",
      },
      select: {
        Id: true,
        Name: true,
      },
    });
    return brands;
  } catch (error) {
    console.error("Error fetching brands for settings:", error);
    return [];
  }
}
