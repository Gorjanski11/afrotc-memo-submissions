import { useCallback, useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { AsLevel } from "../domain/constants";
import type { RosterPerson } from "../domain/types";

const COLLECTION = "cadets";

function mapPerson(id: string, data: Record<string, unknown>): RosterPerson {
  return {
    id,
    name: (data.name as string) ?? "",
    asClass: data.asClass as AsLevel | undefined,
    devLevel: data.devLevel as string | undefined,
    status: data.status as string | undefined,
    email: (data.email as string | null | undefined) ?? undefined,
  };
}

/** Read-only -- this site never writes to the shared roster, only references cadets by name/id when a memo is submitted. */
export function useRoster() {
  const [roster, setRoster] = useState<RosterPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION));
      setRoster(snap.docs.map((d) => mapPerson(d.id, d.data())));
      setError(undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { roster, loading, error, refetch };
}
