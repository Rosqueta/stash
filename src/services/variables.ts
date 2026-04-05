export type Segment =
  | { type: "text"; value: string }
  | { type: "var"; name: string };

export function extractVariables(content: string): string[] {
  const matches = content.matchAll(/\{\{(\w+)\}\}/g);
  return [...new Set([...matches].map((m) => m[1]))];
}

export function parseSegments(content: string): Segment[] {
  const parts = content.split(/(\{\{\w+\}\})/g);
  return parts.map((p) => {
    const match = p.match(/^\{\{(\w+)\}\}$/);
    return match
      ? { type: "var" as const, name: match[1] }
      : { type: "text" as const, value: p };
  });
}

export function resolveVariables(
  content: string,
  values: Record<string, string>
): string {
  return content.replace(
    /\{\{(\w+)\}\}/g,
    (_, key) => values[key as string] ?? `{{${key}}}`
  );
}
