// The platform's MPTS Knowledge tab.
//
// The corpus here is not one studio's documents: approving a document makes it
// a generation source for every studio. The tab therefore has to show the two
// states that decide that — ingestion and approval — and must not offer
// Approve while ingestion is still running, because the server refuses it.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import type { PlatformKnowledgeDocument } from '@/lib/api/endpoints/platform';

const list = vi.fn();
const upload = vi.fn();
const approve = vi.fn();
const revoke = vi.fn();
const reindex = vi.fn();
const remove = vi.fn();
const toastSuccess = vi.fn();
const toastError = vi.fn();
const toastApi = { success: toastSuccess, error: toastError, info: vi.fn(), warning: vi.fn() };

vi.mock('@/lib/api', () => ({
  api: {
    superAdmin: {
      knowledge: {
        list: (...a: unknown[]) => list(...a),
        upload: (...a: unknown[]) => upload(...a),
        approve: (...a: unknown[]) => approve(...a),
        revoke: (...a: unknown[]) => revoke(...a),
        reindex: (...a: unknown[]) => reindex(...a),
        delete: (...a: unknown[]) => remove(...a),
      },
    },
  },
}));

vi.mock('@/lib/toast', () => ({
  // Stable identity, like the real memoised context: a new object every render
  // would re-create `load` and re-run its effect in an endless loop.
  useToast: () => ({ toast: toastApi }),
}));

import KnowledgeTab from '@/app/(platform)/platform/_tabs/KnowledgeTab';

function doc(over: Partial<PlatformKnowledgeDocument> = {}): PlatformKnowledgeDocument {
  return {
    id: 'doc-1',
    title: 'MPTS Training Methodology',
    source_version: '2026.1',
    category: 'guide',
    filename: 'methodology.pdf',
    mime_type: 'application/pdf',
    file_size_bytes: 2048,
    content_hash: 'abc',
    status: 'ready',
    error_message: null,
    chunk_count: 12,
    approval_status: 'approved',
    approved_by: 'user-1',
    approved_at: '2026-10-01T00:00:00.000Z',
    created_at: '2026-10-01T00:00:00.000Z',
    is_active: true,
    ...over,
  };
}

beforeEach(() => {
  list.mockReset();
  upload.mockReset();
  approve.mockReset();
  revoke.mockReset();
  reindex.mockReset();
  remove.mockReset();
  toastSuccess.mockReset();
  toastError.mockReset();
});
afterEach(() => cleanup());

describe('MPTS Knowledge tab', () => {
  it('shows the live corpus version and every document with its approval state', async () => {
    list.mockResolvedValue({
      data: [
        doc(),
        doc({ id: 'doc-2', title: 'Nutrition Guide', approval_status: 'pending', is_active: false }),
      ],
      corpus_version: 'mpts-v20261001120000-n2',
    });

    render(<KnowledgeTab />);

    expect(await screen.findByText('MPTS Training Methodology')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Guide')).toBeInTheDocument();
    expect(screen.getByText(/mpts-v20261001120000-n2/)).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText('Pending review')).toBeInTheDocument();
  });

  it('will not offer to approve a document that has not finished ingesting', async () => {
    list.mockResolvedValue({
      data: [doc({ status: 'processing', approval_status: 'pending', is_active: false })],
      corpus_version: 'mpts-v0',
    });

    render(<KnowledgeTab />);

    expect(await screen.findByRole('button', { name: 'Approve' })).toBeDisabled();
  });

  it('approves a ready document and reloads the corpus', async () => {
    list.mockResolvedValue({
      data: [doc({ approval_status: 'pending', is_active: false })],
      corpus_version: 'mpts-v0',
    });
    approve.mockResolvedValue({ data: doc(), corpus_version: 'mpts-v1' });

    render(<KnowledgeTab />);
    fireEvent.click(await screen.findByRole('button', { name: 'Approve' }));

    await waitFor(() => expect(approve).toHaveBeenCalledWith('doc-1'));
    expect(toastSuccess).toHaveBeenCalled();
    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
  });

  it('asks before revoking a live document', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    list.mockResolvedValue({ data: [doc()], corpus_version: 'mpts-v1' });
    revoke.mockResolvedValue({ data: doc({ approval_status: 'revoked', is_active: false }), corpus_version: 'mpts-v2' });

    render(<KnowledgeTab />);
    fireEvent.click(await screen.findByRole('button', { name: 'Revoke' }));

    expect(confirm).toHaveBeenCalled();
    await waitFor(() => expect(revoke).toHaveBeenCalledWith('doc-1'));
  });

  it('uploads a file with its title, category and source version', async () => {
    list.mockResolvedValue({ data: [], corpus_version: 'mpts-v0' });
    upload.mockResolvedValue({ data: doc() });

    render(<KnowledgeTab />);
    expect(await screen.findByText(/no corpus documents yet/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /upload document/i }));
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'MPTS Methodology' } });
    fireEvent.change(screen.getByLabelText(/source version/i), { target: { value: '2026.1' } });

    const file = new File(['Phase 1: assessment methodology text.'], 'methodology.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText(/file/i), { target: { files: [file] } });
    expect(await screen.findByText('methodology.txt')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

    await waitFor(() =>
      expect(upload).toHaveBeenCalledWith(file, 'MPTS Methodology', 'sop', '2026.1'),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });
});
