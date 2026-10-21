/**
 * The portfolio upload dialog against a mocked API.
 *
 * The schema tests pin the field rules; this file pins the call site: the
 * valid text fields reach `portfolio.create` trimmed, a video cannot be
 * submitted without its link, the server's refusal stays visible, and
 * reopening starts clean.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/http';
import type { PortfolioItem } from '@/lib/api';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    profile: {
      portfolio: {
        list: mocks.list,
        create: mocks.create,
        update: vi.fn(),
        remove: vi.fn(),
        reorder: vi.fn(),
      },
    },
  },
  PORTFOLIO_LIMITS: {
    items: 30,
    pinned: 3,
    imageBytes: 8 * 1024 * 1024,
    posterBytes: 4 * 1024 * 1024,
  },
}));

vi.mock('@/lib/forms/files', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/forms/files')>();
  return {
    ...actual,
    // File bytes and dimensions have their own suite. This file is about the
    // form that wraps the picker.
    checkFile: vi.fn(async () => ({ ok: true as const })),
  };
});

import PortfolioSection from '@/components/profile/PortfolioSection';

function created(kind: PortfolioItem['kind'] = 'image'): PortfolioItem {
  return {
    id: 'portfolio-1',
    kind,
    title: 'Transformation',
    caption: '',
    url: '/uploads/front.jpg',
    afterUrl: null,
    externalUrl: null,
    bytes: 1,
    pinned: false,
    sortOrder: 0,
    createdAt: '2026-10-20T00:00:00.000Z',
  };
}

function image(name = 'front.jpg') {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], name, { type: 'image/png' });
}

function renderSection() {
  render(<PortfolioSection resolveUrl={(path) => `https://cdn.test${path}`} />);
}

async function openDialog() {
  renderSection();
  fireEvent.click(await screen.findByRole('button', { name: /add your first item/i }));
  await screen.findByRole('dialog');
}

async function pickFile(label: string, file: File) {
  fireEvent.change(screen.getByLabelText(label), { target: { files: [file] } });
  await waitFor(() => {
    expect(screen.getByRole('button', { name: new RegExp(`remove ${file.name}`, 'i') })).toBeInTheDocument();
  });
}

function submit() {
  fireEvent.click(screen.getByRole('button', { name: /add to portfolio/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([]);
  mocks.create.mockResolvedValue(created());

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:preview'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
});

describe('portfolio upload dialog', () => {
  it('sends trimmed text, ignores the absent video link, and closes', async () => {
    const file = image();
    await openDialog();
    await pickFile('Image', file);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '  Transformation  ' } });
    fireEvent.change(screen.getByLabelText(/caption/i), { target: { value: '  Twelve weeks  ' } });
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith({
      kind: 'image',
      file,
      after: undefined,
      externalUrl: undefined,
      title: 'Transformation',
      caption: 'Twelve weeks',
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('sends the video link for a video', async () => {
    const poster = image('poster.jpg');
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: /^video$/i }));
    await pickFile('Thumbnail', poster);
    fireEvent.change(screen.getByLabelText(/video link/i), {
      target: { value: '  https://youtu.be/abc  ' },
    });
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'video_link',
      file: poster,
      externalUrl: 'https://youtu.be/abc',
    }));
  });

  it('sends both images for a before/after', async () => {
    const before = image('before.jpg');
    const after = image('after.jpg');
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: /^before \/ after$/i }));
    await pickFile('Before', before);
    await pickFile('After', after);
    submit();

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({
      kind: 'before_after',
      file: before,
      after,
    }));
  });

  it('shows the required error and does not upload a video without a link', async () => {
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: /^video$/i }));
    await pickFile('Thumbnail', image('poster.jpg'));
    submit();

    expect(await screen.findByText('Video link is required.')).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('keeps the dialog and the text when the server refuses the upload', async () => {
    mocks.create.mockRejectedValue(
      new ApiError('Only YouTube and Vimeo links are supported', 400),
    );
    await openDialog();
    fireEvent.click(screen.getByRole('button', { name: /^video$/i }));
    await pickFile('Thumbnail', image('poster.jpg'));
    fireEvent.change(screen.getByLabelText(/video link/i), {
      target: { value: 'https://example.com/watch' },
    });
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Keep me' } });
    submit();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Only YouTube and Vimeo links are supported',
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('Keep me');
  });

  it('reopens with empty text and an image picker after a successful upload', async () => {
    await openDialog();
    await pickFile('Image', image());
    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: 'Transformation' } });
    submit();
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^add item$/i }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
    expect(screen.queryByLabelText(/video link/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove front\.jpg/i })).not.toBeInTheDocument();
  });
});
