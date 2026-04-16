import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const components = {
  p:      ({ node, ...p }) => <p style={{ margin: '0 0 8px' }} {...p} />,
  h1:     ({ node, ...p }) => <h1 style={{ fontSize: '14px', fontWeight: 800, margin: '10px 0 6px', color: '#e2e8f0' }} {...p} />,
  h2:     ({ node, ...p }) => <h2 style={{ fontSize: '13px', fontWeight: 800, margin: '10px 0 6px', color: '#e2e8f0' }} {...p} />,
  h3:     ({ node, ...p }) => <h3 style={{ fontSize: '12px', fontWeight: 800, margin: '8px 0 4px',  color: '#e2e8f0' }} {...p} />,
  h4:     ({ node, ...p }) => <h4 style={{ fontSize: '12px', fontWeight: 700, margin: '6px 0 2px',  color: '#cbd5e1' }} {...p} />,
  ul:     ({ node, ordered, ...p }) => <ul style={{ margin: '0 0 8px', paddingLeft: '20px' }} {...p} />,
  ol:     ({ node, ordered, ...p }) => <ol style={{ margin: '0 0 8px', paddingLeft: '20px' }} {...p} />,
  li:     ({ node, ordered, checked, ...p }) => <li style={{ marginBottom: '2px' }} {...p} />,
  strong: ({ node, ...p }) => <strong style={{ color: '#e2e8f0', fontWeight: 700 }} {...p} />,
  em:     ({ node, ...p }) => <em style={{ color: '#cbd5e1' }} {...p} />,
  a:      ({ node, ...p }) => <a style={{ color: '#60a5fa' }} target="_blank" rel="noopener noreferrer" {...p} />,
  code: ({ node, inline, className, children, ...p }) => inline
    ? <code style={{ background: '#0a0e17', padding: '1px 5px', borderRadius: '3px', fontSize: '11px', fontFamily: 'var(--mn)', color: '#60a5fa' }} {...p}>{children}</code>
    : <pre style={{ background: '#0a0e17', padding: '10px', borderRadius: '5px', overflow: 'auto', fontSize: '11px', fontFamily: 'var(--mn)', border: '1px solid #1e293b', margin: '6px 0' }}>
        <code className={className} {...p}>{children}</code>
      </pre>,
  table:  ({ node, ...p }) => <div style={{ overflowX: 'auto' }}><table style={{ borderCollapse: 'collapse', margin: '8px 0', fontSize: '11px', width: '100%' }} {...p} /></div>,
  th:     ({ node, ...p }) => <th style={{ border: '1px solid #1e293b', padding: '4px 8px', background: '#0a0e17', textAlign: 'left', fontWeight: 700 }} {...p} />,
  td:     ({ node, ...p }) => <td style={{ border: '1px solid #1e293b', padding: '4px 8px' }} {...p} />,
  blockquote: ({ node, ...p }) => <blockquote style={{ borderLeft: '3px solid #3b82f6', padding: '4px 10px', margin: '8px 0', background: '#0a0e17', color: '#94a3b8' }} {...p} />,
  hr:     () => <hr style={{ border: 'none', borderTop: '1px solid #1e293b', margin: '10px 0' }} />,
};

export default function Markdown({ children, sx = {} }) {
  return (
    <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#cbd5e1', ...sx }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
