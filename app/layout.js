import './globals.css';

export const metadata = {
  title: 'MASH Track Command Center',
  description: 'Medford Area Senior High Raiders Track & Field 2026',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700;800&family=Barlow:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#0a0a0a" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='28' font-size='28'>🏃</text></svg>" />
      </head>
      <body>{children}</body>
    </html>
  );
}
