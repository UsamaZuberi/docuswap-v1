import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormatSelectorProps<T extends string> {
  label: string;
  value: T;
  options: readonly T[];
  onValueChange: (value: T) => void;
  disabled?: boolean;
}

export function FormatSelector<T extends string>({
  label,
  value,
  options,
  onValueChange,
  disabled,
}: FormatSelectorProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-600 dark:text-slate-500">{label}</p>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)} disabled={disabled}>
        <SelectTrigger className="border border-slate-200 bg-white text-slate-900 shadow-sm disabled:opacity-60 dark:border-white/10 dark:bg-slate-950/60 dark:text-white">
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="border border-slate-200 bg-white text-slate-900 dark:border-white/10 dark:bg-slate-950 dark:text-white">
          {options.map((format) => (
            <SelectItem key={format} value={format}>
              {format.toUpperCase()}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
