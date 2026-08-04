"use client";

import { useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { evaluateAmountExpression } from "@/lib/calc";
import { cn } from "@/lib/utils";

// Any of these means the text is a genuine expression rather than a plain
// number — used to decide whether Enter should evaluate-and-hold instead of
// submitting the form as normal.
const HAS_OPERATOR_RE = /[+*/()]|(?!^)-/;

interface AmountInputProps {
  id?: string;
  name?: string;
  // Uncontrolled (form-submission) mode — read via FormData on submit.
  defaultValue?: number | string;
  // Controlled mode — for callers that need the parsed number as state
  // (e.g. the Quick Add review rows).
  value?: number;
  onValueChange?: (value: number) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export function AmountInput({
  id,
  name,
  defaultValue,
  value,
  onValueChange,
  required,
  placeholder = "0.00",
  className,
  autoFocus,
}: AmountInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const isControlled = value !== undefined;

  const [text, setText] = useState(() => {
    const initial = isControlled ? value : defaultValue;
    return initial === undefined || initial === null || Number.isNaN(initial as number)
      ? ""
      : String(initial);
  });

  function handleChange(next: string) {
    setText(next);
    if (isControlled) {
      const n = Number(next);
      onValueChange?.(Number.isFinite(n) ? n : NaN);
    }
  }

  // Returns the evaluated number (and syncs it into text/onValueChange), or
  // null if the current text isn't a valid expression/number — in which
  // case it's left untouched for normal validation to catch.
  function evaluate(): number | null {
    const result = evaluateAmountExpression(text);
    if (result === null) return null;
    const rounded = Math.round(result * 100) / 100;
    setText(String(rounded));
    onValueChange?.(rounded);
    return rounded;
  }

  return (
    <div className="flex gap-1.5">
      <Input
        id={inputId}
        name={name}
        type="text"
        inputMode="text"
        autoComplete="off"
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={evaluate}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          // Only intercept Enter for a real expression — a plain number
          // submits the form as usual.
          if (!HAS_OPERATOR_RE.test(text)) return;
          e.preventDefault();
          evaluate();
        }}
        required={required}
        placeholder={placeholder}
        className={cn("flex-1", className)}
        autoFocus={autoFocus}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0"
        aria-label="Calculate"
        onMouseDown={(e) => e.preventDefault()}
        onClick={evaluate}
      >
        =
      </Button>
    </div>
  );
}
