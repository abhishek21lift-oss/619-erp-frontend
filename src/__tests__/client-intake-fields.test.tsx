// The new-client intake form, after the field changes.
//
// Four changes, each with a way to get it silently wrong:
//   · "Emergency Contact" / "Emergency Number" became "Emergency Contact
//     Name" / "Emergency Contact Number" — a label change that must not move
//     the payload keys, or the numbers stop arriving and nobody finds out
//     until somebody needs one.
//   · Occupation became Relationship. Occupation was unconditionally required;
//     the emergency contact it now describes is optional, so requiring it
//     unconditionally would make the operator state a relationship to nobody.
//   · Address stopped being required.
//   · Client Source is new, closed-set, and has to reach the API.
//
// The form is rendered and driven, and the API call is inspected. Reading the
// file for the string "Client Source" would pass just as happily on a field
// that renders and never submits.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CLIENT_SOURCES, RELATIONSHIPS } from '@/lib/client-intake';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), replace: vi.fn() }),
  usePathname: () => '/pt-os/new-client',
}));

vi.mock('@/components/Guard', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const create = vi.fn(async () => ({ data: { id: 'new-id' } }));
vi.mock('@/lib/api', () => ({
  api: {
    pt: {
      create: (...args: unknown[]) => create(...args),
      uploadPhoto: vi.fn(),
    },
  },
}));

const errorToast = vi.fn();
vi.mock('@/lib/toast', () => ({
  useToast: () => ({
    toast: { success: vi.fn(), error: errorToast, info: vi.fn(), warning: vi.fn() },
  }),
}));

// No imported sheet, so the autofill banner and its lookup stay out of the way.
vi.mock('@/lib/sheet-import', () => ({
  getSheetCacheSync: () => null,
  lookupByMobile: () => null,
}));

// The crop modal pulls in canvas work jsdom has no answer for, and no test
// here touches the photo.
vi.mock('@/components/pt-os/PhotoCropModal', () => ({ default: () => null }));

import NewPTClientPage from '@/app/(chrome)/pt-os/new-client/page';

const type = (field: RegExp, value: string) =>
  fireEvent.change(screen.getByLabelText(field), { target: { value } });

/** Fills the three genuinely required fields and nothing else. */
function fillMinimum() {
  type(/^full name/i, 'Anaya Rao');
  fireEvent.click(screen.getByRole('button', { name: 'Female' }));
  type(/^contact number/i, '9876543210');
}

/** Picks `option` out of the SearchableSelect labelled `label`. */
async function pick(label: string, option: string) {
  fireEvent.click(screen.getByRole('button', { name: label }));
  fireEvent.click(await screen.findByRole('button', { name: option }));
}

const submit = () => fireEvent.click(screen.getByRole('button', { name: /create client/i }));

/** The body of the single api.pt.create call. */
const payload = () => create.mock.calls[0][0] as Record<string, unknown>;

beforeEach(() => {
  create.mockClear();
  errorToast.mockClear();
  window.localStorage.clear();
});

describe('the emergency contact fields', () => {
  it('are labelled Emergency Contact Name and Emergency Contact Number', () => {
    render(<NewPTClientPage />);
    expect(screen.getByLabelText(/emergency contact name/i)).toBeTruthy();
    expect(screen.getByLabelText(/emergency contact number/i)).toBeTruthy();
  });

  it('still post to emergency_contact and emergency_phone', async () => {
    // The label changed; the columns did not. If the rename had reached the
    // payload keys the backend would drop both without erroring.
    render(<NewPTClientPage />);
    fillMinimum();
    type(/emergency contact name/i, 'Meera Rao');
    type(/emergency contact number/i, '9812345678');
    await pick('Relationship', 'Mother');
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().emergency_contact).toBe('Meera Rao');
    expect(payload().emergency_phone).toBe('9812345678');
  });
});

describe('Relationship, which replaced Occupation', () => {
  it('is on the form and Occupation is not', () => {
    render(<NewPTClientPage />);
    expect(screen.getByRole('button', { name: 'Relationship' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Occupation' })).toBeNull();
  });

  it('posts as emergency_contact_relationship, and no occupation is sent', async () => {
    render(<NewPTClientPage />);
    fillMinimum();
    type(/emergency contact name/i, 'Meera Rao');
    await pick('Relationship', 'Spouse');
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().emergency_contact_relationship).toBe('Spouse');
    expect(payload().occupation).toBeUndefined();
  });

  it('is not required when there is no emergency contact to relate to', async () => {
    // Occupation was required unconditionally. Carrying that over would block
    // a signup on a question about a person the operator never named.
    render(<NewPTClientPage />);
    fillMinimum();
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().emergency_contact_relationship).toBeUndefined();
  });

  it('is required once an emergency contact is named', async () => {
    // A name and a number with no relationship is the state this field exists
    // to prevent: in an emergency the trainer has somebody to call and no idea
    // who they are.
    render(<NewPTClientPage />);
    fillMinimum();
    type(/emergency contact name/i, 'Meera Rao');
    submit();

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText(/how this person is related/i)).toBeTruthy();
  });

  it('is required when only a number was given', async () => {
    render(<NewPTClientPage />);
    fillMinimum();
    type(/emergency contact number/i, '9812345678');
    submit();

    await waitFor(() => expect(errorToast).toHaveBeenCalled());
    expect(create).not.toHaveBeenCalled();
  });
});

describe('Address', () => {
  it('no longer carries a required marker', () => {
    render(<NewPTClientPage />);
    // FloatInput renders the asterisk inside the field's own label element,
    // so this asks the rendered label, not the file.
    const address = screen.getByLabelText(/^address/i);
    const label = address.closest('div')?.querySelector('label');
    expect(label?.textContent).not.toContain('*');
  });

  it('lets a client be created without one', async () => {
    render(<NewPTClientPage />);
    fillMinimum();
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().address).toBeUndefined();
  });
});

describe('Client Source', () => {
  it('offers exactly the eight channels, and no others', () => {
    // The list is shared with the client edit form and mirrored by the
    // backend's CLIENT_SOURCES, which rejects anything outside it with a 400.
    expect([...CLIENT_SOURCES]).toEqual([
      'Walk-in', 'Instagram', 'WhatsApp', 'Referral',
      'Existing Member', 'Google', 'Website', 'Other',
    ]);
  });

  it('reaches the API as client_source', async () => {
    render(<NewPTClientPage />);
    fillMinimum();
    await pick('Client Source', 'Instagram');
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().client_source).toBe('Instagram');
  });

  it('is optional — an unanswered channel sends nothing', async () => {
    render(<NewPTClientPage />);
    fillMinimum();
    submit();

    await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
    expect(payload().client_source).toBeUndefined();
  });

  it('takes no freeform value — the closed set is what makes it groupable', async () => {
    render(<NewPTClientPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Client Source' }));
    fireEvent.change(await screen.findByLabelText(/search client source/i), { target: { value: 'Facebook' } });
    expect(screen.queryByText(/Use "Facebook"/)).toBeNull();
  });

  it('offers a freeform value for Relationship, which is a suggestion list', async () => {
    // The deliberate asymmetry: family structures do not fit twelve options,
    // and nothing groups a report by this column.
    render(<NewPTClientPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Relationship' }));
    fireEvent.change(await screen.findByLabelText(/search relationship/i), { target: { value: 'Neighbour' } });
    expect(await screen.findByText(/Use "Neighbour"/)).toBeTruthy();
  });
});

describe('the option lists are shared, not copied', () => {
  it('gives Relationship a list with the common cases in it', () => {
    for (const r of ['Spouse', 'Mother', 'Father', 'Friend']) {
      expect([RELATIONSHIPS.includes(r as never), r]).toEqual([true, r]);
    }
  });
});
