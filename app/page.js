'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FORM_DATA, MEETS, LOCATIONS, ACTIONS, KNOWN_STATUS, RESULTS, CONFLICTS, GUIDE_URLS, RESULTS_URLS, BADGER_BOYS, BADGER_GIRLS, STOUT_BOYS, STOUT_GIRLS, UWSP_BOYS, UWSP_GIRLS, EARLYBIRD_BOYS, EARLYBIRD_GIRLS, EARLYBIRD_SCHEDULE, STRATFORD_BOYS, STRATFORD_GIRLS, STRATFORD_SCHEDULE, MEET_LINKS } from '@/lib/data';

const R='#cc0000',G='#22c55e',Y='#d4a843',B='#4a9eff',CARD='#131313',BDR='rgba(255,255,255,0.06)';
const DAY_MS = 86400000;

// Merge form data with roster for enriched profiles
function getProfile(name) {
  const n = name.toLowerCase();
  return FORM_DATA.find(f => {
    const fn = f.n.toLowerCase();
    return fn === n || n.includes(fn) || fn.includes(n.split(' ')[0]);
  });
}

// Get lineups for a meet (supports combined B/G)
function getLineups(meetId) {
  if (meetId === 3 && BADGER_BOYS && BADGER_GIRLS) {
    return [{ label: 'Boys Entries', data: BADGER_BOYS, gender: 'B' }, { label: 'Girls Entries', data: BADGER_GIRLS, gender: 'G' }];
  }
  if (meetId === 4 && STOUT_BOYS && STOUT_GIRLS) {
    return [{ label: 'Boys Entries', data: STOUT_BOYS, gender: 'B' }, { label: 'Girls Entries', data: STOUT_GIRLS, gender: 'G' }];
  }
  if (meetId === 5 && UWSP_BOYS && UWSP_GIRLS) {
    return [{ label: 'Boys Entries', data: UWSP_BOYS, gender: 'B' }, { label: 'Girls Entries', data: UWSP_GIRLS, gender: 'G' }];
  }
  if (meetId === 6 && EARLYBIRD_BOYS && EARLYBIRD_GIRLS) {
    return [{ label: 'Boys Entries', data: EARLYBIRD_BOYS, gender: 'B' }, { label: 'Girls Entries', data: EARLYBIRD_GIRLS, gender: 'G' }];
  }
  if (meetId === 7 && STRATFORD_BOYS && STRATFORD_GIRLS) {
    return [{ label: 'Boys Entries', data: STRATFORD_BOYS, gender: 'B' }, { label: 'Girls Entries', data: STRATFORD_GIRLS, gender: 'G' }];
  }
  return null;
}

function getMeetSchedule(meetId) {
  if (meetId === 6 && EARLYBIRD_SCHEDULE) return EARLYBIRD_SCHEDULE;
  if (meetId === 7 && STRATFORD_SCHEDULE) return STRATFORD_SCHEDULE;
  return null;
}

function normalizeText(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function getNameParts(name = '') {
  const parts = normalizeText(name).split(' ').filter(Boolean);
  return {
    first: parts[0] || '',
    last: parts[parts.length - 1] || '',
  };
}

function oneEditAway(a = '', b = '') {
  if (!a || !b || Math.abs(a.length - b.length) > 1) return false;
  if (a === b) return true;

  let i = 0;
  let j = 0;
  let edits = 0;

  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    edits++;
    if (edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }

  if (i < a.length || j < b.length) edits++;
  return edits <= 1;
}

function namesMatch(a = '', b = '') {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;

  const pa = getNameParts(a);
  const pb = getNameParts(b);
  if (!pa.first || !pa.last || !pb.first || !pb.last) return false;

  const firstClose = pa.first === pb.first
    || (pa.first[0] === pb.first[0] && (pa.first.slice(0, 3) === pb.first.slice(0, 3) || oneEditAway(pa.first, pb.first)));
  const lastClose = pa.last === pb.last
    || pa.last.slice(0, 4) === pb.last.slice(0, 4)
    || oneEditAway(pa.last, pb.last);

  return firstClose && lastClose;
}

function canonicalEventLabel(eventName = '') {
  const raw = eventName.replace(/\s+/g, ' ').trim();
  const key = normalizeText(raw);

  if (key === '60yd dash') return '60yd Dash';
  if (key === '55m dash') return '55M Dash';
  if (key === '220yd dash') return '220yd Dash';
  if (key === '440yd dash') return '440yd Dash';
  if (key === '880yd run') return '880yd Run';
  if (key === 'mile run') return 'Mile Run';
  if (key === '55m hurdles') return '55M Hurdles';
  if (key === '60m hurdles') return '60M Hurdles';
  if (key === '100m hurdles') return '100m Hurdles';
  if (key === '110m hurdles') return '110m Hurdles';
  if (key === '300m hurdles') return '300m Hurdles';
  if (key === '100 meters' || key === '100m') return '100 Meters';
  if (key === '200 meters' || key === '200m') return '200 Meters';
  if (key === '400 meters' || key === '400m') return '400 Meters';
  if (key === '800 meters' || key === '800m') return '800 Meters';
  if (key === '1600 meters' || key === '1600m') return '1600 Meters';
  if (key === '3200 meters' || key === '3200m') return '3200 Meters';
  if (key === '4x100 relay a' || key === '4x100 relay b') return '4x100 Relay';
  if (key === '4x400 relay a' || key === '4x400 relay b') return '4x400 Relay';

  return raw;
}

function getEventOrder(eventName = '') {
  const order = [
    '55M Hurdles',
    '60M Hurdles',
    '100m Hurdles',
    '110m Hurdles',
    '55M Dash',
    '60yd Dash',
    '100 Meters',
    '220yd Dash',
    '200 Meters',
    '440yd Dash',
    '400 Meters',
    '880yd Run',
    '800 Meters',
    'Mile Run',
    '1600 Meters',
    '3200 Meters',
    'Long Jump',
    'Triple Jump',
    'High Jump',
    'Pole Vault',
    'Shot Put',
    'Discus',
  ];
  const idx = order.indexOf(canonicalEventLabel(eventName));
  return idx === -1 ? 999 : idx;
}

function isRelayEvent(eventName = '') {
  return normalizeText(eventName).includes('relay');
}

function isFieldEvent(eventName = '') {
  const key = normalizeText(canonicalEventLabel(eventName));
  return ['long jump', 'triple jump', 'high jump', 'pole vault', 'shot put', 'discus'].includes(key);
}

function parseRunningMark(mark = '') {
  const clean = mark.trim();
  if (!clean) return null;
  if (clean.includes(':')) {
    const [minutes, seconds] = clean.split(':');
    const total = Number(minutes) * 60 + Number(seconds);
    return Number.isFinite(total) ? total : null;
  }
  const total = Number(clean);
  return Number.isFinite(total) ? total : null;
}

function parseFieldMark(mark = '') {
  const clean = mark.trim();
  if (!clean) return null;
  const match = clean.match(/^(\d+)-(\d+(?:\.\d+)?)$/);
  if (match) return Number(match[1]) * 12 + Number(match[2]);
  const total = Number(clean);
  return Number.isFinite(total) ? total : null;
}

function getComparableMark(eventName, mark) {
  if (isFieldEvent(eventName)) return parseFieldMark(mark);
  return parseRunningMark(mark);
}

function isBetterResult(candidate, current) {
  const candidateValue = getComparableMark(candidate.e, candidate.mark);
  const currentValue = getComparableMark(current.e, current.mark);

  if (candidateValue == null) return false;
  if (currentValue == null) return true;

  return isFieldEvent(candidate.e) ? candidateValue > currentValue : candidateValue < currentValue;
}

function getResultsForAthlete(name) {
  if (!RESULTS) return [];
  const all = [];
  RESULTS.forEach(meet => {
    meet.data.filter(r => namesMatch(r.a, name)).forEach(r => {
      all.push({ ...r, meetName: meet.meet, meetDate: meet.date, teams: meet.teams });
    });
  });
  return all.sort((a, b) => new Date(b.meetDate) - new Date(a.meetDate));
}

function getOfficialBests(name) {
  const bestByEvent = new Map();

  getResultsForAthlete(name)
    .filter(r => !isRelayEvent(r.e))
    .forEach(result => {
      const key = canonicalEventLabel(result.e);
      const current = bestByEvent.get(key);
      if (!current || isBetterResult(result, current)) {
        bestByEvent.set(key, { ...result, eventLabel: key });
      }
    });

  return [...bestByEvent.values()].sort((a, b) => {
    const diff = getEventOrder(a.eventLabel) - getEventOrder(b.eventLabel);
    if (diff !== 0) return diff;
    return a.eventLabel.localeCompare(b.eventLabel);
  });
}

function getAthleteFocus(athlete) {
  const values = [athlete?.p1, athlete?.p2, athlete?.imp];
  const text = normalizeText(values.filter(Boolean).join(' '));

  if (text.includes('pole')) return { key: 'pole', label: 'pole vault' };
  if (text.includes('shot') || text.includes('disc') || text.includes('throw')) return { key: 'throws', label: 'throws' };
  if (text.includes('hurd')) return { key: 'hurdles', label: 'hurdles' };
  if (text.includes('jump')) return { key: 'jumps', label: 'jumps' };
  if (text.includes('1600') || text.includes('3200') || text.includes('mile') || text.includes('800') || text.includes('distance')) return { key: 'distance', label: 'distance' };
  if (text.includes('100') || text.includes('200') || text.includes('400') || text.includes('relay') || text.includes('sprint')) return { key: 'sprints', label: 'sprints' };

  return { key: 'general', label: 'general event work' };
}

function getPracticeFocus(athlete, practicePlan, daysToMeet) {
  const focus = getAthleteFocus(athlete);
  const phase = daysToMeet <= 2 ? 'SHARPEN' : daysToMeet <= 5 ? 'BUILD' : 'DEVELOP';
  const groups = practicePlan?.groups || [];
  const lookup = {
    sprints: ['sprint', 'sprinter'],
    hurdles: ['hurd', 'sprint'],
    distance: ['distance', '800', '1600'],
    jumps: ['jump'],
    throws: ['throw'],
    pole: ['pole'],
  };
  const match = groups.find(group => {
    const name = normalizeText(group.name);
    return (lookup[focus.key] || []).some(keyword => name.includes(keyword));
  });

  if (match) {
    return {
      source: 'plan',
      phase: practicePlan.phase || phase,
      title: match.name,
      coach: match.coach,
      bullets: (match.workout || []).slice(0, 3),
    };
  }

  const fallbacks = {
    SHARPEN: {
      sprints: ['Explosive warm-up, block work, and a few race-model reps.', 'Keep volume low and quality high before the next meet.'],
      hurdles: ['Hurdle rhythm, starts, and a few smooth fast reps.', 'Stay sharp without adding junk volume.'],
      distance: ['Short aerobic work, a few controlled pace reps, and relaxed strides.', 'Finish fresh and ready to race.'],
      jumps: ['Approach rhythm, pop-ups, and low-volume technical contacts.', 'Focus on timing and consistency.'],
      throws: ['Stand throws and a few full-effort technical reps.', 'Stay loose, quick, and explosive.'],
      pole: ['Approach and plant timing, then a few quality jumps.', 'Cut volume early and save pop for meet day.'],
      general: ['Warm up well, hit your event-specific work, and finish feeling sharp.', 'Ask your coach where your group starts today.'],
    },
    BUILD: {
      sprints: ['Acceleration work plus event-specific reps at controlled intensity.', 'Use the middle of the week to build rhythm and confidence.'],
      hurdles: ['Hurdle mobility, rhythm work, and controlled special endurance.', 'Stay technical and smooth through every rep.'],
      distance: ['Aerobic strength or threshold work with a strong cooldown.', 'Keep pacing even and finish with good mechanics.'],
      jumps: ['Approach consistency, takeoff drills, and moderate jump volume.', 'Own the details on each rep.'],
      throws: ['Technique work with moderate volume and a strength emphasis.', 'Quality positions matter more than extra throws.'],
      pole: ['Run-throughs, plant mechanics, and bar progressions.', 'Build confidence with repeatable rhythm.'],
      general: ['Today is a build day: good volume, good detail, no wasted reps.', 'Check in with your event coach and own your assignments.'],
    },
    DEVELOP: {
      sprints: ['Speed mechanics, acceleration, and strength-based sprint work.', 'Build the base that will carry into meets.'],
      hurdles: ['Mobility, drills, trail-leg work, and rhythm development.', 'Use today to groove good habits.'],
      distance: ['Base-building aerobic work with drills and strides.', 'Stay patient and stack consistent days.'],
      jumps: ['Technical reps, plyos, and approach development.', 'Build consistent pop and confidence.'],
      throws: ['Technique reps, footwork, and strength-focused throwing work.', 'Stay patient and repeat clean positions.'],
      pole: ['Runway rhythm, plant timing, and foundational vault work.', 'Use today to build confidence and consistency.'],
      general: ['Today is about foundation work and consistency.', 'Put together a disciplined practice and finish stronger than you started.'],
    },
  };

  return {
    source: 'fallback',
    phase,
    title: `${focus.label[0].toUpperCase()}${focus.label.slice(1)} focus`,
    coach: null,
    bullets: fallbacks[phase][focus.key] || fallbacks[phase].general,
  };
}

function getAthleteEntriesForMeet(athlete, meetId) {
  const lineups = getLineups(meetId);
  if (!lineups) return [];
  const schedule = getMeetSchedule(meetId) || [];
  const entries = [];

  lineups.forEach(group => {
    group.data.forEach(event => {
      (event.a || []).forEach((entryName, idx) => {
        if (!entryName || !namesMatch(entryName, athlete.n)) return;
        const slot = schedule.find(item => item.e === event.e || item.e.startsWith(event.e) || event.e.startsWith(item.e));
        entries.push({
          event: event.e,
          seed: event.seed?.[idx] || '',
          note: event.note || event.n || '',
          time: slot?.time || 'TBD',
          order: slot?.order ?? 999,
          type: slot?.type || (isFieldEvent(event.e) ? 'field' : isRelayEvent(event.e) ? 'relay' : 'running'),
          gender: group.gender,
        });
      });
    });
  });

  return entries.sort((a, b) => {
    const diff = a.order - b.order;
    if (diff !== 0) return diff;
    return a.event.localeCompare(b.event);
  });
}

function getMeetDate(dateString) {
  return new Date(`${dateString}T12:00:00`);
}

function getMeetCountdown(daysAway) {
  if (daysAway === 0) return 'today';
  if (daysAway === 1) return 'tomorrow';
  if (daysAway < 0) return `${Math.abs(daysAway)}d ago`;
  return `in ${daysAway} days`;
}

function getNextMeetEntry(athlete, now) {
  const current = new Date(now.toDateString());

  for (const meet of MEETS) {
    const meetDate = getMeetDate(meet.date);
    if (meetDate < current) continue;
    const entries = getAthleteEntriesForMeet(athlete, meet.id);
    if (!entries.length) continue;
    return {
      meet,
      entries,
      daysAway: Math.ceil((meetDate - current) / DAY_MS),
    };
  }

  return null;
}

function getFuelingTip(athlete, daysToMeet) {
  const focus = getAthleteFocus(athlete);
  const mealBase = focus.key === 'distance'
    ? 'lean protein, rice or pasta, fruit, and plenty of water'
    : focus.key === 'throws'
      ? 'a bigger balanced dinner with carbs, protein, and extra fluids'
      : 'a simple balanced dinner with carbs, lean protein, fruit, and water';

  if (daysToMeet === 0) {
    return 'Meet day: stick to familiar foods, keep fluids steady, and eat a light carb-focused snack 60-90 minutes before warm-ups if needed.';
  }
  if (daysToMeet === 1) {
    return `Night-before fuel: aim for ${mealBase}. Keep it familiar and avoid heavy fried food.`;
  }
  return 'Regular training-day fuel: eat normally, get protein after practice, and stay ahead on hydration.';
}

function getTargetNote(nextMeetEntry, officialBests) {
  if (!nextMeetEntry) {
    return 'No next-meet entry is loaded yet, so the app cannot set event-specific targets.';
  }

  const seededEntry = nextMeetEntry.entries.find(entry => entry.seed && !isRelayEvent(entry.event));
  if (seededEntry) {
    const matchingBest = officialBests.find(best => best.eventLabel === canonicalEventLabel(seededEntry.event));
    if (matchingBest) {
      return `Target to chase: ${seededEntry.event} is seeded at ${seededEntry.seed}. Best loaded mark: ${matchingBest.mark}. Opponent targets still need the full meet field from other schools.`;
    }
    return `Target to chase: ${seededEntry.event} is seeded at ${seededEntry.seed}. To tell athletes exactly who to beat, the app still needs the full meet field from other schools.`;
  }

  return 'Your event list is loaded, but the app only has MASH entries right now. To add "who to beat next meet," we need full opponent seeds or heat sheets.';
}

function getGreeting(now) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function buildAthleteMessage(athlete, now, practiceFocus, nextMeetEntry, officialBests, latestPr, status) {
  const firstName = athlete.n.split(' ')[0];
  const nextMeetText = nextMeetEntry
    ? `You're entered in ${nextMeetEntry.meet.name} ${getMeetCountdown(nextMeetEntry.daysAway)} for ${nextMeetEntry.entries.map(entry => entry.event).slice(0, 3).join(', ')}${nextMeetEntry.entries.length > 3 ? ', and more.' : '.'}`
    : 'No next-meet entries are loaded for you yet.';
  const practiceText = practiceFocus.source === 'plan'
    ? `Practice focus today: ${practiceFocus.title}${practiceFocus.coach ? ` with Coach ${practiceFocus.coach}` : ''}.`
    : `Practice focus today: ${practiceFocus.phase.toLowerCase()} work for ${practiceFocus.title.toLowerCase()}.`;
  const statusText = status !== 'available' ? ` You're currently marked ${status}, so check in with a coach before pushing full volume.` : '';
  const performanceText = latestPr
    ? `Latest PR loaded: ${canonicalEventLabel(latestPr.e)} in ${latestPr.mark} at ${latestPr.meetName}.`
    : officialBests[0]
      ? `Best official mark loaded: ${officialBests[0].eventLabel} in ${officialBests[0].mark}.`
      : athlete.pr
        ? `Reported all-time PRs: ${athlete.pr.split('\n')[0]}.`
        : 'No PR data is loaded yet.';

  return `${getGreeting(now)}, ${firstName}. ${practiceText} ${nextMeetText} ${performanceText}${statusText}`;
}

const wxIcon = c => { if(c<=1)return'☀️';if(c<=3)return'⛅';if(c<=49)return'🌫️';if(c<=69)return'🌧️';if(c<=79)return'🌨️';if(c<=99)return'⛈️';return'🌤️'; };

// Results URL helper
const getResultsUrl = (meetId) => RESULTS_URLS && RESULTS_URLS[meetId] ? RESULTS_URLS[meetId] : null;

export default function Home() {
  const [tab, setTab] = useState('today');
  const [done, setDone] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [wx, setWx] = useState(null);
  const [mWx, setMWx] = useState(null);
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiIn, setAiIn] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const chatRef = useRef(null);
  const [planA, setPlanA] = useState(null);
  const [meal, setMeal] = useState(null);
  const [work, setWork] = useState(null);
  const [planLoad, setPlanLoad] = useState(false);
  const [athF, setAthF] = useState('all');
  const [athQ, setAthQ] = useState('');
  const [selectedAth, setSelectedAth] = useState(null);
  const [msgBody, setMsgBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [pracPlan, setPracPlan] = useState(null);
  const [pracLoad, setPracLoad] = useState(false);
  const [liveRoster, setLiveRoster] = useState(null);
  const [resMeet, setResMeet] = useState(RESULTS?.length ? RESULTS[0].date : '');
  const [resView, setResView] = useState('summary');
  const [meetView, setMeetView] = useState(null);

  const NOW = new Date();
  const nm = MEETS.find(m => new Date(m.date) >= NOW);
  const dtn = nm ? Math.ceil((new Date(nm.date) - NOW) / 86400000) : null;
  const getSt = n => statuses[n] || KNOWN_STATUS[n] || 'available';
  const stCol = s => s === 'available' ? G : s === 'injured' || s === 'unavailable' ? R : Y;

  useEffect(() => {
    try {
      const s = localStorage.getItem('mash-cc');
      if (s) { const d = JSON.parse(s); if(d.done) setDone(d.done); if(d.statuses) setStatuses(d.statuses); if(d.aiMsgs) setAiMsgs(d.aiMsgs); }
    } catch(e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('mash-cc', JSON.stringify({ done, statuses, aiMsgs })); } catch(e) {}
  }, [done, statuses, aiMsgs]);

  useEffect(() => {
    async function fetchWx() {
      try {
        const ml = LOCATIONS['Medford'];
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ml.lat}&longitude=${ml.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America/Chicago&forecast_days=7`);
        setWx((await r.json()).daily);
        if (nm && LOCATIONS[nm.loc]) {
          const ml2 = LOCATIONS[nm.loc];
          const r2 = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ml2.lat}&longitude=${ml2.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,weathercode&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=America/Chicago&forecast_days=7`);
          setMWx({ loc: nm.loc, d: (await r2.json()).daily });
        }
      } catch(e) {}
    }
    fetchWx();
  }, []);

  useEffect(() => {
    fetch('/api/roster')
      .then(r => r.json())
      .then(data => { if (data.athletes?.length) setLiveRoster(data.athletes); })
      .catch(() => {});
  }, []);

  const rosterData = (() => {
    if (!liveRoster) return FORM_DATA;
    return liveRoster.map(lr => {
      const ln = lr.name.toLowerCase();
      const match = FORM_DATA.find(f => {
        const fn = f.n.toLowerCase();
        return fn === ln || fn.includes(ln) || ln.includes(fn)
          || fn.split(' ')[1] === ln.split(' ')[1];
      });
      if (match) return { ...match, g: lr.grade, gn: lr.gender === 'M' ? 'M' : 'F' };
      return { n: lr.name, g: lr.grade, gn: lr.gender === 'M' ? 'M' : 'F', p1:'', p2:'', ph:'', em:'', pr:'', inj:'', goal:'', imp:'', pg:'', rv:'', conf:'', sp:'' };
    });
  })();

  useEffect(() => {
    if ((tab !== 'practice' && !selectedAth) || pracPlan || pracLoad) return;
    setPracLoad(true);
    fetch('/api/practice')
      .then(r => r.json())
      .then(data => { setPracPlan(data); setPracLoad(false); })
      .catch(() => setPracLoad(false));
  }, [tab, selectedAth, pracPlan, pracLoad]);

  const sendAI = useCallback(async () => {
    if (!aiIn.trim() || aiLoad) return;
    const msg = aiIn.trim(); setAiIn('');
    const nw = [...aiMsgs, { role: 'user', content: msg }];
    setAiMsgs(nw); setAiLoad(true);
    try {
      const r = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nw.map(m => ({ role: m.role, content: m.content })) }),
      });
      const d = await r.json();
      const reply = d.content?.map(i => i.text || '').join('') || 'No response.';
      setAiMsgs([...nw, { role: 'assistant', content: reply }]);
    } catch(e) { setAiMsgs([...nw, { role: 'assistant', content: `Error: ${e.message}` }]); }
    setAiLoad(false);
    setTimeout(() => { if(chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight; }, 100);
  }, [aiIn, aiMsgs, aiLoad]);

  const genPlans = useCallback(async (athlete) => {
    setPlanA(athlete); setPlanLoad(true); setMeal(null); setWork(null);
    const profile = getProfile(athlete.n);
    const phase = dtn <= 2 ? 'SHARPEN' : dtn <= 5 ? 'BUILD' : 'DEVELOP';
    const prompt = [
      `Athlete: ${athlete.n}, Grade ${athlete.g}, ${athlete.gn === 'M' ? 'Male' : 'Female'}`,
      `Primary event: ${athlete.p1 || 'TBD'}, Secondary: ${athlete.p2 || 'TBD'}`,
      `PRs: ${athlete.pr || 'None recorded'}`,
      `Injuries/Health: ${athlete.inj || 'None'}`,
      `Season goal: ${athlete.goal || 'Not specified'}`,
      `R.A.I.D.E.R.S focus: ${athlete.rv || 'Not specified'}`,
      `Other sports: ${athlete.sp || 'None'}`,
      `Training phase: ${phase}, Days to next meet: ${dtn || '14+'}`,
      `Schedule conflicts: ${athlete.conf || 'None'}`,
    ].join('\n');

    try {
      const [mr, wr] = await Promise.all([
        fetch('/api/meal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) }),
        fetch('/api/workout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt }) }),
      ]);
      const md = await mr.json(); const wd = await wr.json();
      setMeal(md.content?.map(i => i.text || '').join('') || 'Error generating plan.');
      setWork(wd.content?.map(i => i.text || '').join('') || 'Error generating plan.');
    } catch(e) { setMeal(`Error: ${e.message}`); setWork(`Error: ${e.message}`); }
    setPlanLoad(false);
  }, [dtn]);

  const copyMsg = () => {
    navigator.clipboard.writeText(msgBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDone = id => setDone(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const alerts = rosterData.filter(a => { const s = getSt(a.n); return s !== 'available'; });

  const upcomingConflicts = (CONFLICTS || []).filter(c => {
    const d = c.date ? new Date(c.date) : new Date(c.start);
    const diff = Math.ceil((d - NOW) / 86400000);
    return diff >= 0 && diff <= 14;
  });

  const bd = (c) => ({ display:'inline-block', fontSize:'.5rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', padding:'2px 6px', marginLeft:4, background:`${c}20`, color:c, border:`1px solid ${c}40` });

  const WxWidget = ({ data, title }) => {
    if (!data) return null;
    return (
      <div style={{ background:'linear-gradient(135deg,#111,#0a0a0a)', border:`1px solid ${BDR}`, padding:14, marginBottom:8 }}>
        <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:8 }}>{title}</div>
        <div style={{ display:'flex', gap:6, overflowX:'auto' }}>
          {data.time.map((t, i) => (
            <div key={i} style={{ minWidth:68, textAlign:'center', padding:'8px 4px', background:'rgba(255,255,255,.02)', border:`1px solid ${BDR}`, flexShrink:0 }}>
              <div style={{ fontSize:'.58rem', color:'#555', fontWeight:700 }}>{new Date(t+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})}</div>
              <div style={{ fontSize:'1.2rem', margin:'3px 0' }}>{wxIcon(data.weathercode[i])}</div>
              <div style={{ fontSize:'.75rem', fontWeight:700 }}>{Math.round(data.temperature_2m_max[i])}°F</div>
              <div style={{ fontSize:'.6rem', color:'#555' }}>{Math.round(data.temperature_2m_min[i])}°</div>
              <div style={{ fontSize:'.52rem', color:data.precipitation_probability_max[i]>40?B:'#444', marginTop:2 }}>💧{data.precipitation_probability_max[i]}%</div>
              <div style={{ fontSize:'.52rem', color:data.windspeed_10m_max[i]>15?Y:'#444' }}>💨{Math.round(data.windspeed_10m_max[i])}mph</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const tabs = [['today','⚡ Today'],['results','📊 Results'],['practice','📋 Practice'],['meets','🏟️ Meets'],['athletes','👤 Roster'],['plans','🍽️ Plans'],['msg','📱 Message'],['ai','🤖 AI']];
  const input = { background:'#161616', border:`1px solid rgba(255,255,255,.08)`, color:'#fff', padding:'8px 12px', fontSize:'.8rem', width:'100%' };
  const btn = { padding:'8px 16px', background:R, color:'#fff', border:'none', fontWeight:800, fontSize:'.68rem', textTransform:'uppercase', letterSpacing:'.08em', cursor:'pointer' };
  const btnO = { ...btn, background:'transparent', border:`1px solid rgba(255,255,255,.15)`, fontWeight:600 };
  const btnS = (a) => ({ padding:'5px 10px', background:a?R:'rgba(255,255,255,.04)', color:a?'#fff':'#888', fontWeight:700, fontSize:'.6rem', textTransform:'uppercase', border:a?`1px solid ${R}`:`1px solid rgba(255,255,255,.08)`, cursor:'pointer' });

  return (
    <div>
      <div style={{ background:`linear-gradient(135deg,#1a0000,#0a0a0a)`, borderBottom:`2px solid ${R}`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', letterSpacing:'.12em', textTransform:'uppercase' }}><span style={{color:R}}>MASH</span> Command Center</div>
        <div style={{ fontSize:'.55rem', color:'#444' }}>v6 · 2026</div>
      </div>

      <div style={{ display:'flex', overflowX:'auto', background:'#111', borderBottom:`1px solid ${BDR}`, position:'sticky', top:44, zIndex:99 }}>
        {tabs.map(([k,l]) => (
          <button key={k} onClick={() => { setTab(k); setMeetView(null); }} style={{ padding:'10px 12px', background:tab===k?'rgba(204,0,0,.12)':'transparent', color:tab===k?'#fff':'#666', borderBottom:tab===k?`2px solid ${R}`:'2px solid transparent', fontWeight:700, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.08em', whiteSpace:'nowrap', flexShrink:0 }}>{l}</button>
        ))}
      </div>

      {tab === 'today' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R }}>Command Center</div>
          <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{NOW.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)' }}>{nm ? `${nm.name} (${nm.g}) in ${dtn}d` : ''}</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:BDR, margin:'12px 0' }}>
            {[[dtn+'d','Next Meet',R],[rosterData.length,'Athletes','#fff'],[alerts.length,'Alerts',alerts.length?R:G],[MEETS.length,'Meets','#fff']].map(([v,l,c],i) => (
              <div key={i} style={{ background:'#111', padding:'10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.5rem', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          <WxWidget data={wx} title="Medford (54451) — 7-Day Forecast" />
          {mWx && nm && <WxWidget data={mWx.d} title={`${nm.name} @ ${mWx.loc}`} />}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'14px 0' }}>
            <button onClick={() => setTab('practice')} style={{ background:'linear-gradient(135deg,#1a0505,#2a0a0a)', border:`2px solid ${R}`, padding:'20px 16px', cursor:'pointer', textAlign:'left', transition:'all .2s', gridColumn:'1 / -1' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:'1.8rem' }}>📋</div>
                <div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.05rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>Today&apos;s Practice Plan</div>
                  <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)', marginTop:4, lineHeight:1.4 }}>Auto-generated daily workout · Event groups · Coach assignments</div>
                </div>
              </div>
            </button>
            <button onClick={() => setTab('results')} style={{ background:'linear-gradient(135deg,#0a150a,#0a2a0a)', border:`2px solid ${G}`, padding:'16px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:4 }}>📊</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'.85rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>Meet Results</div>
              <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)', marginTop:4 }}>{RESULTS?.length || 0} meets · PRs, placements, tracking</div>
            </button>
            <button onClick={() => setTab('ai')} style={{ background:'linear-gradient(135deg,#050a1a,#0a0a2a)', border:`2px solid ${B}`, padding:'16px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:4 }}>🤖</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'.85rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>AI Coach</div>
              <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)', marginTop:4 }}>Strategy, lineups, WIAA rules</div>
            </button>
          </div>

          {upcomingConflicts.length > 0 && (
            <>
              <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:B, marginTop:14, marginBottom:8 }}>Coach Conflicts (Next 14 Days)</div>
              {upcomingConflicts.map((c, i) => (
                <div key={i} style={{ display:'flex', gap:8, alignItems:'center', padding:'8px 10px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${B}`, marginBottom:4 }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background:B, flexShrink:0 }} />
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:'.8rem', fontWeight:600, lineHeight:1.3 }}>{c.text}</div>
                    <div style={{ fontSize:'.6rem', color:B, fontWeight:700, marginTop:2 }}>{c.date || `${c.start} – ${c.end}`}</div>
                  </div>
                </div>
              ))}
            </>
          )}

          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:14, marginBottom:8 }}>Actions ({ACTIONS.filter(a => !done.includes(a.id)).length})</div>
          {ACTIONS.sort((a,b) => new Date(a.d)-new Date(b.d)).map(a => {
            const d = done.includes(a.id);
            return (
              <div key={a.id} onClick={() => toggleDone(a.id)} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 10px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${a.p==='h'?R:Y}`, marginBottom:4, opacity:d?.35:1, cursor:'pointer' }}>
                <div style={{ width:15, height:15, border:`2px solid ${d?G:R}`, background:d?G:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'.55rem', fontWeight:800, color:'#000' }}>{d?'✓':''}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'.8rem', fontWeight:600, lineHeight:1.3, textDecoration:d?'line-through':'none' }}>{a.t}</div>
                  <div style={{ fontSize:'.6rem', color:a.p==='h'?'#ff4444':Y, fontWeight:700, marginTop:2 }}>Due: {a.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'results' && (() => {
        const meet = RESULTS?.find(r => r.date === resMeet);
        if (!RESULTS?.length || !meet) return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto', textAlign:'center', paddingTop:60 }}>
            <div style={{ fontSize:'2rem', marginBottom:12 }}>📊</div>
            <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', textTransform:'uppercase' }}>No Results Yet</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginTop:8 }}>Results will appear here after meets are completed.</div>
          </div>
        );

        const d = meet.data;
        const indiv = d.filter(r => !r.a.includes('Medford'));
        const seeded = indiv.filter(r => r.seed);
        const prs = seeded.filter(r => r.pr);
        const prPct = seeded.length ? Math.round((prs.length / seeded.length) * 100) : 0;
        const scoring = d.filter(r => r.lvl === 'V' && r.place <= 8).length;
        const uniqueA = new Set(d.filter(r => !r.a.includes('Medford')).map(r => r.a));
        const wins = d.filter(r => r.lvl === 'V' && r.place === 1).length;
        const resultsPageUrl = getResultsUrl(meet.id);

        let rows = d;
        if (resView === 'varsity') rows = d.filter(r => r.lvl === 'V');
        else if (resView === 'jv') rows = d.filter(r => r.lvl === 'JV');
        else if (resView === 'prs') rows = d.filter(r => r.pr);
        rows = [...rows].sort((a, b) => { if (a.lvl !== b.lvl) return a.lvl === 'V' ? -1 : 1; return a.place - b.place; });

        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
              {RESULTS.map(r => (
                <button key={r.date} style={btnS(resMeet === r.date)} onClick={() => setResMeet(r.date)}>
                  {r.meet} {r.date.slice(5)}
                </button>
              ))}
            </div>

            <div style={{ fontWeight:800, fontSize:'1.1rem', textTransform:'uppercase' }}>{meet.meet}</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:8 }}>
              {new Date(meet.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })} · {meet.teams} teams
            </div>

            {resultsPageUrl && (
              <button onClick={() => window.open(resultsPageUrl, '_blank')} style={{ ...btn, marginBottom:12, display:'inline-flex', alignItems:'center', gap:6 }}>
                📊 Visual Results Breakdown →
              </button>
            )}

            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:BDR, marginBottom:14 }}>
              <div style={{ background:'#111', padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:G }}>{prPct}%</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>PR Rate</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>{prs.length} of {seeded.length} seeded</div>
              </div>
              <div style={{ background:'#111', padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:R }}>{scoring}</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>Top-8 Varsity</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>scoring positions</div>
              </div>
              <div style={{ background:'#111', padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:wins > 0 ? Y : '#fff' }}>{wins > 0 ? wins : uniqueA.size}</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>{wins > 0 ? 'Event Wins' : 'Athletes'}</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>{wins > 0 ? '🥇' : 'competed'}</div>
              </div>
              <div style={{ background:'#111', padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:Y }}>{d.length}</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>Performances</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>total entries</div>
              </div>
            </div>

            <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
              {['summary', 'varsity', 'jv', 'prs'].map(k => (
                <button key={k} style={btnS(resView === k)} onClick={() => setResView(k)}>
                  {k === 'prs' ? 'PRs Only' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>

            {rows.map((r, i) => {
              const isPr = r.pr;
              const hasSeed = r.seed && r.seed.length > 0;
              const placeColor = r.place <= 3 ? G : r.place <= 8 ? Y : 'rgba(255,255,255,.5)';
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${isPr ? G : r.place <= 8 ? Y : 'rgba(255,255,255,.08)'}`, marginBottom:2 }}>
                  <div style={{ minWidth:28, textAlign:'center' }}>
                    <span style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', color:placeColor }}>{r.place}</span>
                    <span style={{ fontSize:'.45rem', color:'#555', display:'block' }}>/{r.of}</span>
                  </div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontWeight:700, fontSize:'.82rem' }}>
                      {r.a}
                      <span style={bd(r.lvl === 'V' ? R : '#555')}>{r.lvl}</span>
                      {isPr && <span style={bd(G)}>PR</span>}
                      {r.place === 1 && <span style={bd(Y)}>🥇</span>}
                    </div>
                    <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.4)' }}>
                      {r.e}{hasSeed ? ` · Seed: ${r.seed}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.95rem' }}>{r.mark}</div>
                    {hasSeed && (
                      <div style={{ fontSize:'.6rem', fontWeight:700, color: isPr ? G : R }}>
                        {isPr ? '↑ PR' : '↓ OFF'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {tab === 'practice' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          {pracLoad && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>📋</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', textTransform:'uppercase', color:R }}>Generating Today&apos;s Practice Plan...</div>
              <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.4)', marginTop:8 }}>Building workout based on training phase and meet schedule</div>
            </div>
          )}
          {pracPlan && !pracPlan.isOff && !pracPlan.error && (
            <>
              <div style={{ border:`1px solid rgba(255,255,255,.06)`, background:'radial-gradient(circle at top right,rgba(204,0,0,.12),transparent 30%),linear-gradient(135deg,#151515,#0f0f0f)', padding:'2rem', marginBottom:'1.5rem' }}>
                <div style={{ fontSize:'.65rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.3em', color:R, marginBottom:6 }}>MASH Track & Field</div>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'clamp(1.6rem,4vw,2.4rem)', textTransform:'uppercase', lineHeight:1, marginBottom:8 }}>
                  {pracPlan.day} <span style={{color:R}}>Practice Plan</span>
                </div>
                <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,.5)', marginBottom:'1.2rem' }}>{pracPlan.date}</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[['Phase',pracPlan.phase],['Next Meet',pracPlan.nextMeet||'TBD'],['R.A.I.D.E.R.S.',pracPlan.raidersValue]].map(([l,v],i) => (
                    <div key={i} style={{ background:'rgba(255,255,255,.04)', border:`1px solid rgba(255,255,255,.06)`, padding:'10px 12px' }}>
                      <div style={{ fontSize:'.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:R, marginBottom:3 }}>{l}</div>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.9rem' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
              {pracPlan.blocks && pracPlan.blocks.map((block, i) => (
                <div key={i} style={{ display:'grid', gridTemplateColumns:'140px 1fr', border:`1px solid rgba(255,255,255,.06)`, background:'#1a1a1a', marginBottom:8 }}>
                  <div style={{ background:'linear-gradient(180deg,#1e1e1e,#161616)', borderRight:`1px solid rgba(255,255,255,.06)`, padding:'1rem .8rem' }}>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.95rem', color:R, lineHeight:1.1 }}>{block.time}</div>
                    {block.duration && <div style={{ fontSize:'.6rem', color:'#555', marginTop:4 }}>{block.duration}</div>}
                  </div>
                  <div style={{ padding:'1rem 1.2rem' }}>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'1rem', textTransform:'uppercase', marginBottom:6 }}>{block.title}</div>
                    {block.content && <div style={{ fontSize:'.82rem', color:'rgba(255,255,255,.6)', lineHeight:1.6, marginBottom:6 }}>{block.content}</div>}
                    {block.bullets && block.bullets.map((b, j) => (
                      <div key={j} style={{ fontSize:'.82rem', color:'rgba(255,255,255,.6)', lineHeight:1.6, paddingLeft:'1rem', position:'relative' }}>
                        <span style={{ position:'absolute', left:0, width:5, height:5, background:R, top:8 }} />{b}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {pracPlan.groups && pracPlan.groups.length > 0 && (
                <>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, margin:'20px 0 10px' }}>Event Group Workouts</div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:8 }}>
                    {pracPlan.groups.map((g, i) => (
                      <div key={i} style={{ background:'#1a1a1a', border:`1px solid rgba(255,255,255,.06)`, padding:'1.2rem', borderTop:`3px solid ${R}` }}>
                        <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'1rem', textTransform:'uppercase', marginBottom:2 }}>{g.name}</div>
                        <div style={{ fontSize:'.68rem', color:R, fontWeight:600, marginBottom:10 }}>Coach: {g.coach}</div>
                        {g.workout && g.workout.map((w, j) => (
                          <div key={j} style={{ fontSize:'.82rem', color:'rgba(255,255,255,.6)', lineHeight:1.6, paddingLeft:'1rem', position:'relative', marginBottom:2 }}>
                            <span style={{ position:'absolute', left:0, width:5, height:5, background:R, top:8 }} />{w}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </>
              )}
              {pracPlan.closingMessage && (
                <div style={{ borderLeft:`3px solid ${R}`, background:'rgba(204,0,0,.06)', padding:'1rem 1.2rem', marginTop:16 }}>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:600, fontSize:'.9rem', color:'rgba(255,255,255,.8)', lineHeight:1.5, fontStyle:'italic' }}>&ldquo;{pracPlan.closingMessage}&rdquo;</div>
                </div>
              )}
              <div style={{ background:R, padding:'12px 16px', marginTop:12, textAlign:'center', fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.8rem', textTransform:'uppercase', letterSpacing:'.06em' }}>1% Better Every Day · E + R = O · Go Raiders</div>
            </>
          )}
          {pracPlan && pracPlan.isOff && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>😴</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>Rest Day — {pracPlan.day}</div>
              <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,.5)', marginTop:8, maxWidth:400, margin:'8px auto 0' }}>{pracPlan.closingMessage}</div>
            </div>
          )}
          {pracPlan && pracPlan.error && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>⚠️</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', textTransform:'uppercase', color:R }}>Plan Unavailable</div>
              <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,.5)', marginTop:8 }}>{pracPlan.error}</div>
            </div>
          )}
        </div>
      )}

      {tab === 'meets' && !meetView && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:8 }}>Schedule</div>
          {MEETS.map(m => {
            const d = Math.ceil((new Date(m.date)-NOW)/86400000);
            const hasResults = RESULTS?.some(r => r.id === m.id);
            const hasGuide = GUIDE_URLS && GUIDE_URLS[m.id];
            const hasLineup = m.hasLineup;
            return (
              <div key={m.id} onClick={() => { if (hasLineup || hasGuide || hasResults) setMeetView(m.id); }} style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6, opacity:d<0?.3:1, cursor:(hasLineup||hasGuide||hasResults)?'pointer':'default' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'.85rem' }}>{m.name} <span style={{ color:'#555', fontWeight:400 }}>({m.g})</span></div>
                    <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)' }}>{m.date} · {m.loc}{m.bus ? ` · Bus ${m.bus}` : ''}</div>
                    {m.deadline && <div style={{ fontSize:'.65rem', color:Y, fontWeight:600 }}>Deadline: {m.deadline}</div>}
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center', flexWrap:'wrap' }}>
                    <span style={bd(m.type==='home'||m.type==='conf'||m.type==='regional'||m.type==='sectional'?R:'#555')}>{m.type}</span>
                    {d>=0 && d<=7 && <span style={bd(Y)}>{d}d</span>}
                    {hasResults && <span style={bd(G)}>Results</span>}
                    {hasLineup && <span style={bd(G)}>Lineup</span>}
                    {hasGuide && <span style={bd(B)}>Guide</span>}
                    {(hasLineup||hasGuide||hasResults) && <span style={{color:R,fontSize:'.8rem'}}>→</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'meets' && meetView && (() => {
        const m = MEETS.find(x => x.id === meetView);
        if (!m) return null;
        const lineups = getLineups(meetView);
        const meetResults = RESULTS?.find(r => r.id === meetView);
        const guideUrl = GUIDE_URLS && GUIDE_URLS[meetView];
        const resultsPageUrl = getResultsUrl(meetView);
        const d = Math.ceil((new Date(m.date)-NOW)/86400000);

        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            <button onClick={() => setMeetView(null)} style={{ ...btnO, marginBottom:12, padding:'6px 14px' }}>← Back to Schedule</button>
            <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'14px', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:'1.1rem', textTransform:'uppercase' }}>{m.name} ({m.g})</div>
              <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginTop:4 }}>
                {new Date(m.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · {m.loc} · Start {m.start}{m.bus ? ` · Bus ${m.bus}` : ''}{m.deadline ? ` · Deadline: ${m.deadline}` : ''}
              </div>
              <div style={{ display:'flex', gap:6, marginTop:10, flexWrap:'wrap' }}>
                {guideUrl && <button onClick={() => window.open(guideUrl, '_blank')} style={btn}>📋 Meet Day Guide</button>}
                {meetResults && <button onClick={() => { setResMeet(meetResults.date); setTab('results'); setMeetView(null); }} style={{ ...btn, background:G }}>📊 View Results</button>}
                {resultsPageUrl && <button onClick={() => window.open(resultsPageUrl, '_blank')} style={{ ...btn, background:B }}>📊 Visual Breakdown</button>}
                {d >= 0 && d <= 3 && <span style={{ ...bd(Y), fontSize:'.65rem', padding:'6px 10px' }}>⚡ {d === 0 ? 'TODAY' : d + 'd away'}</span>}
              </div>
              {MEET_LINKS && MEET_LINKS[meetView] && (
                <div style={{ display:'flex', gap:6, marginTop:8, flexWrap:'wrap' }}>
                  {MEET_LINKS[meetView].map((link, li) => (
                    <button key={li} onClick={() => window.open(link.url, '_blank')} style={{ ...btnO, fontSize:'.65rem', padding:'6px 12px' }}>{link.label}</button>
                  ))}
                </div>
              )}
            </div>

            {lineups && lineups.map((group, gi) => (
              <div key={gi}>
                <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:group.gender==='G'?Y:R, marginTop:16, marginBottom:8 }}>{group.label}</div>
                {group.data.map((ev, ei) => (
                  <div key={ei} style={{ background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${group.gender==='G'?Y:R}`, padding:'10px 14px', marginBottom:4 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                      <span style={{ fontWeight:700, fontSize:'.85rem' }}>{ev.e}</span>
                      {ev.a.some(a => a.includes('WC')) && <span style={bd(B)}>Wildcard</span>}
                    </div>
                    <div style={{ marginTop:4 }}>
                      {ev.a.map((a, ai) => (
                        <div key={ai} style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', padding:'2px 0', display:'flex', justifyContent:'space-between' }}>
                          <span>{a}</span>
                          {ev.seed && ev.seed[ai] && <span style={{ color:'rgba(255,255,255,.4)', fontSize:'.72rem' }}>{ev.seed[ai]}</span>}
                        </div>
                      ))}
                    </div>
                    {ev.note && <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.35)', marginTop:4, fontStyle:'italic' }}>{ev.note}</div>}
                    {ev.n && <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.35)', marginTop:4, fontStyle:'italic' }}>{ev.n}</div>}
                  </div>
                ))}
              </div>
            ))}

            {!lineups && !meetResults && (
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'20px', textAlign:'center' }}>
                <div style={{ fontSize:'.8rem', color:'rgba(255,255,255,.4)' }}>No lineup or entries loaded for this meet yet.</div>
              </div>
            )}
          </div>
        );
      })()}

      {tab === 'athletes' && !selectedAth && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {['all','boys','girls','alerts'].map(k => <button key={k} style={btnS(athF===k)} onClick={() => setAthF(k)}>{k}</button>)}
            </div>
            <div style={{ fontSize:'.55rem', color:liveRoster?G:'#555', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:liveRoster?G:'#555' }} />
              {liveRoster ? `Live · ${rosterData.length}` : `Offline · ${rosterData.length}`}
            </div>
          </div>
          <input style={{ ...input, marginBottom:10 }} placeholder="Search..." value={athQ} onChange={e => setAthQ(e.target.value)} />
          {rosterData.filter(a => {
            if (athF==='boys' && a.gn!=='M') return false;
            if (athF==='girls' && a.gn!=='F') return false;
            if (athF==='alerts' && getSt(a.n)==='available') return false;
            if (athQ && !a.n.toLowerCase().includes(athQ.toLowerCase())) return false;
            return true;
          }).map((a, i) => {
            const st = getSt(a.n);
            const athResults = getResultsForAthlete(a.n);
            return (
              <div key={i} onClick={() => setSelectedAth(a)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:`1px solid ${BDR}`, fontSize:'.8rem', cursor:'pointer' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:stCol(st), flexShrink:0 }} />
                <span style={{ fontWeight:600, flex:1 }}>{a.n}</span>
                {athResults.length > 0 && <span style={bd(B)}>{athResults.length} results</span>}
                <span style={{ color:'#555', fontSize:'.7rem' }}>{a.gn}·{a.g}·{a.p1||'TBD'}</span>
                {a.inj && !['No','None','N/A','Nope','no','none','No no no',''].includes(a.inj) && <span style={bd(R)}>⚠</span>}
                <select value={st} onClick={e => e.stopPropagation()} onChange={e => setStatuses(p => ({...p,[a.n]:e.target.value}))} style={{ background:'#222', border:`1px solid ${BDR}`, color:'#fff', padding:'3px 6px', fontSize:'.65rem' }}>
                  {['available','modified','limited','injured','unavailable'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'athletes' && selectedAth && (() => {
        const athResults = getResultsForAthlete(selectedAth.n);
        const officialBests = getOfficialBests(selectedAth.n);
        const nextMeetEntry = getNextMeetEntry(selectedAth, NOW);
        const athleteStatus = getSt(selectedAth.n);
        const nextMeetDays = nextMeetEntry ? nextMeetEntry.daysAway : (dtn ?? 14);
        const practiceFocus = getPracticeFocus(selectedAth, pracPlan, nextMeetDays);
        const fuelingTip = getFuelingTip(selectedAth, nextMeetDays);
        const targetNote = getTargetNote(nextMeetEntry, officialBests);
        const latestPr = athResults.find(r => r.pr) || null;
        const bestFinish = athResults.filter(r => r.place > 0).sort((a, b) => a.place - b.place)[0] || null;
        const recentResult = athResults[0] || null;
        const athleteMessage = buildAthleteMessage(selectedAth, NOW, practiceFocus, nextMeetEntry, officialBests, latestPr, athleteStatus);
        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            <button onClick={() => setSelectedAth(null)} style={{ ...btnO, marginBottom:12, padding:'6px 14px' }}>← Back to Roster</button>
            <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'16px', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{selectedAth.n}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.5)', marginTop:4 }}>Grade {selectedAth.g} · {selectedAth.gn==='M'?'Boys':'Girls'} · Primary: {selectedAth.p1||'TBD'} · Secondary: {selectedAth.p2||'TBD'}</div>
            </div>
            <div style={{ background:'linear-gradient(135deg,#1a0505,#0f0f0f)', border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'14px 16px', marginBottom:10 }}>
              <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.18em', color:R, marginBottom:6 }}>Athlete Daily Brief</div>
              <div style={{ fontSize:'.9rem', lineHeight:1.6, color:'rgba(255,255,255,.88)' }}>{athleteMessage}</div>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:10 }}>
                <span style={bd(practiceFocus.source === 'plan' ? G : Y)}>
                  {practiceFocus.source === 'plan' ? `Practice Live · ${practiceFocus.phase}` : `Practice Fallback · ${practiceFocus.phase}`}
                </span>
                <span style={bd(athleteStatus === 'available' ? G : athleteStatus === 'modified' || athleteStatus === 'limited' ? Y : R)}>
                  Status: {athleteStatus}
                </span>
                {nextMeetEntry ? <span style={bd(nextMeetEntry.daysAway <= 1 ? R : Y)}>{nextMeetEntry.meet.name} · {getMeetCountdown(nextMeetEntry.daysAway)}</span> : null}
              </div>
              {pracLoad && !pracPlan && <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.35)', marginTop:8 }}>Loading today&apos;s practice plan for a more specific group message...</div>}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:10 }}>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Practice Today</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.75)', marginBottom:6 }}>
                  {practiceFocus.title}
                  {practiceFocus.coach ? ` · Coach ${practiceFocus.coach}` : ''}
                </div>
                {practiceFocus.bullets.map((item, i) => (
                  <div key={i} style={{ fontSize:'.74rem', color:'rgba(255,255,255,.55)', lineHeight:1.5, marginBottom:4 }}>• {item}</div>
                ))}
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Next Meet</div>
                {nextMeetEntry ? (
                  <>
                    <div style={{ fontSize:'.82rem', fontWeight:700 }}>{nextMeetEntry.meet.name}</div>
                    <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.45)', marginTop:3 }}>
                      {nextMeetEntry.meet.date} · {nextMeetEntry.meet.loc} · {getMeetCountdown(nextMeetEntry.daysAway)}
                      {nextMeetEntry.meet.bus ? ` · Bus ${nextMeetEntry.meet.bus}` : ''}
                    </div>
                    <div style={{ marginTop:8 }}>
                      {nextMeetEntry.entries.map((entry, i) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', gap:8, padding:'4px 0', borderBottom:i < nextMeetEntry.entries.length - 1 ? `1px solid ${BDR}` : 'none' }}>
                          <div>
                            <div style={{ fontSize:'.76rem', color:'rgba(255,255,255,.8)' }}>{entry.event}</div>
                            <div style={{ fontSize:'.6rem', color:'rgba(255,255,255,.35)' }}>{entry.time}{entry.note ? ` · ${entry.note}` : ''}</div>
                          </div>
                          <div style={{ fontSize:'.68rem', color:'rgba(255,255,255,.45)', textAlign:'right' }}>{entry.seed || 'Unseeded'}</div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>No next-meet entries are loaded for this athlete yet. The schedule exists, but the app needs a lineup sheet for their next meet.</div>
                )}
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Fueling Note</div>
                <div style={{ fontSize:'.76rem', color:'rgba(255,255,255,.6)', lineHeight:1.6 }}>{fuelingTip}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Target To Chase</div>
                <div style={{ fontSize:'.76rem', color:'rgba(255,255,255,.6)', lineHeight:1.6 }}>{targetNote}</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Contact',`📱 ${selectedAth.ph||'No phone'}\n🚨 ${selectedAth.em||'No emergency contact'}`],['Reported All-Time PRs',selectedAth.pr||'None recorded'],['Health / Injuries',selectedAth.inj||'None reported'],['Season Goal',selectedAth.goal||'Not specified'],['R.A.I.D.E.R.S. Focus',selectedAth.rv||'Not specified'],['Schedule Conflicts',selectedAth.conf||'None']].map(([l,v],i) => (
                <div key={i} style={{ background:CARD, border:`1px solid ${l==='Health / Injuries'&&selectedAth.inj&&!['No','None','N/A','Nope','no','none','','No no no'].includes(selectedAth.inj)?'rgba(204,0,0,.3)':BDR}`, padding:'12px' }}>
                  <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)', whiteSpace:'pre-wrap' }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:8 }}>Official Best Marks</div>
            {officialBests.length > 0 ? (
              <>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8 }}>
                  {officialBests.map((best, i) => (
                    <div key={i} style={{ background:CARD, border:`1px solid ${BDR}`, padding:'10px 12px' }}>
                      <div style={{ fontSize:'.58rem', fontWeight:800, textTransform:'uppercase', color:'#666' }}>{best.eventLabel}</div>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.15rem', color:'#fff', marginTop:4 }}>{best.mark}</div>
                      <div style={{ fontSize:'.62rem', color:'rgba(255,255,255,.4)', marginTop:3 }}>{best.meetName} · {best.meetDate}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:8, marginTop:8 }}>
                  <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#666' }}>Latest PR</div>
                    <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.78)', marginTop:4 }}>{latestPr ? `${canonicalEventLabel(latestPr.e)} · ${latestPr.mark}` : 'No official PR tagged yet'}</div>
                  </div>
                  <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#666' }}>Best Finish</div>
                    <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.78)', marginTop:4 }}>{bestFinish ? `${bestFinish.place}${bestFinish.place === 1 ? 'st' : bestFinish.place === 2 ? 'nd' : bestFinish.place === 3 ? 'rd' : 'th'} · ${canonicalEventLabel(bestFinish.e)}` : 'No placing data yet'}</div>
                  </div>
                  <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#666' }}>Most Recent Result</div>
                    <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.78)', marginTop:4 }}>{recentResult ? `${canonicalEventLabel(recentResult.e)} · ${recentResult.mark}` : 'No official result loaded'}</div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', fontSize:'.76rem', color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
                No official results are loaded for this athlete yet. The app can still show their reported all-time PRs, but it needs official meet results to build a true performance snapshot.
              </div>
            )}
            {athResults.length > 0 && (
              <>
                <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:8 }}>Meet Results ({athResults.length})</div>
                {athResults.map((r, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 12px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${r.pr ? G : r.place <= 8 ? Y : 'rgba(255,255,255,.08)'}`, marginBottom:2 }}>
                    <div style={{ minWidth:28, textAlign:'center' }}>
                      <span style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', color:r.place<=3?G:r.place<=8?Y:'rgba(255,255,255,.5)' }}>{r.place}</span>
                      <span style={{ fontSize:'.45rem', color:'#555', display:'block' }}>/{r.of}</span>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:'.82rem' }}>
                        {canonicalEventLabel(r.e)}
                        <span style={bd(r.lvl === 'V' ? R : '#555')}>{r.lvl}</span>
                        {r.pr ? <span style={bd(G)}>PR</span> : null}
                      </div>
                      <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)' }}>{r.meetName} · {r.meetDate}{r.seed ? ` · Seed: ${r.seed}` : ''}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.95rem' }}>{r.mark}</div>
                      {r.seed && <div style={{ fontSize:'.55rem', fontWeight:700, color:r.pr?G:R }}>{r.pr?'↑ PR':'↓ OFF'}</div>}
                    </div>
                  </div>
                ))}
              </>
            )}
            {/* ── STRATFORD EVENT DRILL-DOWN ── */}
            {(() => {
              const lineupSrc = selectedAth.gn === 'F' ? STRATFORD_GIRLS : STRATFORD_BOYS;
              const athEvents = [];
              if (lineupSrc) {
                for (const evt of lineupSrc) {
                  const idx = evt.a.findIndex(name => name && namesMatch(name, selectedAth.n));
                  const exactIdx = evt.a.indexOf(selectedAth.n);
                  const matchIdx = exactIdx !== -1 ? exactIdx : idx;
                  if (matchIdx !== -1 && evt.a[matchIdx]) {
                    const sched = STRATFORD_SCHEDULE ? STRATFORD_SCHEDULE.find(s => s.e === evt.e || s.e.startsWith(evt.e) || evt.e.startsWith(s.e)) : null;
                    athEvents.push({
                      event: evt.e,
                      pos: matchIdx + 1,
                      posLabel: evt.e.includes('Relay') ? `Leg ${matchIdx+1}` : `Entry ${matchIdx+1}`,
                      time: sched ? sched.time : '—',
                      order: sched ? sched.order : 99,
                      type: sched ? sched.type : 'unknown',
                      isNew: evt.note && (evt.note.includes('added 4/8') || evt.note.includes('updated 4/8')),
                    });
                  }
                }
              }
              athEvents.sort((a,b) => a.order - b.order);
              const runCount = athEvents.filter(e => e.type==='running'||e.type==='relay').length;
              const fieldCount = athEvents.filter(e => e.type==='field').length;
              const total = athEvents.length;
              const atMax = total >= 4;

              if (athEvents.length === 0) return null;
              return (
                <>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:4 }}>Stratford Lineup ({total} Events)</div>
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'8px 14px', flex:1 }}>
                      <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#555' }}>Events</div>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.4rem', color:atMax?R:G }}>{total}/4</div>
                      {atMax && <div style={{ fontSize:'.55rem', color:R, fontWeight:700 }}>AT MAX</div>}
                    </div>
                    <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'8px 14px', flex:1 }}>
                      <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#555' }}>WIAA Check</div>
                      <div style={{ fontSize:'.75rem', marginTop:4 }}>
                        <span style={{ color:runCount<=3?G:R }}>Run: {runCount}/3</span>
                        <span style={{ color:'#333' }}> · </span>
                        <span style={{ color:fieldCount<=3?G:R }}>Fld: {fieldCount}/3</span>
                      </div>
                    </div>
                  </div>
                  {athEvents.map((ev, i) => {
                    const timeBg = ev.type==='field' ? R : Y;
                    return (
                      <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${timeBg}`, marginBottom:2 }}>
                        <div style={{ background:timeBg, color:'#fff', padding:'4px 8px', borderRadius:2, fontWeight:700, fontSize:'.58rem', minWidth:70, textAlign:'center', alignSelf:'flex-start' }}>{ev.time}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'.82rem' }}>
                            {ev.event}
                            {ev.isNew && <span style={{ ...bd(Y), marginLeft:4 }}>NEW</span>}
                          </div>
                          <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.4)' }}>{ev.posLabel} · <span style={bd(ev.type==='field'?R:ev.type==='relay'?B:'#555')}>{ev.type}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </>
              );
            })()}
            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={btn}>🍽️ Generate Meal Plan</button>
              <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={{ ...btn, background:'#222' }}>🏋️ Generate Workout</button>
            </div>
          </div>
        );
      })()}

      {tab === 'plans' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:4 }}>Athlete Plans</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>AI-generated meal + workout plans using each athlete&apos;s actual PRs, injuries, goals, and training phase.</div>
          <select style={{ ...input, marginBottom:12 }} value="" onChange={e => { const a = rosterData.find(x => x.n === e.target.value); if(a) genPlans(a); }}>
            <option value="">Select athlete...</option>
            {rosterData.map((a, i) => <option key={i} value={a.n}>{a.n} ({a.gn}·Gr{a.g}·{a.p1||'TBD'})</option>)}
          </select>
          {planLoad && <div style={{ textAlign:'center', padding:30, color:R, fontWeight:700 }}>Generating plans for {planA?.n}...</div>}
          {planA && !planLoad && (
            <>
              <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'12px 14px', marginBottom:6 }}>
                <div style={{ fontWeight:800, fontSize:'1rem', textTransform:'uppercase' }}>{planA.n}</div>
                <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)' }}>
                  Gr {planA.g} · {planA.gn==='M'?'Boys':'Girls'} · {planA.p1||'TBD'} · Phase: {dtn<=2?'SHARPEN':dtn<=5?'BUILD':'DEVELOP'}
                  {planA.pr && planA.pr !== 'N/A' && ` · PR: ${planA.pr.substring(0,50)}`}
                  {planA.inj && !['No','None','N/A','Nope','no','none',''].includes(planA.inj) && ` · ⚠ ${planA.inj.substring(0,40)}`}
                </div>
              </div>
              {meal && (
                <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6 }}>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:6 }}>🍽️ Meal Plan</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{meal}</div>
                </div>
              )}
              {work && (
                <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6 }}>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:6 }}>🏋️ Workout Plan</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{work}</div>
                </div>
              )}
            </>
          )}
          {!planA && !planLoad && (
            <div style={{ textAlign:'center', padding:40, color:'#333' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>🍽️🏋️</div>
              <div style={{ fontWeight:700, textTransform:'uppercase' }}>Select an Athlete</div>
              <div style={{ fontSize:'.75rem', color:'#444', marginTop:4 }}>Or click any name on the Roster tab → Generate Plans</div>
            </div>
          )}
        </div>
      )}

      {tab === 'msg' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:4 }}>Team Messaging</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>Compose a message, then copy it to TeamReach (MASH TRACK 2026 · Code: M7155705718)</div>
          <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', marginBottom:10 }}>
            <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Quick Templates</div>
            {[
              ['🚌 Meet Day Bus Reminder', `Meet Day Reminder\n\nWe have a meet tomorrow at [LOCATION]. Bus leaves at [TIME] from the school.\n\nBring: uniform, spikes, water bottle, snacks\nBe ready 15 minutes before departure.\n\nE+R=O. Let's compete! 🏃`],
              ['📋 Practice Update', `Practice Update\n\n[DAY] practice:\n• Warm-up 3:30\n• Group work 3:45-5:00\n• Cool down + stretch\n\nWednesday reminder: ends at 5:00 PM\n\n1% Better Every Day.`],
              ['📅 Week Preview', `MASH Track Week Preview\n\nMon — Practice 3:30-5:30\nTue — [MEET/PRACTICE]\nWed — Practice 3:30-5:00 (ends early)\nThu — [MEET/PRACTICE]\nFri — [MEET/PRACTICE]\n\nGo Raiders! 🔴`],
              ['⚡ Competition Mindset', `Competition Day Mindset\n\nRemember:\n• E + R = O (Event + Response = Outcome)\n• Control what you can control\n• Compete against YOUR last performance\n• Support your teammates\n\n1% Better Every Day. Let's go Raiders!`],
            ].map(([label, body], i) => (
              <div key={i} onClick={() => setMsgBody(body)} style={{ padding:'8px 10px', borderBottom:`1px solid ${BDR}`, cursor:'pointer', fontSize:'.78rem' }}>
                <span style={{ color:R, fontWeight:700 }}>{label}</span>
              </div>
            ))}
          </div>
          <textarea style={{ ...input, minHeight:200, resize:'vertical', marginBottom:8 }} placeholder="Type or select a template above..." value={msgBody} onChange={e => setMsgBody(e.target.value)} />
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={copyMsg} style={btn}>{copied ? '✓ Copied!' : '📋 Copy for TeamReach'}</button>
            <button onClick={() => setMsgBody('')} style={btnO}>Clear</button>
          </div>
          <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', marginTop:16 }}>
            <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>How to Send</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
              1. Compose or select template above<br/>2. Click &ldquo;Copy for TeamReach&rdquo;<br/>3. Open TeamReach app → MASH TRACK 2026<br/>4. Paste and send<br/><br/>Join code: <strong style={{color:'#fff'}}>M7155705718</strong>
            </div>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto', display:'flex', flexDirection:'column', height:'calc(100vh - 90px)' }}>
          <div style={{ flex:1, overflowY:'auto', marginBottom:10 }} ref={chatRef}>
            {aiMsgs.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:'2rem', marginBottom:8 }}>🤖</div>
                <div style={{ fontWeight:800, fontSize:'1rem', textTransform:'uppercase', marginBottom:8 }}>AI Coaching Assistant</div>
                <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', maxWidth:400, margin:'0 auto 16px' }}>Full program knowledge loaded. Knows every athlete&apos;s PRs, injuries, goals, and event preferences.</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
                  {['Best 4x400 relay combos?','Northern Badger entry strategy','Who can break a school record this year?','Marshfield girls scoring plan','Which injured athletes need modified workouts?'].map((q,i) => (
                    <button key={i} style={{ ...btnO, fontSize:'.6rem', padding:'6px 10px' }} onClick={() => setAiIn(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {aiMsgs.map((m, i) => (
              <div key={i} style={{ marginBottom:10, display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'85%', padding:'10px 14px', background:m.role==='user'?R:CARD, border:`1px solid ${m.role==='user'?'transparent':BDR}`, fontSize:'.82rem', lineHeight:1.6, whiteSpace:'pre-wrap', borderRadius:m.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px' }}>{m.content}</div>
              </div>
            ))}
            {aiLoad && <div style={{ padding:10, fontSize:'.75rem', color:R, fontWeight:700 }}>Thinking...</div>}
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <input value={aiIn} onChange={e => setAiIn(e.target.value)} onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAI();} }} placeholder="Ask your AI coach..." style={{ ...input, flex:1 }} />
            <button style={btn} onClick={sendAI} disabled={aiLoad}>Send</button>
          </div>
        </div>
      )}
    </div>
  );
}
