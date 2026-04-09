const TAG_RULES: Record<string, string[]> = {
  code: [
    "function",
    "code",
    "debug",
    "react",
    "typescript",
    "python",
    "refactor",
    "test",
    "script",
  ],
  writing: [
    "write",
    "email",
    "article",
    "post",
    "newsletter",
    "copy",
    "content",
    "texto",
  ],
  design: [
    "component",
    "ui",
    "ux",
    "figma",
    "design",
    "layout",
    "color",
    "interface",
  ],
  analysis: [
    "analyze",
    "summarize",
    "extract",
    "report",
    "data",
    "metrics",
  ],
  meeting: [
    "transcription",
    "meeting",
    "agenda",
    "minutes",
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
