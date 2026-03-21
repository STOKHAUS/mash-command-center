import { NextResponse } from 'next/server';

const SYSTEM = `HS T&F S&C coach. Generate ONE session workout. Tailor to event group and specific athlete data (PRs, injuries, goals). SPRINTERS=explosive power/acceleration. DISTANCE=aerobic/threshold/tempo. THROWS=rotational power/Olympic lifts. JUMPS=approach/plyos. HURDLES=rhythm/trail leg/flexibility. Phases: DEVELOP=volume, BUILD=intensity, SHARPEN=low volume/high quality. Include warm-up, main work, cool-down with sets/reps. Account for any injuries mentioned. Realistic HS facility.`;

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
