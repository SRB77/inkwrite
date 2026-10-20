import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../lib/utils";

function Field({ id, label, error, className, children }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-muted">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

export function Input({ label, error, className, inputClassName, id, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field id={fieldId} label={label} error={error} className={className}>
      <input
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={cn("input-base rounded-full", error && "border-danger!", inputClassName)}
        {...props}
      />
    </Field>
  );
}

export function Textarea({ label, error, className, inputClassName, id, rows = 4, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field id={fieldId} label={label} error={error} className={className}>
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={Boolean(error)}
        className={cn("input-base resize-none rounded-2xl", error && "border-danger!", inputClassName)}
        {...props}
      />
    </Field>
  );
}

export function Select({ label, error, className, inputClassName, id, children, ...props }) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <Field id={fieldId} label={label} error={error} className={className}>
      <div className="relative">
        <select
          id={fieldId}
          aria-invalid={Boolean(error)}
          className={cn("input-base appearance-none rounded-full pr-10", error && "border-danger!", inputClassName)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
    </Field>
  );
}
