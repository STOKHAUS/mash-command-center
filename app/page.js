'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FORM_DATA, MEETS, LOCATIONS, ACTIONS, KNOWN_STATUS, RESULTS, CONFLICTS, GUIDE_URLS, RESULTS_URLS, BADGER_BOYS, BADGER_GIRLS, STOUT_BOYS, STOUT_GIRLS, UWSP_BOYS, UWSP_GIRLS, EARLYBIRD_BOYS, EARLYBIRD_GIRLS, EARLYBIRD_SCHEDULE, MEET_LINKS, HOLYCOW_BOYS, HOLYCOW_GIRLS, HOLYCOW_NOTES } from '@/lib/data';

const R='#cc0000',G='#22c55e',Y='#d4a843',B='#4a9eff',CARD='#131313',BDR='rgba(255,255,255,0.06)';

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
  if (meetId === 7 && HOLYCOW_BOYS && HOLYCOW_GIRLS) {
    return [{ label: 'Boys Entries', data: HOLYCOW_BOYS, gender: 'B' }, { label: 'Girls Entries', data: HOLYCOW_GIRLS, gender: 'G' }];
  }
  return null;
}

const wxIcon = c => { if(c<=1)return'☀️';if(c<=3)return'⛅';if(c<=49)return'🌫️';if(c<=69)return'🌧️';if(c<=79)return'🌨️';if(c<=99)return'⛈️';return'🌤️'; };

// Results URL helper
const getResultsUrl = (meetId) => RESULTS_URLS && RESULTS_URLS[meetId] ? RESULTS_URLS[meetId] : null;

export default function Home() {
  const router = useRouter();
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
  const [notesFilter, setNotesFilter] = useState('all');
  const [openNote, setOpenNote] = useState(null);
  const [expandNotes, setExpandNotes] = useState(false);

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
    if (tab !== 'practice' || pracPlan || pracLoad) return;
    setPracLoad(true);
    fetch('/api/practice')
      .then(r => r.json())
      .then(data => { setPracPlan(data); setPracLoad(false); })
      .catch(() => setPracLoad(false));
  }, [tab, pracPlan, pracLoad]);

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

  const getResultsForAthlete = (name) => {
    if (!RESULTS) return [];
    const all = [];
    RESULTS.forEach(meet => {
      meet.data.filter(r => r.a === name).forEach(r => {
        all.push({ ...r, meetName: meet.meet, meetDate: meet.date, teams: meet.teams });
      });
    });
    return all;
  };

  const tabs = [['today','⚡ Today'],['results','📊 Results'],['practice','📋 Practice'],['meets','🏟️ Meets'],['athletes','👤 Roster'],['plans','🍽️ Plans'],['msg','📱 Message'],['ai','🤖 AI'],['references','📄 References']];
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
          <button key={k} onClick={() => { if(k==='references') router.push('/references'); else { setTab(k); setMeetView(null); } }} style={{ padding:'10px 12px', background:tab===k?'rgba(204,0,0,.12)':'transparent', color:tab===k?'#fff':'#666', borderBottom:tab===k?`2px solid ${R}`:'2px solid transparent', fontWeight:700, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.08em', whiteSpace:'nowrap', flexShrink:0 }}>{l}</button>
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


          {/* HOLY COW INVITATIONAL — ATHLETE MEET NOTES */}
          {HOLYCOW_NOTES && HOLYCOW_NOTES.length > 0 && (
            <div style={{ background:'linear-gradient(135deg,#1a0a00,#0a0a0a)', border:`2px solid ${Y}`, padding:'14px', marginBottom:14 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:Y }}>Tomorrow&apos;s Meet</div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', textTransform:'uppercase', letterSpacing:'.06em' }}>Holy Cow Invitational — Athlete Notes</div>
                  <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.4)', marginTop:2 }}>Stratford · {HOLYCOW_NOTES.length} athletes · Personalized coaching notes</div>
                </div>
                <div style={{ fontSize:'1.6rem' }}>🐄</div>
              </div>
              <div style={{ display:'flex', gap:4, marginBottom:10 }}>
                <button onClick={() => setNotesFilter('all')} style={btnS(notesFilter==='all')}>All ({HOLYCOW_NOTES.length})</button>
                <button onClick={() => setNotesFilter('B')} style={btnS(notesFilter==='B')}>Boys ({HOLYCOW_NOTES.filter(x=>x.g==='B').length})</button>
                <button onClick={() => setNotesFilter('G')} style={btnS(notesFilter==='G')}>Girls ({HOLYCOW_NOTES.filter(x=>x.g==='G').length})</button>
              </div>
              <div style={{ maxHeight: expandNotes ? 'none' : 320, overflow:'hidden', position:'relative' }}>
                {HOLYCOW_NOTES.filter(x => notesFilter==='all' || x.g===notesFilter).map((ath, i) => (
                  <div key={i} onClick={() => setOpenNote(openNote===i?null:i)} style={{ background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${ath.g==='B'?B:'#e84393'}`, padding:'10px 12px', marginBottom:3, cursor:'pointer' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <div>
                        <span style={{ fontWeight:700, fontSize:'.82rem' }}>{ath.n}</span>
                        <span style={{ fontSize:'.6rem', color:'#555', marginLeft:6 }}>{ath.g==='B'?'Boys':'Girls'}</span>
                      </div>
                      <div style={{ fontSize:'.6rem', color:'#555', fontWeight:700 }}>{openNote===i?'▼':'▶'}</div>
                    </div>
                    {openNote===i && (
                      <div style={{ marginTop:8 }}>
                        <div style={{ fontSize:'.65rem', color:Y, fontWeight:700, marginBottom:4 }}>{ath.ev}</div>
                        <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.7)', lineHeight:1.5 }}>{ath.note}</div>
                      </div>
                    )}
                  </div>
                ))}
                {!expandNotes && <div style={{ position:'absolute', bottom:0, left:0, right:0, height:60, background:'linear-gradient(transparent,#0a0a0a)' }} />}
              </div>
              <button onClick={() => setExpandNotes(!expandNotes)} style={{ ...btnO, width:'100%', marginTop:8, fontSize:'.6rem' }}>{expandNotes ? 'Collapse Notes' : 'Show All Athlete Notes'}</button>
            </div>
          )}

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
        const prs = indiv.filter(r => r.pr);
          const prPct = indiv.length ? Math.round((prs.length / indiv.length) * 100) : 0;
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
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>{prs.length} of {indiv.length} entries</div>
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
        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            <button onClick={() => setSelectedAth(null)} style={{ ...btnO, marginBottom:12, padding:'6px 14px' }}>← Back to Roster</button>
            <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'16px', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{selectedAth.n}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.5)', marginTop:4 }}>Grade {selectedAth.g} · {selectedAth.gn==='M'?'Boys':'Girls'} · Primary: {selectedAth.p1||'TBD'} · Secondary: {selectedAth.p2||'TBD'}</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {[['Contact',`📱 ${selectedAth.ph||'No phone'}\n🚨 ${selectedAth.em||'No emergency contact'}`],['Personal Records',selectedAth.pr||'None recorded'],['Health / Injuries',selectedAth.inj||'None reported'],['Season Goal',selectedAth.goal||'Not specified'],['R.A.I.D.E.R.S. Focus',selectedAth.rv||'Not specified'],['Schedule Conflicts',selectedAth.conf||'None']].map(([l,v],i) => (
                <div key={i} style={{ background:CARD, border:`1px solid ${l==='Health / Injuries'&&selectedAth.inj&&!['No','None','N/A','Nope','no','none','','No no no'].includes(selectedAth.inj)?'rgba(204,0,0,.3)':BDR}`, padding:'12px' }}>
                  <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>{l}</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)', whiteSpace:'pre-wrap' }}>{v}</div>
                </div>
              ))}
            </div>
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
                        {r.e}
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
            {/* ── EARLY BIRD EVENT DRILL-DOWN ── */}
            {(() => {
              const lineupSrc = selectedAth.gn === 'F' ? EARLYBIRD_GIRLS : EARLYBIRD_BOYS;
              const athEvents = [];
              if (lineupSrc) {
                for (const evt of lineupSrc) {
                  const idx = evt.a.findIndex(name => name && name.toLowerCase().includes(selectedAth.n.split(' ')[1]?.toLowerCase() || '___'));
                  const exactIdx = evt.a.indexOf(selectedAth.n);
                  const matchIdx = exactIdx !== -1 ? exactIdx : idx;
                  if (matchIdx !== -1 && evt.a[matchIdx]) {
                    const sched = EARLYBIRD_SCHEDULE ? EARLYBIRD_SCHEDULE.find(s => s.e === evt.e) : null;
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
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:4 }}>Early Bird Lineup ({total} Events)</div>
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
            {/* ── HOLY COW INVITATIONAL EVENT DRILL-DOWN ── */}
            {(() => {
              const hcSrc = selectedAth.gn === 'F' ? HOLYCOW_GIRLS : HOLYCOW_BOYS;
              const hcEvents = [];
              if (hcSrc) {
                for (const evt of hcSrc) {
                  const lastName = selectedAth.n.split(' ')[1]?.toLowerCase() || '___';
                  const idx = evt.a.findIndex(name => name && name.toLowerCase().includes(lastName));
                  const exactIdx = evt.a.indexOf(selectedAth.n);
                  const matchIdx = exactIdx !== -1 ? exactIdx : idx;
                  if (matchIdx !== -1 && evt.a[matchIdx]) {
                    const isRelay = evt.e.includes('Relay');
                    const isField = ['High Jump','Long Jump','Triple Jump','Pole Vault','Discus','Shot Put'].some(f => evt.e.includes(f));
                    hcEvents.push({
                      event: evt.e,
                      seed: evt.seed ? evt.seed[matchIdx] : null,
                      posLabel: isRelay ? 'Leg ' + (matchIdx+1) : 'Entry ' + (matchIdx+1),
                      type: isField ? 'field' : isRelay ? 'relay' : 'running',
                    });
                  }
                }
              }
              const hcRun = hcEvents.filter(e => e.type==='running'||e.type==='relay').length;
              const hcField = hcEvents.filter(e => e.type==='field').length;
              const hcTotal = hcEvents.length;
              const hcMax = hcTotal >= 4;
              if (hcTotal === 0) return null;
              return (
                <>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:4 }}>Holy Cow Invitational Lineup ({hcTotal} Events)</div>
                  <div style={{ display:'flex', gap:8, marginBottom:10 }}>
                    <div style={{ background:CARD, border:'1px solid ' + BDR, padding:'8px 14px', flex:1 }}>
                      <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#555' }}>Events</div>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.4rem', color:hcMax?R:G }}>{hcTotal}/4</div>
                      {hcMax && <div style={{ fontSize:'.55rem', color:R, fontWeight:700 }}>AT MAX</div>}
                    </div>
                    <div style={{ background:CARD, border:'1px solid ' + BDR, padding:'8px 14px', flex:1 }}>
                      <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', color:'#555' }}>WIAA Check</div>
                      <div style={{ fontSize:'.75rem', marginTop:4 }}>
                        <span style={{ color:hcRun<=3?G:R }}>Run: {hcRun}/3</span>
                        <span style={{ color:'#333' }}> · </span>
                        <span style={{ color:hcField<=3?G:R }}>Fld: {hcField}/3</span>
                      </div>
                    </div>
                  </div>
                  {hcEvents.map((ev, i) => {
                    const evBg = ev.type==='field' ? R : ev.type==='relay' ? B : Y;
                    return (
                      <div key={i} style={{ display:'flex', gap:10, padding:'8px 12px', background:CARD, border:'1px solid ' + BDR, borderLeft:'3px solid ' + evBg, marginBottom:2 }}>
                        <div style={{ background:evBg, color:'#fff', padding:'4px 8px', borderRadius:2, fontWeight:700, fontSize:'.58rem', minWidth:70, textAlign:'center', alignSelf:'flex-start' }}>{ev.seed || '—'}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, fontSize:'.82rem' }}>{ev.event}</div>
                          <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.4)' }}>{ev.posLabel} · <span style={bd(evBg)}>{ev.type}</span></div>
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
