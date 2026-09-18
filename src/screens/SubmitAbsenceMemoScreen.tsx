import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileText, Send, CheckCircle2 } from "lucide-react";
import { CadetCombobox } from "../components/CadetCombobox";
import { PmtMultiSelect } from "../components/PmtMultiSelect";
import { uploadMemoPdf } from "../lib/storage";
import { ABSENCE_REASONS, ABSENCE_AS_CLASSES, INSTRUCTORS } from "../domain/constants";
import type { AbsenceAsClass, AbsenceReason, Instructor } from "../domain/constants";
import type { AbsenceMemo, PmtEvent, RosterPerson } from "../domain/types";
import type { AbsenceMemoInput } from "../hooks/useAbsenceMemos";

interface Props {
  roster: RosterPerson[];
  events: PmtEvent[];
  createMemo: (input: AbsenceMemoInput) => Promise<AbsenceMemo>;
}

const NONE = "__none__";

export function SubmitAbsenceMemoScreen({ roster, events, createMemo }: Props) {
  const [cadetId, setCadetId] = useState("");
  const [pmtEventIds, setPmtEventIds] = useState<string[]>([]);
  const [asClass, setAsClass] = useState<AbsenceAsClass | typeof NONE>(NONE);
  const [classDate, setClassDate] = useState("");
  const [classTitle, setClassTitle] = useState("");
  const [instructor, setInstructor] = useState<Instructor | typeof NONE>(NONE);
  const [reason, setReason] = useState<AbsenceReason>("Personal");
  const [medicalDocSent, setMedicalDocSent] = useState(false);
  const [file, setFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | undefined>();
  const [justSubmitted, setJustSubmitted] = useState(false);

  const hasClassInfo = asClass !== NONE && classDate.trim() && classTitle.trim() && instructor !== NONE;
  const canSubmit = !!cadetId && (pmtEventIds.length > 0 || hasClassInfo);

  const resetForm = () => {
    setCadetId("");
    setPmtEventIds([]);
    setAsClass(NONE);
    setClassDate("");
    setClassTitle("");
    setInstructor(NONE);
    setReason("Personal");
    setMedicalDocSent(false);
    setFile(undefined);
  };

  const handleSubmit = async () => {
    const person = roster.find((p) => p.id === cadetId);
    if (!person || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(undefined);
    try {
      let pdfUrl: string | undefined;
      let pdfFileName: string | undefined;
      if (file) {
        const uploaded = await uploadMemoPdf(file, "absenceMemos", person.id);
        pdfUrl = uploaded.url;
        pdfFileName = uploaded.fileName;
      }
      await createMemo({
        cadetId: person.id,
        cadetName: person.name,
        pmtEventIds,
        asClass: asClass === NONE ? undefined : asClass,
        classDate: hasClassInfo ? new Date(classDate).toISOString() : undefined,
        classTitle: hasClassInfo ? classTitle.trim() : undefined,
        instructor: instructor === NONE ? undefined : instructor,
        reason,
        medicalDocSent,
        pdfUrl,
        pdfFileName,
        status: "Pending",
        submittedAt: new Date().toISOString(),
        reviewedAt: undefined,
        reviewedBy: undefined,
        reviewNotes: "",
        returnReason: undefined,
        attendanceUpdatedAt: undefined,
      });
      resetForm();
      setJustSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Failed to submit memo.");
    } finally {
      setSubmitting(false);
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

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader>
            <CardTitle>New Absence Memo</CardTitle>
            <CardDescription>
              Covers everything missed for one absence -- pick every PMT missed and/or fill in the AS-Class fields below, not one memo per item.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cadet</Label>
              <CadetCombobox roster={roster} value={cadetId} onChange={setCadetId} className="w-full" />
            </div>

            <div className="space-y-1.5">
              <Label>PMT(s) missed</Label>
              <PmtMultiSelect events={events} value={pmtEventIds} onChange={setPmtEventIds} />
              <p className="text-xs text-muted-foreground">Includes PT sessions -- they're on the same shared calendar.</p>
            </div>

            <div className="space-y-3 rounded-md border border-input p-3">
              <p className="text-sm font-medium">AS-Class absence (fill in only if this covers a missed class)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>AS Class</Label>
                  <Select value={asClass} onValueChange={(v) => setAsClass(v as AbsenceAsClass | typeof NONE)}>
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
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
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None</SelectItem>
                    {INSTRUCTORS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => setReason(v as AbsenceReason)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ABSENCE_REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={medicalDocSent} onChange={(e) => setMedicalDocSent(e.target.checked)} />
              Medical documentation sent separately
            </label>
            <div className="space-y-1.5">
              <Label>Memorandum PDF</Label>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0])}
                className="block w-full text-sm text-muted-foreground"
              />
            </div>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <Button onClick={handleSubmit} disabled={submitting || !canSubmit}>
              <Send className="h-3.5 w-3.5" />
              {submitting ? "Submitting..." : "Submit Memo"}
            </Button>
          </CardContent>
        </Card>

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
    </div>
  );
}
