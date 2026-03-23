import { NextResponse } from 'next/server';

const MEETS = [
  { date: "2026-03-24", name: "Marshfield Boys Indoor", g: "B" },
  { date: "2026-03-26", name: "Marshfield Girls Indoor", g: "G" },
  { date: "2026-03-27", name: "Northern Badger Classic", g: "B/G" },
  { date: "2026-04-02", name: "Stout Elite Meet", g: "B/G" },
  { date: "2026-04-04", name: "UWSP Distance Carnival", g: "B/G" },
  { date: "2026-04-09", name: "Medford Home Invite", g: "B/G" },
  { date: "2026-04-14", name: "Stratford Invitational", g: "B/G" },
  { date: "2026-04-23", name: "Medford Home Invite #2", g: "B/G" },
  { date: "2026-05-01", name: "Spencer Invitational", g: "B/G" },
  { date: "2026-05-05", name: "Lakeland Meet", g: "B/G" },
  { date: "2026-05-08", name: "Merrill Invitational", g: "B/G" },
  { date: "2026-05-12", name: "Marathon Meet", g: "B/G" },
  { date: "2026-05-15", name: "Marshfield Invitational", g: "B/G" },
  { date: "2026-05-19", name: "GNC Conference", g: "B/G" },
  { date: "2026-05-26", name: "WIAA Regional", g: "B/G" },
  { date: "2026-05-29", name: "WIAA Sectional", g: "B/G" },
];

const SYSTEM = `You are the practice plan generator for MASH Track & Field (Medford Area Senior High Raiders) 2026 season.

COACHING STAFF ASSIGNMENTS:
- Hallie Eisfeldt: Sprinting + handles attendance
- Dilan Schneider (Coach D): Throws
- Greg Klapatauskas: Jumps
- Katie Losiewicz: Pole Vault
- James Stokes (Head Coach): Distance (mostly) + floats between groups

CULTURE: R.A.I.D.E.R.S values (Resilience, Attitude, Integrity, Discipline, Empathy, Respect, Sportsmanship). "1% Better Every Day." "E + R = O" (Event + Response = Outcome).

SCHEDULE RULES:
- Wednesday practices end at 5:00 PM (religious education)
- Normal practice: 3:30–5:30 PM
- Split meets: When boys/girls compete separately at Marshfield, the non-competing gender practices at home

TRAINING PHASES:
- SHARPEN (0-2 days before meet): Low volume, high quality, race modeling, relay exchanges, NO conditioning
- BUILD (3-5 days before meet): Moderate intensity, event-specific development, relay work
- DEVELOP (6+ days before meet): Volume, base building, technique, strength

Generate a STUDENT-FACING practice plan. This means:
- DO include: warm-up details, event group workouts (sprints, distance, jumps, throws, pole vault, hurdles), time blocks, cool down, team message
- DO NOT include: injury details, medical information, coaching strategy notes, staff assignments, athlete limitations
- DO reference coaches by name in each group section so athletes know where to go
- DO include the R.A.I.D.E.R.S value of the day and a closing motivational message
- Format as clean JSON with this structure:

{
  "date": "March 23, 2026",
  "day": "Monday",
  "phase": "SHARPEN",
  "nextMeet": "Marshfield Boys Indoor — Tomorrow",
  "endTime": "5:30 PM",
  "raidersValue": "Discipline",
  "blocks": [
    {
      "time": "3:30 – 3:40 PM",
      "title": "Team Meeting",
      "duration": "10 min",
      "content": "Quick huddle — competition mindset...",
      "bullets": ["Point 1", "Point 2"]
    }
  ],
  "groups": [
    {
      "name": "Sprinters / Hurdlers",
      "coach": "Hallie",
      "workout": ["Item 1", "Item 2"]
    }
  ],
  "closingMessage": "Leaders take ownership...",
  "equipment": ["Cones", "Hurdles"]
}

RESPOND WITH ONLY THE JSON. No markdown, no backticks, no explanation.`;

// Simple in-memory cache: one plan per day
let cache = { date: null, plan: null };

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');

  // Use provided date or today
  const now = new Date();
  const todayStr = dateParam || now.toISOString().slice(0, 10);
  const todayDate = new Date(todayStr + 'T12:00:00');
  const dayName = todayDate.toLocaleDateString('en-US', { weekday: 'long' });
  const dayOfWeek = todayDate.getDay();

  // Check cache
  if (cache.date === todayStr && cache.plan) {
    return NextResponse.json(cache.plan);
  }

  // Weekend check
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const plan = {
      date: todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      day: dayName,
      phase: 'REST',
      nextMeet: null,
      endTime: null,
      raidersValue: 'Recovery',
      blocks: [],
      groups: [],
      closingMessage: 'Rest day. Hydrate, stretch, recover. 1% Better Every Day means knowing when to rest.',
      equipment: [],
      isOff: true,
    };
    cache = { date: todayStr, plan };
    return NextResponse.json(plan);
  }

  // Find next meet
  const nextMeet = MEETS.find(m => new Date(m.date) >= todayDate);
  const daysToMeet = nextMeet ? Math.ceil((new Date(nextMeet.date) - todayDate) / 86400000) : 14;
  const phase = daysToMeet <= 2 ? 'SHARPEN' : daysToMeet <= 5 ? 'BUILD' : 'DEVELOP';

  // Check if today IS a meet day
  const todayMeet = MEETS.find(m => m.date === todayStr);
  const isWed = dayOfWeek === 3;
  const endTime = isWed ? '5:00 PM' : '5:30 PM';

  // Build context for Claude
  const prompt = `Generate today's practice plan.

DATE: ${dayName}, ${todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
PHASE: ${phase} (${daysToMeet} days to next meet)
NEXT MEET: ${nextMeet ? nextMeet.name + ' (' + nextMeet.g + ') on ' + nextMeet.date : 'TBD'}
${todayMeet ? 'TODAY IS A MEET DAY: ' + todayMeet.name + ' (' + todayMeet.g + '). Generate a meet-day plan — athletes not competing should still practice.' : ''}
${isWed ? 'WEDNESDAY — Practice MUST end by 5:00 PM.' : 'Practice ends around ' + endTime + '.'}
${todayMeet && (todayMeet.g === 'B' || todayMeet.g === 'G') ? 'SPLIT MEET: Only ' + todayMeet.g + ' travel. ' + (todayMeet.g === 'B' ? 'Girls' : 'Boys') + ' practice at home.' : ''}

Generate the full practice plan JSON now.`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await res.json();
    const text = data.content?.map(i => i.text || '').join('') || '';

    // Parse JSON response
    const cleaned = text.replace(/```json|```/g, '').trim();
    const plan = JSON.parse(cleaned);

    // Cache it
    cache = { date: todayStr, plan };
    return NextResponse.json(plan);
  } catch (e) {
    return NextResponse.json({
      date: todayDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      day: dayName,
      phase,
      error: 'Failed to generate plan. Ask Coach Stokes.',
      blocks: [],
      groups: [],
      closingMessage: '',
      equipment: [],
    }, { status: 500 });
  }
}
