/**
 * Output formats. Each takes the same diagnostic array, so adding one is adding
 * a function.
 */

const ANSI = {
  error: "\x1b[31m",
  warning: "\x1b[33m",
  info: "\x1b[36m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  reset: "\x1b[0m",
};

const painter = (enabled) => (style, text) => (enabled ? ANSI[style] + text + ANSI.reset : text);

/**
 * For a human at a terminal: grouped by file, with the offending span underlined.
 *
 * @param {Diagnostic[]} diagnostics
 * @param {Map<string, string[]>} sources file path -> lines, for the excerpt
 * @param {{colour?: boolean}} [options]
 */
export function pretty(diagnostics, sources, options = {}) {
  const paint = painter(options.colour ?? false);
  if (diagnostics.length === 0) return paint("dim", "no problems found");

  const out = [];
  let currentFile;

  for (const problem of diagnostics) {
    if (problem.file !== currentFile) {
      currentFile = problem.file;
      out.push("", paint("bold", currentFile ?? "<source>"));
    }

    const place = `${String(problem.line).padStart(5)}:${String(problem.col + 1).padEnd(3)}`;
    out.push(`${paint("dim", place)} ${paint(problem.severity, problem.severity.padEnd(7))} ${problem.message}  ${paint("dim", problem.rule)}`);
    out.push(...excerpt(problem, sources, paint));
    if (problem.hint) out.push(`      ${paint("dim", "└ " + problem.hint)}`);
  }

  out.push("", summary(diagnostics, paint));
  return out.join("\n");
}

function excerpt(problem, sources, paint) {
  const line = sources?.get(problem.file)?.[problem.line - 1];
  if (line === undefined) return [];

  const end = Math.max(problem.end ?? problem.col + 1, problem.col + 1);
  return [
    `      ${paint("dim", "│")} ${line.replace(/\t/g, " ")}`,
    `      ${paint("dim", "│")} ${" ".repeat(problem.col)}${paint(problem.severity, "~".repeat(end - problem.col))}`,
  ];
}

function summary(diagnostics, paint) {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  const warnings = diagnostics.filter((d) => d.severity === "warning").length;
  return `${paint(errors ? "error" : "dim", `${errors} error(s)`)}, ${paint(warnings ? "warning" : "dim", `${warnings} warning(s)`)}`;
}

/** One problem per line, greppable. */
export function compact(diagnostics) {
  return diagnostics
    .map((d) => `${d.file ?? "<source>"}:${d.line}:${d.col + 1}: ${d.severity} [${d.rule}] ${d.message}`)
    .join("\n");
}

/**
 * GitHub Actions workflow commands. Printed inside a workflow, these turn into
 * annotations on the pull request diff.
 */
export function github(diagnostics) {
  const level = { warning: "warning", info: "notice" };

  return diagnostics
    .map((d) => {
      const message = d.hint ? `${d.message} (${d.hint})` : d.message;
      return `::${level[d.severity] ?? "error"} file=${d.file ?? ""},line=${d.line},col=${d.col + 1},title=${d.rule}::${message}`;
    })
    .join("\n");
}

export function json(diagnostics) {
  return JSON.stringify(diagnostics, null, 2);
}

export const reporters = { pretty, compact, github, json };

/** @typedef {import("./diagnostics.js").Diagnostic} Diagnostic */
