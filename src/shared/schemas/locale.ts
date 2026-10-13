import { z } from "zod";

import { locales } from "@/shared/i18n/locale";

export const localeSchema = z.object({ locale: z.enum(locales) });
