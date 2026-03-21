import { NextResponse } from 'next/server';

const SYSTEM = `Sports nutritionist for HS track athletes. Generate a 1-day meal plan (breakfast, AM snack, lunch, PM pre-practice, dinner + hydration note). Tailor to event group: SPRINTERS=high protein/moderate carbs, DISTANCE=high complex carbs, THROWS=calorie-dense/strength, JUMPS=lean protein/anti-inflammatory, HURDLES=sprint+agility mix. Consider grade level, injuries, meet proximity, teen needs. Practical Wisconsin foods. Be concise but specific with portions.`;

export async function POST(request) {
  try {
    const { prompt } = await request.json();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 800,
        system: SYSTEM,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
