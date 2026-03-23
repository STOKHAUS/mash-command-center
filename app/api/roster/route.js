export const dynamic = 'force-dynamic';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSaYclosnFtdGF-ZeApbGBPW4REv3JTnPbOt3e4LkIdeH85gVZOVZCLSEGXV43My-lTR8V15tWePheU/pub?output=csv';

// Simple CSV line parser (handles quoted fields)
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += c;
  }
  result.push(current.trim());
  return result;
}

export async function GET() {
  try {
    const res = await fetch(CSV_URL, {
      next: { revalidate: 300 },
      headers: { 'User-Agent': 'MASH-Command-Center/1.0' }
    });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status}`);
    const text = await res.text();

    const lines = text.split('\n');
    const athletes = [];
    let gender = 'F'; // Girls section first
    let lastWasAthlete = false;
    let athleteCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const cols = parseCSVLine(lines[i]);
      const grade = parseInt(cols[1]);
      const name = (cols[2] || '').trim();

      // Skip header rows (first 2)
      if (i < 2) continue;

      // Valid athlete row: has a name AND a valid grade
      if (name && name.length > 1 && grade >= 9 && grade <= 12) {
        athletes.push({ name, grade, gender: gender === 'F' ? 'F' : 'M' });
        lastWasAthlete = true;
        athleteCount++;
        continue;
      }

      // Blank/separator row after we've seen athletes = gender switch
      if (lastWasAthlete && !name && athleteCount > 5) {
        // Only switch once, from girls to boys
        if (gender === 'F') {
          gender = 'M';
          lastWasAthlete = false;
        }
      }
    }

    // Sort each gender by grade then name
    athletes.sort((a, b) => {
      if (a.gender !== b.gender) return a.gender === 'F' ? -1 : 1;
      if (a.grade !== b.grade) return a.grade - b.grade;
      return a.name.localeCompare(b.name);
    });

    const boys = athletes.filter(a => a.gender === 'M');
    const girls = athletes.filter(a => a.gender === 'F');

    return Response.json({
      athletes,
      boys: boys.length,
      girls: girls.length,
      total: athletes.length,
      updated: new Date().toISOString(),
      source: 'live'
    });
  } catch (e) {
    return Response.json(
      { error: e.message, athletes: [], source: 'error' },
      { status: 500 }
    );
  }
}
