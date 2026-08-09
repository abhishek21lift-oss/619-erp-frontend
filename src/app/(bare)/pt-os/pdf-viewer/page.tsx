'use client';

// A standalone PDF viewer, opened in its own tab/window (e.g. via
// window.open(...) from a "Download PDF" button elsewhere in the app).
//
// Why this exists rather than just window.open(pdfUrl, '_blank'): letting the
// browser handle the raw PDF URL directly means whatever Share/Download
// affordance appears is entirely up to that browser/OS's own PDF viewer chrome
// — and on several real devices (notably installed PWAs and some in-app
// browsers) that chrome has no visible Share or Download control at all. This
// page fetches the PDF itself and renders its OWN Download and Share buttons,
// so the affordance exists regardless of what surrounding browser chrome does
// or doesn't provide.
//
// The PDF is fetched as a blob (not just pointed to via <iframe src={pdfUrl}>)
// for two reasons: the iframe needs SOME src, and fetching it ourselves means
// the exact same bytes back the Download button, the Share button and the
// preview — one fetch, one source of truth, rather than the preview and the
// download racing to independently agree on the file's current content.
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Download, Share2, Loader2, AlertTriangle, FileText } from 'lucide-react';
import Guard from '@/components/Guard';
import { useToast } from '@/lib/toast';

function safeFilename(title: string): string {
  const cleaned = title.trim().replace(/[^a-z0-9\-_ ]+/gi, '').replace(/\s+/g, '-');
  return `${cleaned || 'document'}.pdf`;
}

// iOS's WKWebView — used by installed home-screen PWAs and most in-app
// browsers (unlike full mobile Safari) — silently fails to render a PDF
// given to it via <iframe src="blob:...">: no error, just a blank frame.
// There's no reliable feature-detect for that failure (it doesn't fire
// onerror), so we detect the standalone/WKWebView context up front and
// skip the iframe there entirely rather than let it hang blank.
function isLikelyBrokenPdfIframeHost(): boolean {
  if (typeof window === 'undefined') return false;
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  return Boolean(standalone);
}

function PdfViewerScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const url = params.get('url') || '';
  const title = params.get('title') || 'Document';

  const [blob, setBlob] = useState<Blob | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [skipInlinePreview] = useState(isLikelyBrokenPdfIframeHost);

  useEffect(() => {
    if (!url) { setError('No document was specified.'); setLoading(false); return; }
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      try {
        // Relative — the same proxy that already serves /uploads/* to the
        // frontend origin, so the session cookie travels with this request
        // exactly as it would for an <img> or <iframe> pointed at the same URL.
        const res = await fetch(url, { credentials: 'include' });
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'This document could not be found.' : 'Could not load the document.');
        }
        const b = await res.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setBlobUrl(objectUrl);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load the document.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  const filename = safeFilename(title);

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // Only offer Share where it can plausibly do something useful — hiding it
  // entirely on a browser without the API is better than a button that always
  // fails. iOS Safari (15+) and most Android browsers support file sharing;
  // desktop Chrome/Firefox largely do not, which is fine — Download covers them.
  const shareSupported = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleShare = async () => {
    if (!blob) return;
    setSharing(true);
    try {
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title });
      } else {
        // Can't share the file itself on this browser — share the link
        // instead of silently doing nothing.
        await navigator.share({ title, url: window.location.href });
      }
    } catch (e) {
      // AbortError = the user closed the share sheet without picking
      // anything — that is a cancellation, not a failure worth a toast.
      if (e instanceof Error && e.name !== 'AbortError') {
        toast.error('Could not share the document.');
      }
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col" style={{ background: 'var(--bg-canvas)' }}>
      <div
        className="flex items-center justify-between gap-3 px-4 py-3"
        style={{
          borderBottom: '1px solid var(--border)', background: 'var(--bg-elevated)',
          paddingTop: 'max(env(safe-area-inset-top), 0.75rem)',
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <button
            onClick={() => router.back()} aria-label="Back"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition hover:bg-[var(--bg-hover)]"
          >
            <ArrowLeft size={16} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <p className="truncate text-[14px] font-[700]" style={{ color: 'var(--text-primary)' }}>{title}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {shareSupported && (
            <button
              onClick={handleShare} disabled={!blob || sharing}
              className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[700] transition disabled:opacity-50"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Share
            </button>
          )}
          <button
            onClick={handleDownload} disabled={!blobUrl}
            className="flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[12.5px] font-[700] text-white transition disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            <Download size={14} />
            Download
          </button>
        </div>
      </div>

      <div className="relative flex-1">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
          </div>
        )}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <AlertTriangle size={26} style={{ color: 'var(--danger)' }} />
            <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>{error}</p>
          </div>
        )}
        {!error && blobUrl && skipInlinePreview && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <FileText size={32} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[13.5px]" style={{ color: 'var(--text-secondary)' }}>
              Preview isn&apos;t available here. Use Download or Share above to open the PDF.
            </p>
            <button
              onClick={handleDownload}
              className="flex h-9 items-center gap-1.5 rounded-full px-4 text-[12.5px] font-[700] text-white transition"
              style={{ background: 'var(--brand)' }}
            >
              <Download size={14} />
              Download
            </button>
          </div>
        )}
        {!error && blobUrl && !skipInlinePreview && (
          <iframe src={blobUrl} title={title} className="h-full w-full" style={{ border: 'none' }} />
        )}
      </div>
    </div>
  );
}

export default function PdfViewerPage() {
  return (
    <Guard>
      <Suspense fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <Loader2 size={28} className="animate-spin" style={{ color: 'var(--brand)' }} />
        </div>
      }>
        <PdfViewerScreen />
      </Suspense>
    </Guard>
  );
}
