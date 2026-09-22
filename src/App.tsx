import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList, LogOut, KeyRound } from "lucide-react";
import { useRoster } from "./hooks/useRoster";
import { usePmtEvents } from "./hooks/usePmtEvents";
import { useAbsenceMemos } from "./hooks/useAbsenceMemos";
import { useDeviationMemos } from "./hooks/useDeviationMemos";
import { useAuth } from "./hooks/useAuth";
import { SignInScreen } from "./components/SignInScreen";
import { ChangePasswordDialog } from "./components/ChangePasswordDialog";
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

// GMC/POC-facing submission portal -- per-cadet login (Email/Password, accounts provisioned
// individually to match each cadet's roster email). Same Firebase project: reads the shared
// roster/calendar and writes into the same absenceMemos/deviationMemos collections the cadre site
// (afrotc-memorandums-tracker) reviews. Submission only -- no review, no history, no dashboard here
// by design. A signed-in cadet only ever sees their own submissions -- their identity comes from
// matching their auth email against the roster, not from picking their name off a list.
function App() {
  const { user, authLoading, signIn, signOut, changePassword } = useAuth();
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const rosterState = useRoster();
  const eventsState = usePmtEvents();
  const absenceState = useAbsenceMemos();
  const deviationState = useDeviationMemos();

  const [screen, setScreen] = useState<Screen>("absence");

  const dataLoading = rosterState.loading || eventsState.loading || absenceState.loading || deviationState.loading;
  const loadError = rosterState.error || eventsState.error || absenceState.error || deviationState.error;

  const myCadet = useMemo(() => {
    if (!user?.email) return undefined;
    const normalized = user.email.trim().toLowerCase();
    return rosterState.roster.find((p) => p.email?.trim().toLowerCase() === normalized);
  }, [user, rosterState.roster]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Skeleton className="h-10 w-48" />
      </div>
    );
  }

  if (!user) {
    return <SignInScreen signIn={signIn} />;
  }

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
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          <Button variant="ghost" size="icon" onClick={() => setChangePasswordOpen(true)} aria-label="Change password">
            <KeyRound className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => void signOut()} aria-label="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <ChangePasswordDialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} changePassword={changePassword} />

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
          ) : !myCadet ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <p className="text-sm text-destructive">
                We couldn't find a cadet record matching your login email ({user.email}). Contact cadre to make sure your roster email matches.
              </p>
            </div>
          ) : (
            <>
              <TabsContent value="absence">
                <AnimatedPanel>
                  <SubmitAbsenceMemoScreen
                    cadet={myCadet}
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
                  <SubmitDeviationMemoScreen cadet={myCadet} memos={deviationState.memos} updateMemo={deviationState.updateMemo} />
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
