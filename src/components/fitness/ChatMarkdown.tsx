'use client';

// Renders an AI message as markdown instead of raw text.
//
// Before this, coach replies were dumped into a <p> with white-space:pre-wrap,
// so a perfectly normal model response came out as literal "**Prakhar Sharma**"
// with the asterisks visible, numbered lists ran together, and tables were
// unreadable pipe soup. Models emit markdown by default; rendering it is not a
// nice-to-have.
//
// Every element is styled explicitly rather than inheriting a prose stylesheet,
// because this renders on two very different surfaces: the dark slide-over
// panel (fixed dark palette) and the themed page (light/dark CSS vars). `tone`
// picks which. Colours come from the same tokens the rest of the app uses so a
// coach reply never looks pasted in from another product.

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

type Tone = 'dark' | 'themed';

interface ChatMarkdownProps {
  content: string;
  /** 'dark' = fixed light-on-dark (slide-over panel). 'themed' = CSS vars. */
  tone?: Tone;
  /** Base font size in px; list/paragraph text inherits it. */
  size?: number;
}

const PALETTES = {
  dark: {
    text: 'rgba(255,255,255,0.86)',
    heading: 'rgba(255,255,255,0.95)',
    muted: 'rgba(255,255,255,0.55)',
    border: 'rgba(255,255,255,0.12)',
    codeBg: 'rgba(255,255,255,0.08)',
    codeText: '#b8d7ff',
    blockBg: 'rgba(0,0,0,0.28)',
    link: '#7fb4ff',
    thBg: 'rgba(255,255,255,0.06)',
  },
  themed: {
    text: 'var(--text-secondary)',
    heading: 'var(--text-primary)',
    muted: 'var(--text-muted)',
    border: 'var(--border)',
    codeBg: 'var(--bg-subtle)',
    codeText: '#0067e0',
    blockBg: 'var(--bg-subtle)',
    link: '#0067e0',
    thBg: 'var(--bg-subtle)',
  },
} as const;

export function ChatMarkdown({ content, tone = 'dark', size = 13 }: ChatMarkdownProps) {
  const c = PALETTES[tone];

  const components: Components = {
    p: ({ children }) => (
      <p style={{ margin: '0 0 8px', fontSize: size, lineHeight: 1.55, color: c.text }}>{children}</p>
    ),
    strong: ({ children }) => <strong style={{ fontWeight: 750, color: c.heading }}>{children}</strong>,
    em: ({ children }) => <em style={{ fontStyle: 'italic' }}>{children}</em>,
    h1: ({ children }) => <h3 style={{ margin: '10px 0 6px', fontSize: size + 3, fontWeight: 800, color: c.heading }}>{children}</h3>,
    h2: ({ children }) => <h4 style={{ margin: '10px 0 6px', fontSize: size + 2, fontWeight: 780, color: c.heading }}>{children}</h4>,
    h3: ({ children }) => <h5 style={{ margin: '9px 0 5px', fontSize: size + 1, fontWeight: 760, color: c.heading }}>{children}</h5>,
    h4: ({ children }) => <h6 style={{ margin: '8px 0 4px', fontSize: size, fontWeight: 740, color: c.heading }}>{children}</h6>,
    ul: ({ children }) => <ul style={{ margin: '0 0 8px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ul>,
    ol: ({ children }) => <ol style={{ margin: '0 0 8px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 3 }}>{children}</ol>,
    li: ({ children }) => <li style={{ fontSize: size, lineHeight: 1.5, color: c.text }}>{children}</li>,
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer"
        style={{ color: c.link, textDecoration: 'underline', textUnderlineOffset: 2 }}>{children}</a>
    ),
    blockquote: ({ children }) => (
      <blockquote style={{ margin: '0 0 8px', paddingLeft: 10, borderLeft: `2px solid ${c.border}`, color: c.muted }}>{children}</blockquote>
    ),
    hr: () => <hr style={{ border: 'none', borderTop: `1px solid ${c.border}`, margin: '10px 0' }} />,
    code: ({ className, children }) => {
      // react-markdown v9 gives fenced blocks a `language-*` class; inline
      // code has none. Distinguishing them matters — an inline snippet
      // styled as a block breaks the sentence it sits in.
      const isBlock = Boolean(className?.startsWith('language-'));
      if (isBlock) {
        return (
          <code style={{ display: 'block', fontSize: size - 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: c.text, whiteSpace: 'pre' }}>
            {children}
          </code>
        );
      }
      return (
        <code style={{ padding: '1px 5px', borderRadius: 5, background: c.codeBg, color: c.codeText, fontSize: size - 1.5, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      // overflowX so a long code line scrolls inside the bubble instead of
      // widening it (and the whole chat column) past the viewport.
      <pre style={{ margin: '0 0 8px', padding: '9px 11px', borderRadius: 9, background: c.blockBg, border: `1px solid ${c.border}`, overflowX: 'auto' }}>
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '0 0 8px' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: size - 1 }}>{children}</table>
      </div>
    ),
    th: ({ children }) => (
      <th style={{ padding: '5px 8px', border: `1px solid ${c.border}`, background: c.thBg, color: c.heading, fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{children}</th>
    ),
    td: ({ children }) => (
      <td style={{ padding: '5px 8px', border: `1px solid ${c.border}`, color: c.text }}>{children}</td>
    ),
  };

  return (
    <div className="chat-markdown" style={{ minWidth: 0 }}>
      {/* remark-gfm adds tables, strikethrough and task lists — all of which
          models emit routinely and base markdown does not cover. */}
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default ChatMarkdown;
