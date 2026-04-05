const TAG_RULES: Record<string, string[]> = {
  código: [
    "función",
    "código",
    "debug",
    "react",
    "typescript",
    "python",
    "refactor",
    "test",
    "script",
  ],
  redacción: [
    "email",
    "redacta",
    "escribe",
    "artículo",
    "post",
    "newsletter",
    "copy",
    "texto",
  ],
  diseño: [
    "componente",
    "ui",
    "ux",
    "figma",
    "diseño",
    "layout",
    "color",
    "interfaz",
  ],
  análisis: [
    "analiza",
    "resume",
    "extrae",
    "informe",
    "datos",
    "métricas",
    "report",
  ],
  reunión: [
    "transcripción",
    "reunión",
    "meeting",
    "agenda",
    "acta",
    "summary",
  ],
};

export function suggestTags(content: string): string[] {
  const lower = content.toLowerCase();
  const suggested: string[] = [];

  for (const [tag, keywords] of Object.entries(TAG_RULES)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      suggested.push(tag);
    }
  }

  return suggested;
}
