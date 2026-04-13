'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FORM_DATA, MEETS, LOCATIONS, ACTIONS, KNOWN_STATUS, RESULTS, MEET_ENTRIES } from '@/lib/data';

const R='#cc0000',G='#22c55e',Y='#d4a843',B='#4a9eff',CARD='#131313',BDR='rgba(255,255,255,0.06)';

// Merge form data with roster for enriched profiles
function getProfile(name) {
  const n = name.toLowerCase();
  return FORM_DATA.find(f => {
    const fn = f.n.toLowerCase();
    return fn === n || n.includes(fn) || fn.includes(n.split(' ')[0]);
  });
}

const wxIcon = c => { if(c<=1)return'âï¸';if(c<=3)return'â';if(c<=49)return'ð«ï¸';if(c<=69)return'ð§ï¸';if(c<=79)return'ð¨ï¸';if(c<=99)return'âï¸';return'ð¤ï¸'; };

export default function Home() {
  const [tab, setTab] = useState('today');
  const [done, setDone] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [wx, setWx] = useState(null);
  const [mWx, setMWx] = useState(null);
  // AI
  const [aiMsgs, setAiMsgs] = useState([]);
  const [aiIn, setAiIn] = useState('');
  const [aiLoad, setAiLoad] = useState(false);
  const chatRef = useRef(null);
  // Plans
  const [planA, setPlanA] = useState(null);
  const [meal, setMeal] = useState(null);
  const [work, setWork] = useState(null);
  const [planLoad, setPlanLoad] = useState(false);
  // Athletes
  const [athF, setAthF] = useState('all');
  const [athQ, setAthQ] = useState('');
  const [selectedAth, setSelectedAth] = useState(null);
  // Message
  const [msgBody, setMsgBody] = useState('');
  const [copied, setCopied] = useState(false);
  // Practice
  const [pracPlan, setPracPlan] = useState(null);
  const [pracLoad, setPracLoad] = useState(false);
  // Live roster from Google Sheet
  const [liveRoster, setLiveRoster] = useState(null);
  // Results
  const [resMeet, setResMeet] = useState(RESULTS?.length ? RESULTS[0].date : '');
  const [resView, setResView] = useState('summary');

  const NOW = new Date();
  const nm = MEETS.find(m => new Date(m.date) >= NOW);
  const dtn = nm ? Math.ceil((new Date(nm.date) - NOW) / 86400000) : null;
  const getSt = n => statuses[n] || KNOWN_STATUS[n] || 'available';
  const stCol = s => s === 'available' ? G : s === 'injured' || s === 'unavailable' ? R : Y;

  // Persist state
  useEffect(() => {
    try {
      const s = localStorage.getItem('mash-cc');
      if (s) { const d = JSON.parse(s); if(d.done) setDone(d.done); if(d.statuses) setStatuses(d.statuses); if(d.aiMsgs) setAiMsgs(d.aiMsgs); }
    } catch(e) {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem('mash-cc', JSON.stringify({ done, statuses, aiMsgs })); } catch(e) {}
  }, [done, statuses, aiMsgs]);

  // Weather
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

  // Live roster sync from Google Sheet
  useEffect(() => {
    fetch('/api/roster')
      .then(r => r.json())
      .then(data => { if (data.athletes?.length) setLiveRoster(data.athletes); })
      .catch(() => {});
  }, []);

  // Merged roster
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

  // Practice plan
  useEffect(() => {
    if (tab !== 'practice' || pracPlan || pracLoad) return;
    setPracLoad(true);
    fetch('/api/practice')
      .then(r => r.json())
      .then(data => { setPracPlan(data); setPracLoad(false); })
      .catch(() => setPracLoad(false));
  }, [tab, pracPlan, pracLoad]);

  // AI Coach
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

  // Generate Plans
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

  // Copy for TeamReach
  const copyMsg = () => {
    navigator.clipboard.writeText(msgBody);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleDone = id => setDone(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const alerts = rosterData.filter(a => {
    const s = getSt(a.n);
    return s !== 'available';
  });

  // Badge helper
  const bd = (c) => ({ display:'inline-block', fontSize:'.5rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', padding:'2px 6px', marginLeft:4, background:`${c}20`, color:c, border:`1px solid ${c}40` });

  // Weather widget
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
              <div style={{ fontSize:'.75rem', fontWeight:700 }}>{Math.round(data.temperature_2m_max[i])}Â°F</div>
              <div style={{ fontSize:'.6rem', color:'#555' }}>{Math.round(data.temperature_2m_min[i])}Â°</div>
              <div style={{ fontSize:'.52rem', color:data.precipitation_probability_max[i]>40?B:'#444', marginTop:2 }}>ð§{data.precipitation_probability_max[i]}%</div>
              <div style={{ fontSize:'.52rem', color:data.windspeed_10m_max[i]>15?Y:'#444' }}>ð¨{Math.round(data.windspeed_10m_max[i])}mph</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // âââ RESULTS HELPERS âââ
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

  const tabs = [['today','â¡ Today'],['results','ð Results'],['practice','ð Practice'],['meets','ðï¸ Meets'],['athletes','ð¤ Roster'],['plans','ð½ï¸ Plans'],['msg','ð± Message'],['ai','ð¤ AI']];
  const input = { background:'#161616', border:`1px solid rgba(255,255,255,.08)`, color:'#fff', padding:'8px 12px', fontSize:'.8rem', width:'100%' };
  const btn = { padding:'8px 16px', background:R, color:'#fff', border:'none', fontWeight:800, fontSize:'.68rem', textTransform:'uppercase', letterSpacing:'.08em', cursor:'pointer' };
  const btnO = { ...btn, background:'transparent', border:`1px solid rgba(255,255,255,.15)`, fontWeight:600 };
  const btnS = (a) => ({ padding:'5px 10px', background:a?R:'rgba(255,255,255,.04)', color:a?'#fff':'#888', fontWeight:700, fontSize:'.6rem', textTransform:'uppercase', border:a?`1px solid ${R}`:`1px solid rgba(255,255,255,.08)`, cursor:'pointer' });

  return (
    <div>
      {/* TOP BAR */}
      <div style={{ background:`linear-gradient(135deg,#1a0000,#0a0a0a)`, borderBottom:`2px solid ${R}`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', letterSpacing:'.12em', textTransform:'uppercase' }}><span style={{color:R}}>MASH</span> Command Center</div>
        <div style={{ fontSize:'.55rem', color:'#444' }}>v4 Â· 2026</div>
      </div>

      {/* NAV */}
      <div style={{ display:'flex', overflowX:'auto', background:'#111', borderBottom:`1px solid ${BDR}`, position:'sticky', top:44, zIndex:99 }}>
        {tabs.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:'10px 12px', background:tab===k?'rgba(204,0,0,.12)':'transparent', color:tab===k?'#fff':'#666', borderBottom:tab===k?`2px solid ${R}`:'2px solid transparent', fontWeight:700, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.08em', whiteSpace:'nowrap', flexShrink:0 }}>{l}</button>
        ))}
      </div>

      {/* âââ TODAY âââ */}
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

          <WxWidget data={wx} title="Medford (54451) â 7-Day Forecast" />
          {mWx && nm && <WxWidget data={mWx.d} title={`${nm.name} @ ${mWx.loc}`} />}

          {/* MEET ENTRIES LINEUP */}
          {MEET_ENTRIES && nm && nm.id === MEET_ENTRIES.meetId && (
            <div style={{ background:'linear-gradient(135deg,#111,#0a0a0a)', border:`1px solid ${BDR}`, padding:14, marginBottom:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                <div>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R }}>Confirmed Lineup</div>
                  <div style={{ fontWeight:800, fontSize:'.95rem', textTransform:'uppercase' }}>{MEET_ENTRIES.meet}</div>
                  <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.4)' }}>{MEET_ENTRIES.date} Â· {MEET_ENTRIES.loc}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.4rem', color:R }}>{MEET_ENTRIES.totalEntries}</div>
                  <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', color:'#555' }}>Total Entries</div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:1, background:BDR, marginBottom:10 }}>
                <div style={{ background:'#111', padding:8, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'1.1rem' }}>{MEET_ENTRIES.girlsEntries}</div>
                  <div style={{ fontSize:'.5rem', color:'#555', fontWeight:700, textTransform:'uppercase' }}>Girls Entries</div>
                </div>
                <div style={{ background:'#111', padding:8, textAlign:'center' }}>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'1.1rem' }}>{MEET_ENTRIES.boysEntries}</div>
                  <div style={{ fontSize:'.5rem', color:'#555', fontWeight:700, textTransform:'uppercase' }}>Boys Entries</div>
                </div>
              </div>
              {MEET_ENTRIES.events.map((ev, i) => (
                <div key={i} style={{ marginBottom:1 }}>
                  <div style={{ background:'rgba(204,0,0,.08)', padding:'5px 8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'.65rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.06em', color:'rgba(255,255,255,.7)' }}>{ev.event}</span>
                    <span style={{ fontSize:'.55rem', color:'#555' }}>{ev.athletes.length}</span>
                  </div>
                  <div style={{ padding:'4px 8px', background:'rgba(255,255,255,.02)' }}>
                    {ev.athletes.map((a, j) => {
                      const st = getSt(a.n);
                      return (
                        <div key={j} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'2px 0', fontSize:'.72rem' }}>
                          <span style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <span style={{ width:5, height:5, borderRadius:'50%', background:stCol(st), display:'inline-block', flexShrink:0 }} />
                            {a.n}
                          </span>
                          {a.seed && <span style={{ fontFamily:"'Oswald',sans-serif", fontWeight:600, color:'rgba(255,255,255,.5)', fontSize:'.7rem' }}>{a.seed}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* BIG ACTION BUTTONS */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, margin:'14px 0' }}>
            <button onClick={() => setTab('practice')} style={{ background:'linear-gradient(135deg,#1a0505,#2a0a0a)', border:`2px solid ${R}`, padding:'20px 16px', cursor:'pointer', textAlign:'left', transition:'all .2s', gridColumn:'1 / -1' }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                <div style={{ fontSize:'1.8rem' }}>ð</div>
                <div>
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.05rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>Today&apos;s Practice Plan</div>
                  <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)', marginTop:4, lineHeight:1.4 }}>Auto-generated daily workout Â· Event groups Â· Coach assignments</div>
                </div>
              </div>
            </button>
            <button onClick={() => setTab('results')} style={{ background:'linear-gradient(135deg,#0a150a,#0a2a0a)', border:`2px solid ${G}`, padding:'16px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:4 }}>ð</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'.85rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>Meet Results</div>
              <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)', marginTop:4 }}>PRs, placements, performance tracking</div>
            </button>
            <button onClick={() => setTab('ai')} style={{ background:'linear-gradient(135deg,#050a1a,#0a0a2a)', border:`2px solid ${B}`, padding:'16px 14px', cursor:'pointer', textAlign:'left' }}>
              <div style={{ fontSize:'1.4rem', marginBottom:4 }}>ð¤</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'.85rem', textTransform:'uppercase', letterSpacing:'.08em', color:'#fff', lineHeight:1.2 }}>AI Coach</div>
              <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)', marginTop:4 }}>Strategy, lineups, WIAA rules</div>
            </button>
          </div>

          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:14, marginBottom:8 }}>
            Actions ({ACTIONS.filter(a => !done.includes(a.id)).length})
          </div>
          {ACTIONS.sort((a,b) => new Date(a.d)-new Date(b.d)).map(a => {
            const d = done.includes(a.id);
            return (
              <div key={a.id} onClick={() => toggleDone(a.id)} style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'8px 10px', background:CARD, border:`1px solid ${BDR}`, borderLeft:`3px solid ${a.p==='h'?R:Y}`, marginBottom:4, opacity:d?.35:1, cursor:'pointer' }}>
                <div style={{ width:15, height:15, border:`2px solid ${d?G:R}`, background:d?G:'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'.55rem', fontWeight:800, color:'#000' }}>{d?'â':''}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'.8rem', fontWeight:600, lineHeight:1.3, textDecoration:d?'line-through':'none' }}>{a.t}</div>
                  <div style={{ fontSize:'.6rem', color:a.p==='h'?'#ff4444':Y, fontWeight:700, marginTop:2 }}>Due: {a.d}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* âââ RESULTS âââ */}
      {tab === 'results' && (() => {
        const meet = RESULTS?.find(r => r.date === resMeet);
        if (!RESULTS?.length || !meet) return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto', textAlign:'center', paddingTop:60 }}>
            <div style={{ fontSize:'2rem', marginBottom:12 }}>ð</div>
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

        let rows = d;
        if (resView === 'varsity') rows = d.filter(r => r.lvl === 'V');
        else if (resView === 'jv') rows = d.filter(r => r.lvl === 'JV');
        else if (resView === 'prs') rows = d.filter(r => r.pr);
        rows = [...rows].sort((a, b) => { if (a.lvl !== b.lvl) return a.lvl === 'V' ? -1 : 1; return a.place - b.place; });

        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            {/* Meet selector */}
            <div style={{ display:'flex', gap:6, alignItems:'center', marginBottom:12, flexWrap:'wrap' }}>
              {RESULTS.map(r => (
                <button key={r.date} style={btnS(resMeet === r.date)} onClick={() => setResMeet(r.date)}>
                  {r.meet} {r.date.slice(5)}
                </button>
              ))}
            </div>

            <div style={{ fontWeight:800, fontSize:'1.1rem', textTransform:'uppercase' }}>{meet.meet}</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>
              {new Date(meet.date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })} Â· {meet.teams} teams
            </div>

            {/* KPIs */}
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
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:'#fff' }}>{uniqueA.size}</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>Athletes</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>competed</div>
              </div>
              <div style={{ background:'#111', padding:'12px 10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.5rem', color:Y }}>{d.length}</div>
                <div style={{ fontSize:'.5rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:2 }}>Performances</div>
                <div style={{ fontSize:'.5rem', color:'rgba(255,255,255,.25)', marginTop:2 }}>total entries</div>
              </div>
            </div>

            {/* View toggle */}
            <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
              {['summary', 'varsity', 'jv', 'prs'].map(k => (
                <button key={k} style={btnS(resView === k)} onClick={() => setResView(k)}>
                  {k === 'prs' ? 'PRs Only' : k.charAt(0).toUpperCase() + k.slice(1)}
                </button>
              ))}
            </div>

            {/* Results list */}
            {rows.map((r, i) => {
              const isPr = r.pr;
              const isRelay = r.a.includes('Medford');
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
                      {r.place === 1 && <span style={bd(Y)}>ð¥</span>}
                    </div>
                    <div style={{ fontSize:'.7rem', color:'rgba(255,255,255,.4)' }}>
                      {r.e}{hasSeed ? ` Â· Seed: ${r.seed}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.95rem' }}>{r.mark}</div>
                    {hasSeed && (
                      <div style={{ fontSize:'.6rem', fontWeight:700, color: isPr ? G : R }}>
                        {isPr ? 'â PR' : 'â OFF'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {/* âââ PRACTICE âââ */}
      {tab === 'practice' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          {pracLoad && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>ð</div>
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
                  <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid rgba(255,255,255,.06)`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:R, marginBottom:3 }}>Phase</div>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.9rem' }}>{pracPlan.phase}</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid rgba(255,255,255,.06)`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:R, marginBottom:3 }}>Next Meet</div>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.85rem' }}>{pracPlan.nextMeet || 'TBD'}</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,.04)', border:`1px solid rgba(255,255,255,.06)`, padding:'10px 12px' }}>
                    <div style={{ fontSize:'.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.15em', color:R, marginBottom:3 }}>R.A.I.D.E.R.S.</div>
                    <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.9rem' }}>{pracPlan.raidersValue}</div>
                  </div>
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
                  <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:600, fontSize:'.9rem', color:'rgba(255,255,255,.8)', lineHeight:1.5, fontStyle:'italic' }}>
                    &ldquo;{pracPlan.closingMessage}&rdquo;
                  </div>
                </div>
              )}

              <div style={{ background:R, padding:'12px 16px', marginTop:12, textAlign:'center', fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.8rem', textTransform:'uppercase', letterSpacing:'.06em' }}>
                1% Better Every Day Â· E + R = O Â· Go Raiders
              </div>
            </>
          )}

          {pracPlan && pracPlan.isOff && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2.5rem', marginBottom:12 }}>ð´</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>Rest Day â {pracPlan.day}</div>
              <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,.5)', marginTop:8, maxWidth:400, margin:'8px auto 0' }}>{pracPlan.closingMessage}</div>
            </div>
          )}

          {pracPlan && pracPlan.error && (
            <div style={{ textAlign:'center', padding:'60px 20px' }}>
              <div style={{ fontSize:'2rem', marginBottom:12 }}>â ï¸</div>
              <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', textTransform:'uppercase', color:R }}>Plan Unavailable</div>
              <div style={{ fontSize:'.85rem', color:'rgba(255,255,255,.5)', marginTop:8 }}>{pracPlan.error}</div>
            </div>
          )}
        </div>
      )}

      {/* âââ MEETS âââ */}
      {tab === 'meets' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:8 }}>Schedule</div>
          {MEETS.map(m => {
            const d = Math.ceil((new Date(m.date)-NOW)/86400000);
            const hasResults = RESULTS?.some(r => r.id === m.id);
            return (
              <div key={m.id} style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6, opacity:d<0?.3:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'.85rem' }}>{m.name} <span style={{ color:'#555', fontWeight:400 }}>({m.g})</span></div>
                    <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)' }}>{m.date} Â· {m.loc}{m.bus ? ` Â· Bus ${m.bus}` : ''}</div>
                    {m.deadline && <div style={{ fontSize:'.65rem', color:Y, fontWeight:600 }}>Deadline: {m.deadline}</div>}
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span style={bd(m.type==='home'||m.type==='conf'||m.type==='regional'||m.type==='sectional'?R:'#555')}>{m.type}</span>
                    {d>=0 && d<=7 && <span style={bd(Y)}>{d}d</span>}
                    {m.hl && <span style={bd(G)}>Lineup</span>}
                    {hasResults && <button onClick={() => { setResMeet(RESULTS.find(r=>r.id===m.id)?.date||''); setTab('results'); }} style={bd(B)}>ð Results</button>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* âââ ATHLETES âââ */}
      {tab === 'athletes' && !selectedAth && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
              {['all','boys','girls','alerts'].map(k => <button key={k} style={btnS(athF===k)} onClick={() => setAthF(k)}>{k}</button>)}
            </div>
            <div style={{ fontSize:'.55rem', color:liveRoster?G:'#555', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:4 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:liveRoster?G:'#555' }} />
              {liveRoster ? `Live Â· ${rosterData.length}` : `Offline Â· ${rosterData.length}`}
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
                <span style={{ color:'#555', fontSize:'.7rem' }}>{a.gn}Â·{a.g}Â·{a.p1||'TBD'}</span>
                {a.inj && !['No','None','N/A','Nope','no','none','No no no',''].includes(a.inj) && <span style={bd(R)}>â </span>}
                <select value={st} onClick={e => e.stopPropagation()} onChange={e => setStatuses(p => ({...p,[a.n]:e.target.value}))} style={{ background:'#222', border:`1px solid ${BDR}`, color:'#fff', padding:'3px 6px', fontSize:'.65rem' }}>
                  {['available','modified','limited','injured','unavailable'].map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      )}

      {/* âââ ATHLETE DETAIL âââ */}
      {tab === 'athletes' && selectedAth && (() => {
        const athResults = getResultsForAthlete(selectedAth.n);
        return (
          <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
            <button onClick={() => setSelectedAth(null)} style={{ ...btnO, marginBottom:12, padding:'6px 14px' }}>â Back to Roster</button>
            <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'16px', marginBottom:10 }}>
              <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{selectedAth.n}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.5)', marginTop:4 }}>
                Grade {selectedAth.g} Â· {selectedAth.gn==='M'?'Boys':'Girls'} Â· Primary: {selectedAth.p1||'TBD'} Â· Secondary: {selectedAth.p2||'TBD'}
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Contact</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>ð± {selectedAth.ph || 'No phone'}</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>ð¨ {selectedAth.em || 'No emergency contact'}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Personal Records</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)', whiteSpace:'pre-wrap' }}>{selectedAth.pr || 'None recorded'}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${selectedAth.inj && !['No','None','N/A','Nope','no','none','','No no no'].includes(selectedAth.inj) ? 'rgba(204,0,0,.3)' : BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Health / Injuries</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>{selectedAth.inj || 'None reported'}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Season Goal</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>{selectedAth.goal || 'Not specified'}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>R.A.I.D.E.R.S. Focus</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>{selectedAth.rv || 'Not specified'}</div>
              </div>
              <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
                <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Schedule Conflicts</div>
                <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>{selectedAth.conf || 'None'}</div>
              </div>
            </div>

            {/* Meet Results for this athlete */}
            {athResults.length > 0 && (
              <>
                <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:16, marginBottom:8 }}>
                  Meet Results ({athResults.length})
                </div>
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
                      <div style={{ fontSize:'.65rem', color:'rgba(255,255,255,.35)' }}>{r.meetName} Â· {r.meetDate}{r.seed ? ` Â· Seed: ${r.seed}` : ''}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:700, fontSize:'.95rem' }}>{r.mark}</div>
                      {r.seed && <div style={{ fontSize:'.55rem', fontWeight:700, color:r.pr?G:R }}>{r.pr?'â PR':'â OFF'}</div>}
                    </div>
                  </div>
                ))}
              </>
            )}

            <div style={{ display:'flex', gap:8, marginTop:12 }}>
              <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={btn}>ð½ï¸ Generate Meal Plan</button>
              <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={{ ...btn, background:'#222' }}>ðï¸ Generate Workout</button>
            </div>
          </div>
        );
      })()}

      {/* âââ PLANS âââ */}
      {tab === 'plans' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:4 }}>Athlete Plans</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>AI-generated meal + workout plans using each athlete&apos;s actual PRs, injuries, goals, and training phase.</div>

          <select style={{ ...input, marginBottom:12 }} value="" onChange={e => { const a = rosterData.find(x => x.n === e.target.value); if(a) genPlans(a); }}>
            <option value="">Select athlete...</option>
            {rosterData.map((a, i) => <option key={i} value={a.n}>{a.n} ({a.gn}Â·Gr{a.g}Â·{a.p1||'TBD'})</option>)}
          </select>

          {planLoad && <div style={{ textAlign:'center', padding:30, color:R, fontWeight:700 }}>Generating plans for {planA?.n}...</div>}

          {planA && !planLoad && (
            <>
              <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'12px 14px', marginBottom:6 }}>
                <div style={{ fontWeight:800, fontSize:'1rem', textTransform:'uppercase' }}>{planA.n}</div>
                <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)' }}>
                  Gr {planA.g} Â· {planA.gn==='M'?'Boys':'Girls'} Â· {planA.p1||'TBD'} Â· Phase: {dtn<=2?'SHARPEN':dtn<=5?'BUILD':'DEVELOP'}
                  {planA.pr && planA.pr !== 'N/A' && ` Â· PR: ${planA.pr.substring(0,50)}`}
                  {planA.inj && !['No','None','N/A','Nope','no','none',''].includes(planA.inj) && ` Â· â  ${planA.inj.substring(0,40)}`}
                </div>
              </div>
              {meal && (
                <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6 }}>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:6 }}>ð½ï¸ Meal Plan</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{meal}</div>
                </div>
              )}
              {work && (
                <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6 }}>
                  <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:6 }}>ðï¸ Workout Plan</div>
                  <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.7)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>{work}</div>
                </div>
              )}
            </>
          )}

          {!planA && !planLoad && (
            <div style={{ textAlign:'center', padding:40, color:'#333' }}>
              <div style={{ fontSize:'2rem', marginBottom:8 }}>ð½ï¸ðï¸</div>
              <div style={{ fontWeight:700, textTransform:'uppercase' }}>Select an Athlete</div>
              <div style={{ fontSize:'.75rem', color:'#444', marginTop:4 }}>Or click any name on the Roster tab â Generate Plans</div>
            </div>
          )}
        </div>
      )}

      {/* âââ MESSAGE âââ */}
      {tab === 'msg' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:4 }}>Team Messaging</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>Compose a message, then copy it to TeamReach (MASH TRACK 2026 Â· Code: M7155705718)</div>

          <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', marginBottom:10 }}>
            <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:6 }}>Quick Templates</div>
            {[
              ['ð Meet Day Bus Reminder', `Meet Day Reminder\n\nWe have a meet tomorrow at [LOCATION]. Bus leaves at [TIME] from the school.\n\nBring: uniform, spikes, water bottle, snacks\nBe ready 15 minutes before departure.\n\nE+R=O. Let's compete! ð`],
              ['ð Practice Update', `Practice Update\n\n[DAY] practice:\nâ¢ Warm-up 3:30\nâ¢ Group work 3:45-5:00\nâ¢ Cool down + stretch\n\nWednesday reminder: ends at 5:00 PM\n\n1% Better Every Day.`],
              ['ð Week Preview', `MASH Track Week Preview\n\nMon â Practice 3:30-5:30\nTue â [MEET/PRACTICE]\nWed â Practice 3:30-5:00 (ends early)\nThu â [MEET/PRACTICE]\nFri â [MEET/PRACTICE]\n\nGo Raiders! ð´`],
              ['â¡ Competition Mindset', `Competition Day Mindset\n\nRemember:\nâ¢ E + R = O (Event + Response = Outcome)\nâ¢ Control what you can control\nâ¢ Compete against YOUR last performance\nâ¢ Support your teammates\n\n1% Better Every Day. Let's go Raiders!`],
            ].map(([label, body], i) => (
              <div key={i} onClick={() => setMsgBody(body)} style={{ padding:'8px 10px', borderBottom:`1px solid ${BDR}`, cursor:'pointer', fontSize:'.78rem' }}>
                <span style={{ color:R, fontWeight:700 }}>{label}</span>
              </div>
            ))}
          </div>

          <textarea
            style={{ ...input, minHeight:200, resize:'vertical', marginBottom:8 }}
            placeholder="Type or select a template above..."
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
          />

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={copyMsg} style={btn}>
              {copied ? 'â Copied!' : 'ð Copy for TeamReach'}
            </button>
            <button onClick={() => setMsgBody('')} style={btnO}>Clear</button>
          </div>

          <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', marginTop:16 }}>
            <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>How to Send</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
              1. Compose or select template above<br/>
              2. Click &ldquo;Copy for TeamReach&rdquo;<br/>
              3. Open TeamReach app â MASH TRACK 2026<br/>
              4. Paste and send<br/><br/>
              Join code: <strong style={{color:'#fff'}}>M7155705718</strong>
            </div>
          </div>
        </div>
      )}

      {/* âââ AI COACH âââ */}
      {tab === 'ai' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto', display:'flex', flexDirection:'column', height:'calc(100vh - 90px)' }}>
          <div style={{ flex:1, overflowY:'auto', marginBottom:10 }} ref={chatRef}>
            {aiMsgs.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:'2rem', marginBottom:8 }}>ð¤</div>
                <div style={{ fontWeight:800, fontSize:'1rem', textTransform:'uppercase', marginBottom:8 }}>AI Coaching Assistant</div>
                <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', maxWidth:400, margin:'0 auto 16px' }}>
                  Full program knowledge loaded. Knows every athlete&apos;s PRs, injuries, goals, and event preferences.
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6, justifyContent:'center' }}>
                  {['Best 4x400 relay combos?','Northern Badger entry strategy','Who can break a school record this year?','Marshfield girls scoring plan','Which injured athletes need modified workouts?'].map((q,i) => (
                    <button key={i} style={{ ...btnO, fontSize:'.6rem', padding:'6px 10px' }} onClick={() => setAiIn(q)}>{q}</button>
                  ))}
                </div>
              </div>
            )}
            {aiMsgs.map((m, i) => (
              <div key={i} style={{ marginBottom:10, display:'flex', flexDirection:'column', alignItems:m.role==='user'?'flex-end':'flex-start' }}>
                <div style={{ maxWidth:'85%', padding:'10px 14px', background:m.role==='user'?R:CARD, border:`1px solid ${m.role==='user'?'transparent':BDR}`, fontSize:'.82rem', lineHeight:1.6, whiteSpace:'pre-wrap', borderRadius:m.role==='user'?'12px 12px 2px 12px':'12px 12px 12px 2px' }}>
                  {m.content}
                </div>
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
