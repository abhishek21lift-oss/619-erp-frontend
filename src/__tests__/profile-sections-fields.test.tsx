/**
 * The profile's list-row editors, as fields.
 *
 * Every control in these rows used to be a bare `<input>` with a placeholder
 * and no label — which names nothing for a screen reader and disappears the
 * moment anyone types. The only feedback on a bad value was the server
 * refusing the whole profile from a bar at the bottom of the page.
 *
 * These tests pin the contract that replaced it: a real label bound by
 * `htmlFor`, `aria-invalid` when the schema found a problem, and the message
 * reachable through `aria-describedby` from the input that caused it.
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EducationSection } from '@/components/profile/EducationSection';
import { AchievementsSection } from '@/components/profile/AchievementsSection';
import { ProfessionalSection, WorkingHoursEditor } from '@/components/profile/ProfessionalSection';
import type { ProfileAchievement, ProfileEducation, ProfileGym } from '@/lib/api';

/** The message a control points at through aria-describedby. */
function describedText(control: HTMLElement): string {
  const ids = (control.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
  return ids
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

const edu: ProfileEducation = {
  id: 'e1', institution: 'K11 Academy', degree: 'Diploma', field: 'Nutrition', year: 12,
};
const ach: ProfileAchievement = {
  id: 'a1', title: 'National championship', kind: 'competition',
  issuer: 'IPF', year: 1, detail: '',
};
const gym: ProfileGym = {
  id: 'g1', name: 'Gold 24/7', role: 'Head Coach', from: '2021-06', to: '2020-01',
};

describe('EducationSection', () => {
  it('names the institution input, which used to have only a placeholder', () => {
    render(<EducationSection value={[edu]} onChange={() => {}} />);
    expect(screen.getByLabelText('Institution')).toHaveValue('K11 Academy');
  });

  it('puts the year message on the year input', () => {
    render(
      <EducationSection
        value={[edu]} onChange={() => {}}
        issues={{ 'education.0.year': 'Year must be between 1900 and 2027.' }}
      />,
    );
    const year = screen.getByLabelText('Year');
    expect(year).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(year)).toBe('Year must be between 1900 and 2027.');
  });

  it('leaves the other inputs in the row unmarked', () => {
    render(
      <EducationSection
        value={[edu]} onChange={() => {}}
        issues={{ 'education.0.year': 'Year must be between 1900 and 2027.' }}
      />,
    );
    expect(screen.getByLabelText('Institution')).not.toHaveAttribute('aria-invalid');
    expect(screen.getByLabelText('Qualification')).not.toHaveAttribute('aria-invalid');
  });

  it('strips anything that is not a digit out of the year', () => {
    const onChange = vi.fn();
    render(<EducationSection value={[{ ...edu, year: null }]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '20e6x' } });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ year: 206 })]);
    // 206 is not a year, and that is the point: the control does not decide.
    // Nothing has been sent; the schema refuses it at submit, on this input.
  });

  it('clears the year rather than storing zero when the box is emptied', () => {
    // `Number('')` is 0, and a stored year of 0 is a date nobody can correct
    // from the UI.
    const onChange = vi.fn();
    render(<EducationSection value={[edu]} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Year'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith([expect.objectContaining({ year: null })]);
  });

  it('does not use type=number, so a scroll wheel cannot change a year', () => {
    render(<EducationSection value={[edu]} onChange={() => {}} />);
    const year = screen.getByLabelText('Year');
    expect(year).toHaveAttribute('type', 'text');
    expect(year).toHaveAttribute('inputMode', 'numeric');
  });
});

describe('AchievementsSection', () => {
  it('names the title input', () => {
    render(<AchievementsSection value={[ach]} onChange={() => {}} />);
    expect(screen.getByLabelText('Achievement')).toHaveValue('National championship');
  });

  it('puts the year message on the year input', () => {
    render(
      <AchievementsSection
        value={[ach]} onChange={() => {}}
        issues={{ 'achievements.0.year': 'Year must be between 1900 and 2027.' }}
      />,
    );
    expect(screen.getByLabelText('Year')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ProfessionalSection', () => {
  it('names the gym input and marks the month the schema rejected', () => {
    render(
      <ProfessionalSection
        designation="" coachingModes={[]} previousGyms={[gym]} set={() => {}}
        issues={{ 'previousGyms.0.to': 'This is before the start month.' }}
      />,
    );
    expect(screen.getByLabelText('Gym or studio')).toHaveValue('Gold 24/7');
    const to = screen.getByLabelText('To');
    expect(to).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(to)).toBe('This is before the start month.');
    expect(screen.getByLabelText('From')).not.toHaveAttribute('aria-invalid');
  });

  it('does not hard-cap the designation, which would eat a paste silently', () => {
    // The platform's deliberate choice: no `maxLength` on the element, because
    // a hard cap drops the tail of a paste with no message. The schema reports
    // the overshoot instead — see profile-schema.test.ts — and the count above
    // the field shows it while the text is still editable.
    render(
      <ProfessionalSection
        designation={'x'.repeat(200)} coachingModes={[]} previousGyms={[]} set={() => {}}
        issues={{ designation: 'Keep the designation under 120 characters.' }}
      />,
    );
    const field = screen.getByLabelText('Designation');
    expect(field).not.toHaveAttribute('maxLength');
    expect(field).toHaveValue('x'.repeat(200));
    expect(field).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('WorkingHoursEditor', () => {
  it('marks the empty side of a half-filled range', () => {
    render(
      <WorkingHoursEditor
        value={{ mon: [{ from: '06:00', to: '' }] }}
        onChange={() => {}} weeklyMinutes={0}
        issues={{ 'workingHours.mon.0.to': 'Set an end time, or remove this row.' }}
      />,
    );
    const end = screen.getByLabelText('Monday end');
    expect(end).toHaveAttribute('aria-invalid', 'true');
    expect(describedText(end)).toBe('Set an end time, or remove this row.');
    expect(screen.getByLabelText('Monday start')).not.toHaveAttribute('aria-invalid');
  });

  it('keeps both sides of the pair named, on one line', () => {
    render(
      <WorkingHoursEditor
        value={{ tue: [{ from: '06:00', to: '10:00' }] }}
        onChange={() => {}} weeklyMinutes={240}
      />,
    );
    expect(screen.getByLabelText('Tuesday start')).toHaveValue('06:00');
    expect(screen.getByLabelText('Tuesday end')).toHaveValue('10:00');
  });
});
