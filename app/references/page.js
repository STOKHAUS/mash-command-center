'use client';
import { useState } from 'react';

const R='#cc0000',G='#22c55e',Y='#d4a843',B='#4a9eff',CARD='#131313',BDR='rgba(255,255,255,0.06)';

const documents = [
  {
    title: 'HS Order of Events',
    description: 'High School track and field event order and schedule',
    files: [
      { type: 'markdown', url: '/hs-order-of-events.md', label: 'View (Markdown)' },
      { type: 'pdf', url: '/hs-order-of-events.pdf', label: 'Download (PDF)' }
    ]
  },
  {
    title: 'Meet Setup',
    description: 'Meet preparation and setup guidelines',
    files: [
      { type: 'markdown', url: '/meet-setup.md', label: 'View (Markdown)' },
      { type: 'pdf', url: '/meet-setup.pdf', label: 'Download (PDF)' }
    ]
  }
];

export default function References() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', padding: '20px' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '40px', borderBottom: `1px solid ${BDR}`, paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '32px', fontWeight: 'bold', margin: '0 0 10px 0' }}>References</h1>
          <p style={{ color: '#999', fontSize: '14px', margin: 0 }}>Quick access to meet documentation and guidelines</p>
        </div>

        {/* Documents Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
          {documents.map((doc, idx) => (
            <div
              key={idx}
              style={{
                background: CARD,
                border: `1px solid ${BDR}`,
                borderRadius: '8px',
                padding: '20px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = B;
                e.currentTarget.style.boxShadow = `0 0 20px rgba(74, 158, 255, 0.1)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = BDR;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0', color: '#fff' }}>
                {doc.title}
              </h2>
              <p style={{ color: '#999', fontSize: '13px', margin: '0 0 20px 0' }}>
                {doc.description}
              </p>

              {/* File Links */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {doc.files.map((file, fidx) => (
                  <a
                    key={fidx}
                    href={file.url}
                    target={file.type === 'pdf' ? '_blank' : '_self'}
                    rel={file.type === 'pdf' ? 'noopener noreferrer' : ''}
                    style={{
                      display: 'inline-block',
                      padding: '10px 16px',
                      background: file.type === 'pdf' ? R : B,
                      color: '#fff',
                      borderRadius: '4px',
                      textDecoration: 'none',
                      fontSize: '12px',
                      fontWeight: '500',
                      transition: 'all 0.2s ease',
                      cursor: 'pointer',
                      border: 'none'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.8';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {file.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div style={{ marginTop: '40px', padding: '20px', background: CARD, border: `1px solid ${BDR}`, borderRadius: '8px' }}>
          <p style={{ color: '#999', fontSize: '12px', margin: 0 }}>
            📄 All reference documents are available for quick access. PDFs open in a new window for easy printing.
          </p>
        </div>
      </div>
    </div>
  );
}
