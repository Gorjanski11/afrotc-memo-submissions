import { useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, CheckCircle2, Plus, Upload } from "lucide-react";
import { CadetCombobox } from "../components/CadetCombobox";
import { uploadMemoPdf } from "../lib/storage";
import { flipAttendanceToPendingExcuse } from "../lib/attendanceLink";
import { ABSENCE_AS_CLASSES, INSTRUCTORS } from "../domain/constants";
import type { AbsenceAsClass, Instructor } from "../domain/constants";
import type { AbsenceMemo, PmtEvent, RosterPerson } from "../domain/types";
import type { AbsenceMemoInput } from "../hooks/useAbsenceMemos";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  memos: AbsenceMemo[];
  createMemo: (input: AbsenceMemoInput) => Promise<AbsenceMemo>;
  updateMemo: (id: string, input: Partial<AbsenceMemoInput>) => Promise<void>;
  deleteMemo: (id: string) => Promise<void>;
}

const NONE = "__none__";

function eventLabel(events: PmtEvent[], id: string): string {
  const e = events.find((ev) => ev.id === id);
  if (!e) return "a PMT";
  return `${e.eventType} — ${e.title} (${new Date(e.eventDate).toLocaleDateString()})`;
}

export function SubmitAbsenceMemoScreen({ roster, events, memos, createMemo, updateMemo, deleteMemo }: Props) {
  const [cadetId, setCadetId] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [addAsClass, setAddAsClass] = useState(false);
  const [asClass, setAsClass] = useState<AbsenceAsClass | typeof NONE>(NONE);
  const [classDate, setClassDate] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [instructor, setInstructor] = useState<Instructor | typeof NONE>(NONE);
  const [medicalDocSent, setMedicalDocSent] = useState(false);
  const [file, setFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [justSubmitted, setJustSubmitted] = useState(false);

  const [resubmittingId, setResubmittingId] = useState<string | undefined>();
  const [resubmitFile, setResubmitFile] = useState<File | undefined>();
  const [resubmitBusy, setResubmitBusy] = useState(false);
  const [resubmitError, setResubmitError] = useState<string | undefined>();

  const myAssigned = useMemo(
    () => memos.filter((m) => m.cadetId === cadetId && m.status === "Assigned").sort((a, b) => (a.assignedAt ?? "").localeCompare(b.assignedAt ?? "")),
    [memos, cadetId]
  );
  const myReturned = useMemo(
    () => memos.filter((m) => m.cadetId === cadetId && m.status === "Returned").sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? "")),
    [memos, cadetId]
  );
  const myHistory = useMemo(
    () =>
      memos
        .filter((m) => m.cadetId === cadetId && (m.status === "Pending" || m.status === "Accepted" || m.status === "Rejected"))
        .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [memos, cadetId]
  );

  const hasClassInfo = addAsClass && asClass !== NONE && classDate.trim() && classTitle.trim() && instructor !== NONE;
  const canSubmit = !!cadetId && (selectedIds.size > 0 || hasClassInfo) && !!file;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setSelectedIds(new Set());
    setAddAsClass(false);
    setAsClass(NONE);
    setClassDate("");
    setClassTitle("");
    setInstructor(NONE);
    setMedicalDocSent(false);
    setFile(undefined);
  };

  const handleSubmit = async () => {
    const person = roster.find((p) => p.id === cadetId);
    if (!person || !canSubmit || !file) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      const covering = myAssigned.filter((m) => selectedIds.has(m.id));
      const pmtEventIds = covering.flatMap((m) => m.pmtEventIds);
      const attendanceIds = covering.flatMap((m) => m.attendanceIds);
      // Auto-filled from whichever covered PMT absence was recorded first -- an AS-Class-only
      // memo (no covered PMT) defaults to Academics, since that's what it always is.
      const reason = covering[0]?.reason ?? "Academics";

      const uploaded = await uploadMemoPdf(file, "absenceMemos", person.id);

      await createMemo({
        cadetId: person.id,
        cadetName: person.name,
        pmtEventIds,
        attendanceIds,
        assignedAt: undefined,
        asClass: hasClassInfo ? (asClass as AbsenceAsClass) : undefined,
        classDate: hasClassInfo ? new Date(classDate).toISOString() : undefined,
        classTitle: hasClassInfo ? classTitle.trim() : undefined,
        instructor: hasClassInfo ? (instructor as Instructor) : undefined,
        reason,
        medicalDocSent,
        pdfUrl: uploaded.url,
        pdfFileName: uploaded.fileName,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: "",
        returnReason: undefined,
        attendanceUpdatedAt: undefined,
      });

      // The auto-assigned records this submission covers are now folded into the memo above --
      // remove them so they don't keep sitting there needing action.
      for (const m of covering) await deleteMemo(m.id);
      if (attendanceIds.length > 0) await flipAttendanceToPendingExcuse(attendanceIds);

      resetForm();
      setJustSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit memo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async (memo: AbsenceMemo) => {
    if (!resubmitFile) return;
    setResubmitBusy(true);
    setResubmitError(undefined);
    try {
      const uploaded = await uploadMemoPdf(resubmitFile, "absenceMemos", memo.cadetId);
      await updateMemo(memo.id, {
        pdfUrl: uploaded.url,
        pdfFileName: uploaded.fileName,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        returnReason: undefined,
      });
      setResubmittingId(undefined);
      setResubmitFile(undefined);
    } catch (e) {
      setResubmitError(e instanceof Error ? e.message : "Failed to resubmit.");
    } finally {
      setResubmitBusy(false);
    }
  };

  return (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-semibold">
        <FileText className="h-5 w-5 text-primary" />
        Absence Memo
      </h2>

      {justSubmitted && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-success/50 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Submitted. Cadre will review it and let you know if anything needs to be fixed.
        </div>
      )}

      <Card className="mb-6 max-w-md">
        <CardHeader>
          <CardTitle>Who are you?</CardTitle>
          <CardDescription>Pick your name to see any absences that need a memo.</CardDescription>
        </CardHeader>
        <CardContent>
          <CadetCombobox
            roster={roster}
            value={cadetId}
            onChange={(v) => {
              setCadetId(v);
              resetForm();
              setJustSubmitted(false);
            }}
            className="w-full"
          />
        </CardContent>
      </Card>

      {cadetId && (
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {myReturned.length > 0 && (
              <Card className="border-warning/50">
                <CardHeader>
                  <CardTitle className="text-warning-foreground">Returned -- needs fixing</CardTitle>
                  <CardDescription>Cadre sent these back. Attach a corrected PDF and resubmit within 48 hours.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myReturned.map((m) => (
                    <div key={m.id} className="rounded-md border border-input p-3">
                      <div className="mb-1 text-sm font-medium">
                        {m.pmtEventIds.length > 0 ? m.pmtEventIds.map((id) => eventLabel(events, id)).join(", ") : `${m.asClass} class absence`}
                      </div>
                      {m.returnReason && <p className="mb-2 text-sm text-muted-foreground">Reason: {m.returnReason}</p>}
                      {resubmittingId === m.id ? (
                        <div className="flex items-center gap-2">
                          {resubmitFile ? (
                            <span className="flex items-center gap-1.5 text-xs">
                              <span className="max-w-40 truncate">{resubmitFile.name}</span>
                              <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setResubmitFile(undefined)}>
                                Change
                              </Button>
                            </span>
                          ) : (
                            <input
                              type="file"
                              accept="application/pdf"
                              onChange={(e) => setResubmitFile(e.target.files?.[0])}
                              className="text-xs text-muted-foreground"
                            />
                          )}
                          <Button size="sm" disabled={!resubmitFile || resubmitBusy} onClick={() => handleResubmit(m)}>
                            {resubmitBusy ? "Uploading..." : "Resubmit"}
                          </Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setResubmittingId(m.id)}>
                          <Upload className="h-3.5 w-3.5" />
                          Attach corrected PDF
                        </Button>
                      )}
                    </div>
                  ))}
                  {resubmitError && <p className="text-sm text-destructive">{resubmitError}</p>}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>New Absence Memo</CardTitle>
                <CardDescription>
                  Check off every absence this memo covers, and/or add an AS-Class absence below (not tracked automatically), then attach one PDF.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Absences needing a memo</Label>
                  {myAssigned.length === 0 ? (
                    <p className="rounded-md border border-input p-3 text-sm text-muted-foreground">
                      Nothing on file right now -- if you were just marked absent, check back shortly.
                    </p>
                  ) : (
                    <div className="space-y-1.5 rounded-md border border-input p-2">
                      {myAssigned.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-accent">
                          <input type="checkbox" checked={selectedIds.has(m.id)} onChange={() => toggleSelected(m.id)} />
                          {m.pmtEventIds.map((id) => eventLabel(events, id)).join(", ")}
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {!addAsClass ? (
                  <Button type="button" variant="outline" size="sm" onClick={() => setAddAsClass(true)}>
                    <Plus className="h-3.5 w-3.5" />
                    Add an AS-Class absence
                  </Button>
                ) : (
                  <div className="space-y-3 rounded-md border border-input p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">AS-Class absence</p>
                      <Button type="button" variant="ghost" size="sm" className="h-7" onClick={() => setAddAsClass(false)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label>AS Class</Label>
                        <Select value={asClass} onValueChange={(v) => setAsClass(v as AbsenceAsClass | typeof NONE)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE}>Select</SelectItem>
                            {ABSENCE_AS_CLASSES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Date of class</Label>
                        <Input type="date" value={classDate} onChange={(e) => setClassDate(e.target.value)} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Material covered that day</Label>
                      <Input value={classTitle} onChange={(e) => setClassTitle(e.target.value)} placeholder="e.g. Chapter 4: Leadership Theory" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Instructor</Label>
                      <Select value={instructor} onValueChange={(v) => setInstructor(v as Instructor | typeof NONE)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE}>Select</SelectItem>
                          {INSTRUCTORS.map((i) => (
                            <SelectItem key={i} value={i}>
                              {i}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={medicalDocSent} onChange={(e) => setMedicalDocSent(e.target.checked)} />
                  Medical documentation sent separately
                </label>

                <div className="space-y-1.5">
                  <Label>Memorandum PDF</Label>
                  {file ? (
                    <div className="flex items-center gap-2 rounded-md border border-input p-2 text-sm">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate">{file.name}</span>
                      <Button type="button" variant="ghost" size="sm" className="ml-auto h-7 shrink-0" onClick={() => setFile(undefined)}>
                        Change
                      </Button>
                    </div>
                  ) : (
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => setFile(e.target.files?.[0])}
                      className="block w-full text-sm text-muted-foreground"
                    />
                  )}
                </div>

                {submitError && <p className="text-sm text-destructive">{submitError}</p>}
                <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
                  <Send className="h-3.5 w-3.5" />
                  {submitting ? "Submitting..." : "Submit Memo"}
                </Button>
              </CardContent>
            </Card>

            {myHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {myHistory.map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{m.pmtEventIds.length > 0 ? m.pmtEventIds.map((id) => eventLabel(events, id)).join(", ") : `${m.asClass} class`}</span>
                      <Badge variant={m.status === "Accepted" ? "success" : m.status === "Rejected" ? "destructive" : "secondary"}>{m.status}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Memorandum requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <ul className="list-disc space-y-2 pl-4">
                <li>The absence memorandum must explain the reason for the absence, and it must be redacted IAW DAFH 33-337, The Tongue &amp; Quill.</li>
                <li>
                  The memorandum's MEMORANDUM FOR line must read "DET 756/OFC" for PMT absences, and/or "AS___ INSTRUCTOR" for AS class absences, as
                  applicable, with the AS class code substituted into the respective line. If the memorandum is addressed to multiple offices, each
                  subsequent office must be aligned under the first, as demonstrated in Chapter 14 of DAFH 33-337.
                </li>
                <li>
                  The memorandum's FROM line must reflect the cadet's office symbol, as reflected in the latest Cadet Wing Organizational Chart (e.g.,
                  DET 756/TRG), or the organizational symbol of your flight.
                </li>
                <li>The memorandum's SUBJECT line must read "Absence Memorandum".</li>
                <li>
                  The second line of the memorandum's signature block must reflect the cadet's duty title as reflected in the latest Cadet Wing
                  Organizational chart (e.g., Maintenance Group Commander), or flight membership, if the cadet does not currently hold a Cadet Wing
                  Position (e.g., Alpha Flight Member).
                </li>
                <li className="font-medium text-foreground">Should the aforementioned submission requirements not be met, the absence will not be excused.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
