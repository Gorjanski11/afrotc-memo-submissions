import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./firebase";

// The Storage SDK retries transient network failures with backoff and never rejects on its own --
// if the bucket isn't actually provisioned (wrong plan, not yet enabled, CORS misconfigured), the
// request just hangs forever and the UI is stuck on "Uploading..."/"Submitting..." with no error.
// This turns that silent hang into an actual error after a reasonable wait.
const UPLOAD_TIMEOUT_MS = 20_000;

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Upload timed out -- file storage may not be set up yet. Contact your admin.")), ms)
  );
}

/** Uploads a memo PDF under `<folder>/<cadetId>/<timestamp>-<filename>` and returns its public download URL. */
export async function uploadMemoPdf(file: File, folder: "absenceMemos" | "deviationMemos", cadetId: string): Promise<{ url: string; fileName: string }> {
  const path = `${folder}/${cadetId}/${Date.now()}-${file.name}`;
  const storageRef = ref(storage, path);
  await Promise.race([uploadBytes(storageRef, file), timeout(UPLOAD_TIMEOUT_MS)]);
  const url = await getDownloadURL(storageRef);
  return { url, fileName: file.name };
}
