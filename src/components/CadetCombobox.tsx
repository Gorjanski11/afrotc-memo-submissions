import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { compareByLastName } from "../domain/nameUtils";
import type { RosterPerson } from "../domain/types";

interface Props {
  roster: RosterPerson[];
  value: string;
  onChange: (cadetId: string) => void;
  className?: string;
}

function sortByLastName(roster: RosterPerson[]): RosterPerson[] {
  return [...roster].sort((a, b) => compareByLastName(a.name, b.name));
}

export function CadetCombobox({ roster, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const sorted = useMemo(() => sortByLastName(roster), [roster]);
  const selected = roster.find((c) => c.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-64 justify-between font-normal", className)}>
          {selected ? selected.name : "Select a cadet..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <Command>
          <CommandInput placeholder="Type a name..." />
          <CommandList>
            <CommandEmpty>No cadet found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((c) => (
                <CommandItem
                  key={c.id}
                  value={c.name}
                  onSelect={() => {
                    onChange(c.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", c.id === value ? "opacity-100" : "opacity-0")} />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
