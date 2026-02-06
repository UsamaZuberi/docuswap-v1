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
}

export function FormatSelector<T extends string>({
  label,
  value,
  options,
  onValueChange,
}: FormatSelectorProps<T>) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <Select value={value} onValueChange={(next) => onValueChange(next as T)}>
        <SelectTrigger className="bg-slate-950/60 text-white">
          <SelectValue placeholder={`Choose ${label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent className="bg-slate-950 text-white">
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
