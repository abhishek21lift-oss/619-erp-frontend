import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { STEPS, visibleSteps, nextStepId } from '@/components/pt-os/parq/types';

// The PAR-Q intake flow: questionnaire → … → Digital Consent → submitted →
// Goal Setting.
//
// Two of these are easy to undo by accident and would not fail anything else:
//
//   · re-adding a step after Digital Consent silently turns its "Submit"
//     button back into "Next", because the label is derived from
//     `nextStepId(step) == null` rather than written out. Nothing about the
//     button would look wrong in the diff.
//   · the post-submit button's destination is a string in a router.push, so a
//     typo or a revert points a completed screening back at a list instead of
//     forward to the next task.

const SRC = path.join(__dirname, '..');
/**
 * Strip comments before matching source.
 *
 * Three separate guards in this repo have now been fooled by their own
 * explanation: a comment that QUOTES the thing it removed reads, to a raw
 * regex, exactly like the thing still being there. `page.tsx` documents why
 * the `stepDef.key !== 'review'` exclusion went away, and a raw check for
 * that string finds the sentence saying it is gone.
 */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const parqPageRaw = fs.readFileSync(
  path.join(SRC, 'app/(chrome)/pt-os/parq/page.tsx'), 'utf8',
);
const parqPage = stripComments(parqPageRaw);

describe('Digital Consent is the last step, so its button says Submit', () => {
  it('has no step after consent', () => {
    const last = STEPS[STEPS.length - 1];
    expect(last.key).toBe('consent');
  });

  it('reports consent as the final step for every risk level', () => {
    // Medical Clearance is conditional on high risk, so "last" has to hold on
    // both the short and the long path.
    for (const risk of ['low', 'medium', 'high'] as const) {
      const vis = visibleSteps(risk);
      expect(vis[vis.length - 1].key).toBe('consent');
      const consentId = vis[vis.length - 1].id;
      // This is exactly what drives the button label.
      expect(nextStepId(consentId, risk)).toBeNull();
    }
  });

  it('still shows Medical Clearance only for high risk', () => {
    // Removing the review step must not disturb the conditional one.
    expect(visibleSteps('low').some((s) => s.key === 'medicalClearance')).toBe(false);
    expect(visibleSteps('high').some((s) => s.key === 'medicalClearance')).toBe(true);
  });

  it('derives the label rather than hardcoding it', () => {
    expect(parqPage).toMatch(/isLastStep \? 'Submit' : 'Next'/);
    expect(parqPage).toMatch(/const isLastStep = nextStepId\(step, riskLevel\) == null/);
  });
});

describe('the review step is gone', () => {
  it('is absent from the step list', () => {
    // It restated answers one screen after they were given, and after the
    // signature that is the actual point of commitment.
    expect(STEPS.some((s) => (s as { key: string }).key === 'review')).toBe(false);
  });

  it('leaves no orphaned render branch or import', () => {
    expect(parqPage).not.toMatch(/ParqReview/);
    expect(parqPage).not.toMatch(/step === 6/);
  });

  it('deleted the component rather than leaving it unreferenced', () => {
    expect(fs.existsSync(path.join(SRC, 'components/pt-os/parq/ParqReview.tsx'))).toBe(false);
  });

  it('validates every remaining step into its own error slot', () => {
    // The old code skipped setErrors for `review`, which had no slot. With
    // that step gone the exclusion is gone too, and consent's validation is
    // now the last gate before submit.
    expect(parqPage).not.toMatch(/stepDef\.key !== 'review'/);
    expect(parqPage).toMatch(/setErrors\(\(e\) => \(\{ \.\.\.e, \[stepDef\.key\]: err \}\)\)/);
  });
});

describe('the submitted screen continues to Goal Setting', () => {
  it('navigates to the goals page carrying the same client', () => {
    // Goal Setting reads `client_id` from the query string, so the client has
    // to travel with the navigation or the trainer picks them a second time.
    expect(parqPage).toMatch(
      /router\.push\(`\/pt-os\/goals\?client_id=\$\{encodeURIComponent\(clientId\)\}`\)/,
    );
  });

  it('no longer sends the trainer back to the screening history', () => {
    expect(parqPage).not.toMatch(/Back to Screening History/);
    expect(parqPage).toMatch(/Continue to Goal Setting/);
  });

  it('passes the client id into the success screen', () => {
    // The button cannot build its link without it, and the wizard is the only
    // thing that knows it.
    expect(parqPage).toMatch(/function SubmitSuccess\(\{ clientId, clientName, result \}/);
    expect(parqPage).toMatch(/<SubmitSuccess\s+clientId=\{clientId\}/);
  });
});

describe('the Start Consent screen has a hero like its siblings', () => {
  const consentPage = stripComments(fs.readFileSync(
    path.join(SRC, 'app/(chrome)/pt-os/informed-consent/page.tsx'), 'utf8',
  ));

  it('renders a PageHero in the no-record state', () => {
    // It was the only screen in the intake sequence that opened on a bare
    // card. PAR-Q and Goal Setting both open on a hero.
    const noRecordBlock = consentPage.slice(
      consentPage.indexOf('if (!record) {'),
      consentPage.indexOf('return (\n    <ConsentSummary'),
    );
    expect(noRecordBlock).toMatch(/<PageHero/);
    expect(noRecordBlock).toMatch(/<PageContainer>/);
    expect(noRecordBlock).toMatch(/Start Consent/);
  });

  it('offers the action once, in the hero', () => {
    // The EmptyState used to carry its own identical button; two identical
    // primary actions on one screen is a choice the user should not have to
    // make.
    const noRecordBlock = consentPage.slice(
      consentPage.indexOf('if (!record) {'),
      consentPage.indexOf('return (\n    <ConsentSummary'),
    );
    expect((noRecordBlock.match(/Start Consent/g) ?? []).length).toBe(1);
  });
});
