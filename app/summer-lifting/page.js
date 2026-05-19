'use client';
import { useRouter } from 'next/navigation';
import { SUMMER_LIFTING_MARKDOWN } from '@/lib/summer-lifting-content';

// Brand palette (matches references/page.js)
const R='#cc0000', G='#22c55e', Y='#d4a843', B='#4a9eff', CARD='#131313', BDR='rgba(255,255,255,0.06)';

// Minimal markdown → HTML renderer. Handles headings, bold/italic, links,
// unordered lists, paragraphs, horizontal rules. Sufficient for this doc.
function mdToHtml(md) {
  // Escape HTML
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Code blocks (```...```) — preserve as <pre>
  html = html.replace(/```([\s\S]*?)```/g, (m, code) =>
    `<pre style="background:#0a0a0a;border:1px solid ${BDR};border-radius:6px;padding:14px;overflow-x:auto;font-size:12px;color:#d4d4d4;line-height:1.5;margin:14px 0;">${code.trim()}</pre>`
  );

  // Headings
  html = html.replace(/^### (.+)$/gm, `<h3 style="font-size:16px;font-weight:700;color:${Y};margin:24px 0 10px;letter-spacing:0.02em;">$1</h3>`);
  html = html.replace(/^## (.+)$/gm, `<h2 style="font-size:20px;font-weight:800;color:#fff;margin:32px 0 12px;border-bottom:1px solid ${BDR};padding-bottom:8px;">$1</h2>`);
  html = html.replace(/^# (.+)$/gm, `<h1 style="font-size:28px;font-weight:900;color:#fff;margin:0 0 16px;letter-spacing:-0.01em;">$1</h1>`);

  // Bold + italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#fff;font-weight:700;">$1</strong>');
  html = html.replace(/(?<![*\w])\*([^*\n]+?)\*(?!\w)/g, '<em style="color:#d4d4d4;">$1</em>');

  // Links — open in new tab
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, `<a href="$2" target="_blank" rel="noopener noreferrer" style="color:${B};text-decoration:none;border-bottom:1px solid rgba(74,158,255,0.3);">$1</a>`);

  // Horizontal rules
  html = html.replace(/^---$/gm, `<hr style="border:none;border-top:1px solid ${BDR};margin:32px 0;" />`);

  // Lists (consecutive `- ` lines)
  const lines = html.split('\n');
  const out = [];
  let inList = false;
  let listIndentLevel = 0;
  for (const line of lines) {
    const liMatch = line.match(/^(\s*)- (.+)$/);
    if (liMatch) {
      if (!inList) {
        out.push(`<ul style="margin:8px 0;padding-left:24px;list-style:disc;color:#d4d4d4;">`);
        inList = true;
      }
      out.push(`<li style="margin:4px 0;line-height:1.6;">${liMatch[2]}</li>`);
    } else {
      if (inList) {
        out.push('</ul>');
        inList = false;
      }
      out.push(line);
    }
  }
  if (inList) out.push('</ul>');
  html = out.join('\n');

  // Paragraphs — wrap consecutive non-tag lines
  html = html
    .split(/\n\n+/)
    .map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';
      // Already an HTML block?
      if (/^<(h\d|ul|ol|pre|hr|div|p)/.test(trimmed)) return trimmed;
      return `<p style="margin:8px 0;color:#d4d4d4;line-height:1.6;">${trimmed.replace(/\n/g, '<br/>')}</p>`;
    })
    .join('\n');

  return html;
}

export default function SummerLifting() {
  const router = useRouter();
  const html = mdToHtml(SUMMER_LIFTING_MARKDOWN);

  return (
    <div style={{ minHeight:'100vh', background:'#0a0a0a', color:'#fff', padding:'20px' }}>
      <div style={{ maxWidth:'860px', margin:'0 auto' }}>

        {/* Back nav */}
        <div style={{ marginBottom:'20px' }}>
          <button
            onClick={() => router.push('/')}
            style={{
              padding:'8px 14px',
              background:'transparent',
              color:'#999',
              border:`1px solid ${BDR}`,
              borderRadius:'6px',
              fontSize:'12px',
              fontWeight:600,
              cursor:'pointer',
              textTransform:'uppercase',
              letterSpacing:'0.05em'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = B; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#999'; e.currentTarget.style.borderColor = BDR; }}
          >
            ← Back to Dashboard
          </button>
        </div>

        {/* Hero / Header */}
        <div style={{
          background:`linear-gradient(135deg, rgba(204,0,0,0.1), rgba(212,168,67,0.05))`,
          border:`1px solid ${BDR}`,
          borderRadius:'12px',
          padding:'24px',
          marginBottom:'24px'
        }}>
          <div style={{ fontSize:'11px', fontWeight:700, color:Y, letterSpacing:'0.12em', textTransform:'uppercase', marginBottom:'6px' }}>
            MASH Track & Field
          </div>
          <div style={{ fontSize:'28px', fontWeight:900, color:'#fff', lineHeight:1.2, marginBottom:'8px' }}>
            Summer Lifting Program
          </div>
          <div style={{ fontSize:'14px', color:'#d4d4d4', lineHeight:1.5 }}>
            12 weeks · Built for track & field + multi-sport athletes · Free REC Center access available
          </div>

          <div style={{ display:'flex', gap:10, marginTop:18, flexWrap:'wrap' }}>
            <a
              href="mailto:adam@thereccentermedford.org?cc=jamesgstokes@gmail.com&subject=Summer%20REC%20Access%20%E2%80%94%20Medford%20Track%20%26%20Field&body=Hi%20Adam%2C%0A%0AI%27m%20%5BYour%20Name%5D%2C%20a%20%5Bgrade%5D%20at%20Medford%20Area%20Senior%20High%20and%20a%20member%20of%20the%20track%20%26%20field%20team%20under%20Coach%20Stokes.%0A%0AI%27ve%20committed%20to%20the%2012-week%20summer%20lifting%20program%20Coach%20has%20set%20up%20for%20us%2C%20and%20I%27m%20reaching%20out%20to%20arrange%20free%20REC%20Center%20access%20over%20the%20summer%20per%20that%20program.%0A%0ACan%20you%20let%20me%20know%3A%0A-%20What%20hours%20and%20days%20I%20can%20come%20in%0A-%20What%20I%20need%20to%20bring%20or%20sign%20in%20advance%0A-%20Any%20equipment%20guidelines%20I%20should%20follow%0A%0ACoach%20Stokes%20is%20CC%27d.%0A%0AThanks%20%E2%80%94%0A%5BYour%20Full%20Name%5D%0A%5BYour%20Phone%5D%0A%5BYour%20Email%5D"
              style={{
                padding:'10px 16px',
                background:R,
                color:'#fff',
                border:'none',
                borderRadius:'6px',
                fontSize:'12px',
                fontWeight:800,
                textDecoration:'none',
                textTransform:'uppercase',
                letterSpacing:'0.06em'
              }}
            >
              📧 Email Adam Rodman (REC)
            </a>
            <button
              onClick={() => { if (typeof window !== 'undefined') window.print(); }}
              style={{
                padding:'10px 16px',
                background:'transparent',
                color:'#fff',
                border:`1px solid ${BDR}`,
                borderRadius:'6px',
                fontSize:'12px',
                fontWeight:700,
                cursor:'pointer',
                textTransform:'uppercase',
                letterSpacing:'0.06em'
              }}
            >
              🖨 Print
            </button>
          </div>
        </div>

        {/* Workout content (rendered markdown) */}
        <div
          style={{
            background:CARD,
            border:`1px solid ${BDR}`,
            borderRadius:'12px',
            padding:'28px',
            fontSize:'14px',
            color:'#d4d4d4',
            lineHeight:1.6
          }}
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div style={{ marginTop:'24px', textAlign:'center', fontSize:'12px', color:'#666' }}>
          Questions? Text Coach Stokes or grab him at practice.
        </div>
      </div>
    </div>
  );
}
