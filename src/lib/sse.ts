export class SseContentParser {
  private buffer = "";

  push(chunk: string): string[] {
    this.buffer += chunk;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    return this.parseLines(lines);
  }

  flush(): string[] {
    const lines = this.buffer ? [this.buffer] : [];
    this.buffer = "";
    return this.parseLines(lines);
  }

  private parseLines(lines: string[]): string[] {
    const contents: string[] = [];
    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, "");
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const parsed = JSON.parse(payload);
        const content = parsed?.choices?.[0]?.delta?.content;
        if (typeof content === "string" && content) contents.push(content);
      } catch {
        // Um evento inválido é ignorado sem descartar o buffer seguinte.
      }
    }
    return contents;
  }
}
