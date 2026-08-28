/**
 * Collects diagnostics and applies the configured severity for each rule.
 *
 * Rules call `report` with a rule id, a place, and a message. They never decide
 * how loud a problem is, and never touch line and column arithmetic.
 */
export class DiagnosticBag {
  #entries = [];
  #levels;
  #file;

  /**
   * @param {Record<string, string>} levels rule id -> "error" | "warning" | "info" | "off"
   * @param {string} [file]
   */
  constructor(levels, file) {
    this.#levels = levels;
    this.#file = file;
  }

  /**
   * @param {{rule: string, at: Place, message: string, hint?: string}} problem
   */
  report({ rule, at, message, hint }) {
    const severity = this.#levels[rule] ?? "error";
    if (severity === "off") return;

    this.#entries.push({
      severity,
      rule,
      file: this.#file,
      line: at.line,
      col: at.col,
      end: at.end,
      message,
      ...(hint ? { hint } : {}),
    });
  }

  /** Sorted by position, which is the order a reader wants to fix them in. */
  toArray() {
    return [...this.#entries].sort((a, b) => a.line - b.line || a.col - b.col);
  }

  get length() {
    return this.#entries.length;
  }
}

/** The command word of a statement. */
export function atCommand(statement) {
  return { line: statement.line, col: statement.col, end: statement.col + statement.name.length };
}

/** A specific argument token. */
export function atToken(statement, token) {
  return { line: statement.line, col: token.col, end: token.end };
}

/** The whole file, for problems that belong to no particular line. */
export const atFileStart = { line: 1, col: 0, end: 0 };

/**
 * @typedef {{line: number, col: number, end?: number}} Place
 * @typedef {{severity: string, rule: string, file?: string, line: number, col: number, end?: number, message: string, hint?: string}} Diagnostic
 */
