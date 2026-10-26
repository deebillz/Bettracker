import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * American odds entry that works on phones: the iPhone number pad has no + or − key,
 * so the sign is a two-button switch and the box only takes digits. Typing or pasting
 * "+150" / "-110" on a computer keyboard still sets the sign.
 *
 * value/onChange use the usual text form: "-110", "+150", or "" when empty.
 */
export default function OddsInput({
  value,
  onChange,
  placeholder = "110",
  className,
  testId,
  invalid,
  "aria-label": ariaLabel = "Odds",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  testId?: string;
  invalid?: boolean;
  "aria-label"?: string;
}) {
  const signOf = (v: string): "-" | "+" | null => (v.trim().startsWith("+") ? "+" : v.trim().startsWith("-") ? "-" : null);
  const [sign, setSign] = useState<"-" | "+">(signOf(value) ?? "-");
  const digits = value.replace(/\D/g, "");

  // Follow the sign when the value is set from outside (e.g. parlay price, "Log again")
  useEffect(() => {
    const s = signOf(value);
    if (s) setSign(s);
  }, [value]);

  const emit = (s: "-" | "+", d: string) => onChange(d ? `${s}${d}` : "");

  const signButton = (s: "-" | "+", label: string) => (
    <button
      type="button"
      onClick={() => {
        setSign(s);
        emit(s, digits);
      }}
      aria-pressed={sign === s}
      aria-label={s === "-" ? "Minus (favorite)" : "Plus (underdog)"}
      data-testid={testId ? `${testId}-sign-${s === "-" ? "minus" : "plus"}` : undefined}
      className={cn(
        "w-9 text-base font-semibold transition-colors",
        sign === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className={cn("flex h-9 w-full", className)}>
      <div
        role="group"
        aria-label="Odds sign"
        className={cn("flex shrink-0 overflow-hidden rounded-l-md border border-r-0 border-input", invalid && "border-destructive")}
      >
        {signButton("-", "−")}
        {signButton("+", "+")}
      </div>
      <Input
        value={digits}
        onChange={(e) => {
          const t = e.target.value;
          const s = t.includes("+") ? "+" : t.includes("-") || t.includes("−") ? "-" : sign;
          setSign(s);
          emit(s, t.replace(/\D/g, "").slice(0, 5));
        }}
        inputMode="numeric"
        pattern="[0-9]*"
        enterKeyHint="next"
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid}
        className={cn("h-9 rounded-l-none text-sm", invalid && "border-destructive")}
        data-testid={testId}
      />
    </div>
  );
}
