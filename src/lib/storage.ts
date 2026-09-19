import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "./firebase";

// A flat deadline from the start of the upload fails real (larger, or on a slow/cellular
// connection) files that are still actively transferring -- a memo PDF on a phone can easily take
// longer than a fixed 20s cap even though it's working fine. Instead, this watches for *stalls*:
// the timer resets on every progress tick, so it only fires if no bytes have moved for a while
// (which is what a genuinely broken upload -- wrong bucket, denied by rules, etc. -- looks like).
const STALL_TIMEOUT_MS = 30_000;

/** Uploads a memo PDF under `<folder>/<cadetId>/<timestamp>-<filename>` and returns its public download URL. */
export function uploadMemoPdf(file: File, folder: "absenceMemos" | "deviationMemos", cadetId: string): Promise<{ url: string; fileName: string }> {
  const path = `${folder}/${cadetId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  const task = uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    let stallTimer: ReturnType<typeof setTimeout>;
    const resetStallTimer = () => {
      clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        task.cancel();
        reject(new Error("Upload stalled -- no progress for 30s. Check your connection, or file storage may not be set up yet. Contact your admin."));
      }, STALL_TIMEOUT_MS);
    };
    resetStallTimer();

    task.on(
      "state_changed",
      () => resetStallTimer(),
      (error) => {
        clearTimeout(stallTimer);
        reject(error);
      },
      async () => {
        clearTimeout(stallTimer);
        try {
          const url = await getDownloadURL(storageRef);
          resolve({ url, fileName: file.name });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}
