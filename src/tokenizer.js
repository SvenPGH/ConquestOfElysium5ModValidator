import { patterns } from "./grammar.js";

/**
 * Lexer for one line of .c5m source.
 *
 * The format is a command name followed by numbers and quoted text, with `#`
 * starting a comment. No nesting, no line continuation, no escapes, so the
 * lexer carries no state between lines.
 */

const WHITESPACE = /\s/;
const TOKEN_BREAK = /[\s"#]/;

/**
 * @param {string} line
 * @returns {{tokens: Token[], comment: string|null, problems: LexProblem[]}}
 */
export function tokenizeLine(line) {
  const tokens = [];
  const problems = [];
  let comment = null;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (WHITESPACE.test(char)) {
      i++;
    } else if (char === "#") {
      comment = line.slice(i);
      break;
    } else if (char === '"') {
      i = readString(line, i, tokens, problems);
      if (i === -1) break;
    } else if (patterns.smartQuote.test(char)) {
      // Dropped rather than paired up: pairing them would invent a string the
      // engine is never going to see.
      problems.push({
        rule: "smart-quote",
        col: i,
        end: i + 1,
        message: 'curly quote, the parser only recognises the straight ASCII quote `"`',
      });
      i++;
    } else {
      i = readBareWord(line, i, tokens);
    }
  }

  return { tokens, comment, problems };
}

/** @returns {number} the index after the closing quote, or -1 if there was none */
function readString(line, start, tokens, problems) {
  const close = line.indexOf('"', start + 1);

  if (close === -1) {
    tokens.push({ type: "unterminated", value: line.slice(start + 1), col: start, end: line.length });
    return -1;
  }

  const value = line.slice(start + 1, close);

  // A quote wins over a hash here. The engine may well cut the line at the hash
  // instead; since that is unverified, tokenize the forgiving way and warn.
  if (value.includes("#")) {
    problems.push({
      rule: "hash-in-string",
      col: start,
      end: close + 1,
      message: "`#` inside a string literal, the game may cut the line there as a comment",
    });
  }

  tokens.push({ type: "string", value, col: start, end: close + 1 });
  return close + 1;
}

function readBareWord(line, start, tokens) {
  let i = start;
  while (i < line.length && !TOKEN_BREAK.test(line[i])) i++;

  const text = line.slice(start, i);
  const numeric = patterns.integer.test(text);

  // `raw` survives the coercion to Number so diagnostics can quote what the
  // author actually typed.
  tokens.push({
    type: numeric ? "number" : "word",
    value: numeric ? Number(text) : text,
    raw: text,
    col: start,
    end: i,
  });
  return i;
}

/**
 * @typedef {{type: "word"|"number"|"string"|"unterminated", value: string|number, raw?: string, col: number, end: number}} Token
 * @typedef {{rule: string, col: number, end: number, message: string}} LexProblem
 */
