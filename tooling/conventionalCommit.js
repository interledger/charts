const headerRegex = /^([a-z]+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/i;

/**
 * Analyse a conventional commit message.
 * @param {string} message
 * @returns {{ scope: string | null, type: string, isBreaking: boolean }}
 */
export function analyse(message) {
  if (typeof message !== "string") {
    throw new Error("Invalid conventional commit message");
  }

  const lines = message.split(/\r?\n/);
  const header = (lines[0] || "").trim();
  const m = headerRegex.exec(header);

  if (!m) {
    throw new Error("Invalid conventional commit message");
  }

  const type = m[1];
  const scope = m[2] || null;
  const bang = !!m[3];

  const body = lines.slice(1).join("\n");
  const breakingInBody = /BREAKING CHANGE:/i.test(body);

  const isBreaking = bang || breakingInBody;

  return { scope, type, isBreaking };
}

