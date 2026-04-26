import type { Lang } from "../types/template";

export function detectInitialLanguage(navLang: string = navigator.language): Lang {
  const code = (navLang || "en").split("-")[0].toLowerCase();
  return code === "es" ? "es" : "en";
}
