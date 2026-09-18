import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { PmtEventType } from "../domain/constants";
import type { PmtEvent } from "../domain/types";

const COLLECTION = "pmtEvents";

function mapPmtEvent(id: string, data: Record<string, unknown>): PmtEvent {
  return {
    id,
    title: (data.title as string) ?? "",
    eventDate: (data.eventDate as string) ?? "",
    eventType: ((data.eventType as PmtEventType) ?? "LLAB") as PmtEventType,
  };
}

/** Read-only -- lets a memo reference which PMT(s) it covers, off the same calendar the TO's and Accountability sites use. */
export function usePmtEvents() {
  const [events, setEvents] = useState<PmtEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setEvents(snap.docs.map((d) => mapPmtEvent(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load PMT events.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { events, loading, error, refetch };
}
