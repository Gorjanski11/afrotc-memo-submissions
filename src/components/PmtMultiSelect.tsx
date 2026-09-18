import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { PmtEvent } from "../domain/types";

interface Props {
  events: PmtEvent[];
  value: string[];
  onChange: (pmtEventIds: string[]) => void;
}

function formatEvent(e: PmtEvent): string {
  const date = e.eventDate ? new Date(e.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "no date";
  return `${e.eventType} — ${e.title} (${date})`;
}

/** Picks the PMT(s) a single Absence Memo covers -- a cadet who missed a whole training day picks all of them in one memo. */
export function PmtMultiSelect({ events, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const sorted = useMemo(() => [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [events]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(Array.from(next));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between font-normal">
          {value.length === 0 ? "Select PMT(s) missed..." : `${value.length} PMT${value.length === 1 ? "" : "s"} selected`}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <Command>
          <CommandInput placeholder="Search by title or type..." />
          <CommandList>
            <CommandEmpty>No PMT found.</CommandEmpty>
            <CommandGroup>
              {sorted.map((e) => (
                <CommandItem key={e.id} value={formatEvent(e)} onSelect={() => toggle(e.id)}>
                  <Check className={cn("mr-2 h-4 w-4 shrink-0", selected.has(e.id) ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{formatEvent(e)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
