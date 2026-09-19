import { useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PmtEvent } from "../domain/types";

interface Props {
  events: PmtEvent[];
  value: string[];
  onChange: (pmtEventIds: string[]) => void;
}

const ALL_WEEKS = "__all__";

function formatEvent(e: PmtEvent): string {
  const date = e.eventDate ? new Date(e.eventDate).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "no date";
  return `${e.eventType} — ${e.title} (${date})`;
}

/**
 * Picks the PMT(s) a single Absence Memo covers -- a cadet who missed a whole training day picks
 * all of them in one memo. Training Week first, then just that week's PMTs in the picker below, so
 * cadets aren't scrolling through the whole semester to find what they missed.
 */
export function PmtMultiSelect({ events, value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const sorted = useMemo(() => [...events].sort((a, b) => b.eventDate.localeCompare(a.eventDate)), [events]);

  const availableWeeks = useMemo(
    () => [...new Set(events.map((e) => e.trainingWeek).filter((tw): tw is number => tw !== undefined))].sort((a, b) => b - a),
    [events]
  );
  const [weekFilter, setWeekFilter] = useState<string>(ALL_WEEKS);

  const weekEvents = useMemo(
    () => (weekFilter === ALL_WEEKS ? sorted : sorted.filter((e) => String(e.trainingWeek) === weekFilter)),
    [sorted, weekFilter]
  );

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
        {availableWeeks.length > 0 && (
          <div className="border-b border-input p-2">
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="Training Week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_WEEKS}>All weeks</SelectItem>
                {availableWeeks.map((tw) => (
                  <SelectItem key={tw} value={String(tw)}>
                    TW {tw}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <Command>
          <CommandInput placeholder="Search by title or type..." />
          <CommandList>
            <CommandEmpty>No PMT found.</CommandEmpty>
            <CommandGroup>
              {weekEvents.map((e) => (
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
