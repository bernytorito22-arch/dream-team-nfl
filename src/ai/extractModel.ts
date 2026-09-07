function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parseBalancedObjects(src: string): unknown[] {
  const out: unknown[] = [];
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== "{") continue;
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let j = i; j < src.length; j++) {
      const ch = src[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === "\\") esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') inStr = true;
      else if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          try {
            out.push(JSON.parse(src.slice(i, j + 1)));
          } catch {
            /* skip invalid slices */
          }
          i = j;
          break;
        }
      }
    }
  }
  return out;
}

export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const sources = fenced ? [fenced[1], text] : [text];
  for (const src of sources) {
    const objects = parseBalancedObjects(src);
    const withRecords = objects.filter((o) => isRecord(o) && Array.isArray(o.records));
    const pick = withRecords.at(-1) ?? objects.at(-1);
    if (pick !== undefined) return pick;
  }
  throw new Error(`no json in: ${text.slice(0, 200)}`);
}

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (isRecord(part) && typeof part.text === "string") return part.text;
        if (isRecord(part) && typeof part.content === "string") return part.content;
        return "";
      })
      .join("");
  }
  return "";
}

export function modelText(result: unknown): string {
  if (!isRecord(result)) return "";
  if (typeof result.response === "string" && result.response.trim()) {
    return result.response;
  }
  const choices = result.choices;
  if (Array.isArray(choices) && isRecord(choices[0])) {
    const message = choices[0].message;
    if (isRecord(message)) {
      const fromContent = contentToText(message.content);
      if (fromContent.trim()) return fromContent;
    }
  }
  if (typeof result.response === "string") return result.response;
  return "";
}
