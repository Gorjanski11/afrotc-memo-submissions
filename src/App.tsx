import { motion } from "motion/react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Moon, Sun, FileText, ClipboardList } from "lucide-react";
import { useRoster } from "./hooks/useRoster";
import { usePmtEvents } from "./hooks/usePmtEvents";
import { useAbsenceMemos } from "./hooks/useAbsenceMemos";
import { useDeviationMemos } from "./hooks/useDeviationMemos";
import { useTheme } from "./hooks/useTheme";
import { SubmitAbsenceMemoScreen } from "./screens/SubmitAbsenceMemoScreen";
import { SubmitDeviationMemoScreen } from "./screens/SubmitDeviationMemoScreen";

type Screen = "absence" | "deviation";

function AnimatedPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, ease: "easeOut" }}>
      {children}
    </motion.div>
  );
}

// GMC/POC-facing submission portal -- no login, same as every other site in this ecosystem. Same
// Firebase project: reads the shared roster/calendar and writes into the same absenceMemos/
// deviationMemos collections the cadre site (afrotc-memorandums-tracker) reviews. Submission only
// -- no review, no history, no dashboard here by design.
function App() {
  const rosterState = useRoster();
  const eventsState = usePmtEvents();
  const absenceState = useAbsenceMemos();
  const deviationState = useDeviationMemos();
  const { theme, toggleTheme } = useTheme();

  const [screen, setScreen] = useState<Screen>("absence");

  const dataLoading = rosterState.loading || eventsState.loading || absenceState.loading || deviationState.loading;
  const loadError = rosterState.error || eventsState.error || absenceState.error || deviationState.error;

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b border-input bg-background px-8 py-3">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <FileText className="h-4 w-4" />
          </span>
          <div className="flex items-baseline gap-4">
            <h1 className="text-xl font-semibold">Borinkeneers Memo Submissions</h1>
            <span className="text-sm text-muted-foreground">Absence & Deviation memos</span>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle dark mode" className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={theme}
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.span>
          </AnimatePresence>
        </Button>
      </header>

      <Tabs value={screen} onValueChange={(v) => setScreen(v as Screen)} className="flex flex-1 flex-col overflow-hidden">
        <nav className="px-8">
          <TabsList>
            <TabsTrigger value="absence">
              <FileText className="h-3.5 w-3.5" />
              Absence Memo
            </TabsTrigger>
            <TabsTrigger value="deviation">
              <ClipboardList className="h-3.5 w-3.5" />
              Deviation Memo
            </TabsTrigger>
          </TabsList>
        </nav>

        <main className="flex-1 overflow-auto p-6">
          {dataLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          ) : loadError ? (
            <div className="flex h-full items-center justify-center">
              <span className="text-destructive">{loadError}</span>
            </div>
          ) : (
            <>
              <TabsContent value="absence">
                <AnimatedPanel>
                  <SubmitAbsenceMemoScreen
                    roster={rosterState.roster}
                    events={eventsState.events}
                    memos={absenceState.memos}
                    createMemo={absenceState.createMemo}
                    updateMemo={absenceState.updateMemo}
                    deleteMemo={absenceState.deleteMemo}
                  />
                </AnimatedPanel>
              </TabsContent>
              <TabsContent value="deviation">
                <AnimatedPanel>
                  <SubmitDeviationMemoScreen roster={rosterState.roster} memos={deviationState.memos} updateMemo={deviationState.updateMemo} />
                </AnimatedPanel>
              </TabsContent>
            </>
          )}
        </main>
      </Tabs>
    </div>
  );
}

export default App;
