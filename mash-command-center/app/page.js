'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { FORM_DATA, MEETS, LOCATIONS, ACTIONS, KNOWN_STATUS } from '@/lib/data';

const R='#cc0000',G='#22c55e',Y='#d4a843',B='#4a9eff',CARD='#131313',BDR='rgba(255,255,255,0.06)';

// Merge form data with roster for enriched profiles
function getProfile(name) {
  // Fuzzy match - handle "Paxton" vs "Paxton Hamland", "Manny" vs "Emmanuel Espinoza", etc.
  const n = name.toLowerCase();
  return FORM_DATA.find(f => {
    const fn = f.n.toLowerCase();
    return fn === n || n.includes(fn) || fn.includes(n.split(' ')[0]);
  });
}

const wxIcon = c => { if(c<=1)return'☀️';if(c<=3)return'⛅';if(c<=49)return'🌫️';if(c<=69)return'🌧️';if(c<=79)return'🌨️';if(c<=99)return'⛈️';return'🌤️'; };

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
  const alerts = FORM_DATA.filter(a => {
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

  const tabs = [['today','⚡ Today'],['meets','🏟️ Meets'],['athletes','👤 Roster'],['plans','🍽️ Plans'],['msg','📱 Message'],['ai','🤖 AI']];
  const input = { background:'#161616', border:`1px solid rgba(255,255,255,.08)`, color:'#fff', padding:'8px 12px', fontSize:'.8rem', width:'100%' };
  const btn = { padding:'8px 16px', background:R, color:'#fff', border:'none', fontWeight:800, fontSize:'.68rem', textTransform:'uppercase', letterSpacing:'.08em', cursor:'pointer' };
  const btnO = { ...btn, background:'transparent', border:`1px solid rgba(255,255,255,.15)`, fontWeight:600 };
  const btnS = (a) => ({ padding:'5px 10px', background:a?R:'rgba(255,255,255,.04)', color:a?'#fff':'#888', fontWeight:700, fontSize:'.6rem', textTransform:'uppercase', border:a?`1px solid ${R}`:`1px solid rgba(255,255,255,.08)`, cursor:'pointer' });

  return (
    <div>
      {/* TOP BAR */}
      <div style={{ background:`linear-gradient(135deg,#1a0000,#0a0a0a)`, borderBottom:`2px solid ${R}`, padding:'10px 16px', display:'flex', justifyContent:'space-between', alignItems:'center', position:'sticky', top:0, zIndex:100 }}>
        <div style={{ fontFamily:"'Oswald',sans-serif", fontWeight:800, fontSize:'1rem', letterSpacing:'.12em', textTransform:'uppercase' }}><span style={{color:R}}>MASH</span> Command Center</div>
        <div style={{ fontSize:'.55rem', color:'#444' }}>v3 · 2026</div>
      </div>

      {/* NAV */}
      <div style={{ display:'flex', overflowX:'auto', background:'#111', borderBottom:`1px solid ${BDR}`, position:'sticky', top:44, zIndex:99 }}>
        {tabs.map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding:'10px 12px', background:tab===k?'rgba(204,0,0,.12)':'transparent', color:tab===k?'#fff':'#666', borderBottom:tab===k?`2px solid ${R}`:'2px solid transparent', fontWeight:700, fontSize:'.58rem', textTransform:'uppercase', letterSpacing:'.08em', whiteSpace:'nowrap', flexShrink:0 }}>{l}</button>
        ))}
      </div>

      {/* ═══ TODAY ═══ */}
      {tab === 'today' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R }}>Command Center</div>
          <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{NOW.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)' }}>{nm ? `${nm.name} (${nm.g}) in ${dtn}d` : ''}</div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:1, background:BDR, margin:'12px 0' }}>
            {[[dtn+'d','Next Meet',R],[FORM_DATA.length,'Athletes','#fff'],[alerts.length,'Alerts',alerts.length?R:G],[MEETS.length,'Meets','#fff']].map(([v,l,c],i) => (
              <div key={i} style={{ background:'#111', padding:'10px', textAlign:'center' }}>
                <div style={{ fontFamily:"'Oswald',sans-serif", fontSize:'1.5rem', fontWeight:800, color:c }}>{v}</div>
                <div style={{ fontSize:'.55rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em', color:'#555', marginTop:3 }}>{l}</div>
              </div>
            ))}
          </div>

          <WxWidget data={wx} title="Medford (54451) — 7-Day Forecast" />
          {mWx && nm && <WxWidget data={mWx.d} title={`${nm.name} @ ${mWx.loc}`} />}

          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginTop:14, marginBottom:8 }}>
            Actions ({ACTIONS.filter(a => !done.includes(a.id)).length})
          </div>
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

      {/* ═══ MEETS ═══ */}
      {tab === 'meets' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:8 }}>Schedule</div>
          {MEETS.map(m => {
            const d = Math.ceil((new Date(m.date)-NOW)/86400000);
            return (
              <div key={m.id} style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px 14px', marginBottom:6, opacity:d<0?.3:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:'.85rem' }}>{m.name} <span style={{ color:'#555', fontWeight:400 }}>({m.g})</span></div>
                    <div style={{ fontSize:'.72rem', color:'rgba(255,255,255,.4)' }}>{m.date} · {m.loc}{m.bus ? ` · Bus ${m.bus}` : ''}</div>
                    {m.deadline && <div style={{ fontSize:'.65rem', color:Y, fontWeight:600 }}>Deadline: {m.deadline}</div>}
                  </div>
                  <div style={{ display:'flex', gap:4, alignItems:'center' }}>
                    <span style={bd(m.type==='home'||m.type==='conf'||m.type==='regional'||m.type==='sectional'?R:'#555')}>{m.type}</span>
                    {d>=0 && d<=7 && <span style={bd(Y)}>{d}d</span>}
                    {m.hl && <span style={bd(G)}>Lineup</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ ATHLETES ═══ */}
      {tab === 'athletes' && !selectedAth && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:4, marginBottom:10, flexWrap:'wrap' }}>
            {['all','boys','girls','alerts'].map(k => <button key={k} style={btnS(athF===k)} onClick={() => setAthF(k)}>{k}</button>)}
          </div>
          <input style={{ ...input, marginBottom:10 }} placeholder="Search..." value={athQ} onChange={e => setAthQ(e.target.value)} />
          {FORM_DATA.filter(a => {
            if (athF==='boys' && a.gn!=='M') return false;
            if (athF==='girls' && a.gn!=='F') return false;
            if (athF==='alerts' && getSt(a.n)==='available') return false;
            if (athQ && !a.n.toLowerCase().includes(athQ.toLowerCase())) return false;
            return true;
          }).map((a, i) => {
            const st = getSt(a.n);
            return (
              <div key={i} onClick={() => setSelectedAth(a)} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', borderBottom:`1px solid ${BDR}`, fontSize:'.8rem', cursor:'pointer' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:stCol(st), flexShrink:0 }} />
                <span style={{ fontWeight:600, flex:1 }}>{a.n}</span>
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

      {/* ═══ ATHLETE DETAIL ═══ */}
      {tab === 'athletes' && selectedAth && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <button onClick={() => setSelectedAth(null)} style={{ ...btnO, marginBottom:12, padding:'6px 14px' }}>← Back to Roster</button>
          <div style={{ background:CARD, border:`1px solid rgba(204,0,0,.25)`, borderLeft:`3px solid ${R}`, padding:'16px', marginBottom:10 }}>
            <div style={{ fontWeight:800, fontSize:'1.2rem', textTransform:'uppercase' }}>{selectedAth.n}</div>
            <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.5)', marginTop:4 }}>
              Grade {selectedAth.g} · {selectedAth.gn==='M'?'Boys':'Girls'} · Primary: {selectedAth.p1||'TBD'} · Secondary: {selectedAth.p2||'TBD'}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px' }}>
              <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>Contact</div>
              <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>📱 {selectedAth.ph || 'No phone'}</div>
              <div style={{ fontSize:'.78rem', color:'rgba(255,255,255,.6)' }}>🚨 {selectedAth.em || 'No emergency contact'}</div>
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

          <div style={{ display:'flex', gap:8, marginTop:12 }}>
            <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={btn}>🍽️ Generate Meal Plan</button>
            <button onClick={() => { setTab('plans'); genPlans(selectedAth); }} style={{ ...btn, background:'#222' }}>🏋️ Generate Workout</button>
          </div>
        </div>
      )}

      {/* ═══ PLANS ═══ */}
      {tab === 'plans' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto' }}>
          <div style={{ fontSize:'.6rem', fontWeight:800, textTransform:'uppercase', letterSpacing:'.2em', color:R, marginBottom:4 }}>Athlete Plans</div>
          <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', marginBottom:12 }}>AI-generated meal + workout plans using each athlete's actual PRs, injuries, goals, and training phase.</div>

          <select style={{ ...input, marginBottom:12 }} value="" onChange={e => { const a = FORM_DATA.find(x => x.n === e.target.value); if(a) genPlans(a); }}>
            <option value="">Select athlete...</option>
            {FORM_DATA.map((a, i) => <option key={i} value={a.n}>{a.n} ({a.gn}·Gr{a.g}·{a.p1||'TBD'})</option>)}
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

      {/* ═══ MESSAGE ═══ */}
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

          <textarea
            style={{ ...input, minHeight:200, resize:'vertical', marginBottom:8 }}
            placeholder="Type or select a template above..."
            value={msgBody}
            onChange={e => setMsgBody(e.target.value)}
          />

          <div style={{ display:'flex', gap:8 }}>
            <button onClick={copyMsg} style={btn}>
              {copied ? '✓ Copied!' : '📋 Copy for TeamReach'}
            </button>
            <button onClick={() => setMsgBody('')} style={btnO}>Clear</button>
          </div>

          <div style={{ background:CARD, border:`1px solid ${BDR}`, padding:'12px', marginTop:16 }}>
            <div style={{ fontSize:'.55rem', fontWeight:800, textTransform:'uppercase', color:R, marginBottom:4 }}>How to Send</div>
            <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', lineHeight:1.6 }}>
              1. Compose or select template above<br/>
              2. Click "Copy for TeamReach"<br/>
              3. Open TeamReach app → MASH TRACK 2026<br/>
              4. Paste and send<br/><br/>
              Join code: <strong style={{color:'#fff'}}>M7155705718</strong>
            </div>
          </div>
        </div>
      )}

      {/* ═══ AI COACH ═══ */}
      {tab === 'ai' && (
        <div style={{ padding:'14px 16px', maxWidth:960, margin:'0 auto', display:'flex', flexDirection:'column', height:'calc(100vh - 90px)' }}>
          <div style={{ flex:1, overflowY:'auto', marginBottom:10 }} ref={chatRef}>
            {aiMsgs.length === 0 && (
              <div style={{ textAlign:'center', padding:'30px 20px' }}>
                <div style={{ fontSize:'2rem', marginBottom:8 }}>🤖</div>
                <div style={{ fontWeight:800, fontSize:'1rem', textTransform:'uppercase', marginBottom:8 }}>AI Coaching Assistant</div>
                <div style={{ fontSize:'.75rem', color:'rgba(255,255,255,.5)', maxWidth:400, margin:'0 auto 16px' }}>
                  Full program knowledge loaded. Knows every athlete's PRs, injuries, goals, and event preferences.
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
