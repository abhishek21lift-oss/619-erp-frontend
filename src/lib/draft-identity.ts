// A restored draft never brings back WHO the form is about.
//
// The Informed Consent and PAR-Q forms copy the client's identity (name, DOB,
// mobile, email, emergency contact, address) from the client profile, and
// those fields are read-only there — the profile is where they are edited.
// The local draft is merged on top of that fresh copy, so a draft saved
// before the profile was corrected put the OLD name or number back, read-only
// and uncorrectable, and it was submitted into the signed record.
//
// So the profile's identity is laid over the draft, last: everything else the
// trainer typed is restored, and identity always comes from the profile as it
// is now. With no profile loaded (the request failed) there is nothing to lay
// over and the draft's values stand, which is what the trainer typed.

export function restoreKeepingIdentity<T extends object>(base: T, draft: Partial<T> | null, identity: Partial<T> | null): T {
  return { ...base, ...(draft ?? {}), ...(identity ?? {}) };
}
