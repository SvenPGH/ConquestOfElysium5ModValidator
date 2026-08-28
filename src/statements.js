import { tokenizeLine } from "./tokenizer.js";
import { OPENERS, CLOSERS, opensSection } from "./sections.js";

/**
 * Reads a source file into a list of statements, each carrying the section that
 * was active when it ran.
 *
 * Lexical problems found on the way out are returned alongside rather than
 * reported here, so this module stays a parser and nothing else.
 *
 * @param {string} source
 * @returns {{statements: Statement[], problems: Problem[]}}
 */
export function readStatements(source) {
  const statements = [];
  const problems = [];

  let section = null;
  let openEvent = null;

  source.split(/\r?\n/).forEach((text, index) => {
    const line = index + 1;
    const { tokens, comment, problems: lexical } = tokenizeLine(text);

    for (const problem of lexical) problems.push({ ...problem, line });

    const unterminated = tokens.find((token) => token.type === "unterminated");
    if (unterminated) {
      problems.push({
        rule: "unterminated-string",
        line,
        col: unterminated.col,
        end: unterminated.end,
        message: "string is never closed on this line",
        hint: "strings may not span lines, use ^ for a paragraph break inside descriptions",
      });
    }

    if (tokens.length === 0) return; // blank, or comment only

    const head = tokens[0];
    if (head.type !== "word") {
      problems.push({
        rule: "expected-command",
        line,
        col: head.col,
        end: head.end,
        message: `line starts with ${head.type === "number" ? "a number" : "a string"}, not a command`,
      });
      return;
    }

    const name = head.value;
    const args = tokens.slice(1);

    if (CLOSERS[name]) {
      if (section !== CLOSERS[name]) {
        problems.push({
          rule: "unmatched-endevent",
          line,
          col: head.col,
          end: head.end,
          message: "endevent without a matching playerevent or squareevent",
        });
      }
      // Tagged as an event statement even when unmatched, so the scope rule
      // does not pile a second complaint on top of the one just made.
      statements.push({ name, args, line, col: head.col, section: CLOSERS[name], comment, closes: true });
      section = null;
      openEvent = null;
      return;
    }

    if (opensSection(name, section)) {
      // Moving the pointer while an event is open abandons it silently. The
      // engine will not object; the event just never runs as written.
      if (section === "event" && OPENERS[name] !== "event") {
        problems.push({
          rule: "missing-endevent",
          line,
          col: head.col,
          end: head.end,
          message: `event opened at line ${openEvent.line} is still open`,
          hint: "every event must end with endevent",
        });
      }

      const statement = { name, args, line, col: head.col, section: OPENERS[name], comment, opens: true };
      statements.push(statement);
      section = OPENERS[name];
      openEvent = section === "event" ? statement : null;
      return;
    }

    statements.push({ name, args, line, col: head.col, section, comment });
  });

  // An event left open at end of file is reported against its opener, since
  // that is the line the author has to go back to.
  if (openEvent) {
    problems.push({
      rule: "missing-endevent",
      line: openEvent.line,
      col: openEvent.col,
      end: openEvent.col + openEvent.name.length,
      message: "event is never closed",
      hint: "every event must end with endevent",
    });
  }

  return { statements, problems };
}

/**
 * @typedef {import("./tokenizer.js").Token} Token
 * @typedef {{name: string, args: Token[], line: number, col: number, section: string|null, comment: string|null, opens?: boolean, closes?: boolean}} Statement
 * @typedef {{rule: string, line: number, col: number, end?: number, message: string, hint?: string}} Problem
 */
