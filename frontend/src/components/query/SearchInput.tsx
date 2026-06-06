import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SearchInputProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

export function SearchInput({ id, label, placeholder, value, onChange }: SearchInputProps) {
  return (
    <div className="min-w-0 flex-1">
      <Label htmlFor={id} className="sr-only">
        {label}
      </Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className="pl-9" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}
