// Small, dependency-free arithmetic evaluator for amount fields — supports
// +, -, *, /, parentheses, and decimals. Deliberately not `eval`/`Function`
// (user input reaches this), so it's a hand-rolled tokenizer + recursive
// descent parser instead.

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(input: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === " " || ch === "\t") {
      i++;
      continue;
    }
    if (ch === "+" || ch === "-" || ch === "*" || ch === "/") {
      tokens.push({ type: "op", value: ch });
      i++;
      continue;
    }
    if (ch === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (ch === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ((ch >= "0" && ch <= "9") || ch === ".") {
      let j = i;
      let sawDot = false;
      while (
        j < input.length &&
        ((input[j] >= "0" && input[j] <= "9") || (input[j] === "." && !sawDot))
      ) {
        if (input[j] === ".") sawDot = true;
        j++;
      }
      const numStr = input.slice(i, j);
      if (numStr === "." || numStr === "") return null;
      tokens.push({ type: "num", value: Number(numStr) });
      i = j;
      continue;
    }
    return null; // unrecognized character
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    return this.tokens[this.pos++];
  }

  parseExpression(): number | null {
    let value = this.parseTerm();
    if (value === null) return null;
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "+" || tok.value === "-")) {
        this.consume();
        const rhs = this.parseTerm();
        if (rhs === null) return null;
        value = tok.value === "+" ? value + rhs : value - rhs;
      } else {
        break;
      }
    }
    return value;
  }

  private parseTerm(): number | null {
    let value = this.parseUnary();
    if (value === null) return null;
    for (;;) {
      const tok = this.peek();
      if (tok?.type === "op" && (tok.value === "*" || tok.value === "/")) {
        this.consume();
        const rhs = this.parseUnary();
        if (rhs === null) return null;
        if (tok.value === "/") {
          if (rhs === 0) return null;
          value = value / rhs;
        } else {
          value = value * rhs;
        }
      } else {
        break;
      }
    }
    return value;
  }

  private parseUnary(): number | null {
    const tok = this.peek();
    if (tok?.type === "op" && tok.value === "-") {
      this.consume();
      const value = this.parseUnary();
      return value === null ? null : -value;
    }
    if (tok?.type === "op" && tok.value === "+") {
      this.consume();
      return this.parseUnary();
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number | null {
    const tok = this.consume();
    if (!tok) return null;
    if (tok.type === "num") return tok.value;
    if (tok.type === "lparen") {
      const value = this.parseExpression();
      if (value === null) return null;
      const close = this.consume();
      if (close?.type !== "rparen") return null;
      return value;
    }
    return null;
  }

  isAtEnd(): boolean {
    return this.pos >= this.tokens.length;
  }
}

/**
 * Evaluates a math expression like "12+3.50" or "45/3" — +, -, *, /, and
 * parentheses only. Returns the numeric result, or null if the input isn't
 * a valid expression/number (bad syntax, division by zero, non-finite
 * result) so callers can just leave the raw text in place.
 */
export function evaluateAmountExpression(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Plain-number fast path — the common case, and avoids the parser turning
  // a bare "12.5" into anything unexpected.
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }

  const tokens = tokenize(trimmed);
  if (!tokens || tokens.length === 0) return null;

  const parser = new Parser(tokens);
  const result = parser.parseExpression();
  if (result === null || !parser.isAtEnd() || !Number.isFinite(result)) {
    return null;
  }

  return result;
}
