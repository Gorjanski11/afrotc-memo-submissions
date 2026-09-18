# Borinkeneers Memo Submissions

The GMC/POC-facing counterpart to [afrotc-memorandums-tracker](https://github.com/Gorjanski11/afrotc-memorandums-tracker)
(the cadre site). This site is submission only: an Absence Memo form and a Deviation Memo
submission flow, nothing else -- no review, no history, no dashboard. Same Firebase project as
every other site in this ecosystem, so anything submitted here appears immediately in the cadre
site's review queues.

## Why a separate site

The cadre site used to also host these submission forms, but cadets and cadre editing the same
screens made it easy to blur who's allowed to do what. Splitting submission into its own
deployment means the cadre site can stay review-only, and this site can stay submission-only --
each URL only ever does one thing.

## What's here

- **Absence Memo**: pick the cadet, then either (or both) of: which PMT(s) were missed (PT
  included -- same shared calendar), or the AS-Class fields (AS Class, date, material covered,
  instructor) for an academic-class absence. Reason, medical-doc-sent flag, PDF upload, and the
  DAFH 33-337 formatting requirements shown alongside the form.
- **Deviation Memo**: pick your own name, see anything assigned to you that's still awaiting
  submission, upload the PDF.

## Local development

```sh
npm install
npm run dev
```

Talks to production Firestore and Storage directly unless `VITE_USE_FIREBASE_EMULATOR=true` is
set (see `src/lib/firebase.ts`) -- be careful with writes and uploads during local testing.

## Deploy

GitHub Actions (`.github/workflows/deploy.yml`) builds and deploys to GitHub Pages on push to
`master`. Requires the repo's Settings -> Pages -> Source set to "GitHub Actions", and
`vite.config.ts`'s `base` kept in sync with the repo name if it's ever renamed.
