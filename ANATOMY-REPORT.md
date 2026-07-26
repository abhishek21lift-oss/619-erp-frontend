# Anatomy artwork — sourcing report

Status: **partially delivered.** Packs 1 and 2 ship with legally verified,
commercially usable artwork. Packs 3–7 could not be sourced from this
environment. Read "The blocker" before planning around this.

---

## The blocker (read first)

The build environment's network policy **rejects outbound HTTPS to every host
except package registries**. This is not a licensing problem and it is not
something switching sources fixes — the gateway denies the connection before
any request is made.

Verified directly:

```
$ curl -sS "$HTTPS_PROXY/__agentproxy/status"
...
commons.wikimedia.org:443   connect_rejected: gateway answered 403 to CONNECT (policy denial)
upload.wikimedia.org:443    connect_rejected: gateway answered 403 to CONNECT (policy denial)
smart.servier.com:443       connect_rejected: gateway answered 403 to CONNECT (policy denial)
openstax.org:443            connect_rejected: gateway answered 403 to CONNECT (policy denial)
```

`registry.npmjs.org` **is** reachable (allowlisted). So the sourcing strategy
became: find permissively licensed anatomy geometry published as npm packages.
That is how Packs 1–2 were delivered.

To unblock Packs 3–7 someone with normal internet access needs to run the
download step once. The sources are named below with exact licences.

---

## Delivered

### Source used

| Field | Value |
|---|---|
| Source | [`body-highlighter@3.0.2`](https://www.npmjs.com/package/body-highlighter) (npm) |
| Upstream | https://github.com/GV79/body-highlighter |
| Licence | **MIT** |
| Author | Copyright (c) 2020 GV79 |
| Commercial use | **Yes**, unrestricted |
| Attribution required | **Yes** — copyright notice must accompany the work |
| SVG available | Yes (polygon geometry, `viewBox 0 0 100 200`) |
| PNG available | N/A — generated as SVG, scales losslessly |
| Resolution | Vector; emitted at 300×600 nominal |

Attribution is satisfied in two places: `public/anatomy/ATTRIBUTION.md`, and a
`<metadata>` element inside **every** generated SVG so the notice survives
copy/paste and export.

### Assets generated — 26 total

**Pack 1 — Full body (2 assets)**

| Requested | Delivered |
|---|---|
| Male Front | ⚠️ `body-front.svg` — gender-neutral |
| Male Back | ⚠️ `body-back.svg` — gender-neutral |
| Female Front | ❌ no gendered variant in source |
| Female Back | ❌ no gendered variant in source |

**Pack 2 — Muscles (24 assets: 13 groups × front/back where anatomically
applicable).** All 13 requested groups are covered:

Chest ✅ · Back (upper + lower) ✅ · Deltoids (front + rear) ✅ · Biceps ✅ ·
Triceps ✅ · Forearms ✅ · Abs ✅ · Obliques ✅ · Glutes ✅ · Quadriceps ✅ ·
Hamstrings ✅ · Calves (gastrocnemius + soleus) ✅ · Neck ✅

Each renders the whole figure with one group in an accent colour, so it reads
as a teaching diagram rather than a floating shape.

### Honest quality assessment

This is a **stylised muscle-map diagram**, the kind used in fitness apps. It is
genuinely useful for a strength coach or trainer marking which muscle group a
client worked or felt pain in.

It is **not medical illustration.** It is not detailed enough for a
physiotherapist marking a specific ligament, a chiropractor annotating vertebral
levels, or a doctor documenting a finding. Do not market it to those audiences
on the strength of this pack alone.

---

## Not delivered

| Pack | Status | Why |
|---|---|---|
| 3 — Skeleton | ❌ none | No permissively licensed skeletal geometry on npm. Needs Wikimedia (blocked). |
| 4 — Joints | ❌ none | Same. |
| 5 — Ligaments (ACL/PCL/MCL/LCL/meniscus/rotator cuff) | ❌ none | Same. These are the hardest to source free — most quality versions are commercial. |
| 6 — Rehab (trigger points, ROM, pain maps) | ❌ none | Trigger-point charts are almost universally copyrighted (Travell & Simons derivatives). Budget for licensing. |
| 7 — Exercise diagrams (squat, bench, deadlift…) | ❌ none | No free vector source found. See purchase options. |

Directories for all of these exist under `public/anatomy/` and the manifest
lists them under `coverage.empty`, so dropping assets in requires **no code
change** — regenerate the manifest and they appear in the picker.

### Rejected sources

| Source | Reason rejected |
|---|---|
| `react-muscle-map` (Unlicense/PD) | Exercise→muscle **metadata** only, no artwork. Useful later for tagging, not for overlays. |
| `@oncojs/sapien` (Apache-2.0) | Organ map for oncology; wrong domain, no musculoskeletal content. |
| Freepik / Flaticon anatomy sets | Free tier forbids commercial use without a paid plan; attribution terms incompatible with white-label SaaS. |
| Anatomography / BodyParts3D | CC BY-**SA**. Share-alike is a real hazard here: a trainer exporting an annotated PNG arguably creates a derivative that must then be licensed CC BY-SA. Avoid share-alike anywhere users export documents. |

---

## Recommended next step — free routes first

These need one person with unrestricted internet, not a purchase.

1. **Gray's Anatomy (1918)** — **public domain**, no attribution required, no
   restrictions. ~1,200 plates on Wikimedia Commons covering skeleton, joints,
   ligaments and muscles in detail. This alone can fill Packs 3–5. The look is
   19th-century engraving, which reads as credible and clinical.
2. **OpenStax Anatomy & Physiology** — **CC BY 4.0** (attribution only, no
   share-alike). Modern, clean, full-colour medical illustration. Commercial use
   explicitly permitted.
3. **Servier Medical Art** (smart.servier.com) — **CC BY 3.0/4.0**, ~3,000
   medical illustrations including joints and skeletal parts, designed for
   reuse and already vectorised.

All three are attribution-only and share-alike-free, which is exactly the
licence shape this product needs.

## Paid options — only if the free routes are rejected

| Vendor | Indicative price | Licence | Advantage | Free alternative |
|---|---|---|---|---|
| BioDigital Human | Subscription, quote-based | Commercial API | Interactive 3D, medically reviewed | OpenStax (static) |
| Complete Anatomy (3D4Medical) | Per-seat subscription | Not redistributable in SaaS | Best-in-class quality | — (licence unsuitable) |
| Adobe Stock / Shutterstock medical vectors | ~$10–30 per asset, or subscription | Extended/enhanced licence needed for SaaS redistribution | Exercise-form diagrams (Pack 7) | None found free |
| Primal Pictures | Enterprise, quote-based | Commercial | Clinical-grade, physio-oriented | Gray's Anatomy (PD) |

**Prices are indicative and change — confirm current terms before purchasing.**
For a SaaS that redistributes artwork to end users, verify the licence covers
*redistribution*, not just internal use; standard stock licences frequently do
not.

---

## How to add artwork

1. Drop files into the matching `public/anatomy/<category>/` directory.
2. Add an entry to the generator (or extend it to scan the directory).
3. `npm run build:anatomy` to regenerate the manifest.
4. Record the licence in `ATTRIBUTION.md`.

The picker is manifest-driven, so new assets appear with no component change.

**Every asset must carry `license`, `author`, `source`, `commercial_use` and
`attribution_required` in the manifest.** That record is what makes a licence
claim auditable later — a folder of images with no provenance is a liability,
not an asset.
