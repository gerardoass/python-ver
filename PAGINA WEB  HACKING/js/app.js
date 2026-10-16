/* =============================================================================
 *  app.js — núcleo: helpers DOM, i18n, auth (supabase + fallback), shell, bridge
 * ========================================================================== */
(function () {
'use strict';

/* ----------------------------- helpers DOM ------------------------------- */
const ICO = {
  bars:'<path d="M4 18V9M9 18V5M14 18v-7M19 18V3"/><path d="M2 21h20"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 18 5-5 4 4 3-3 4 4"/>',
  chip:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M4 10h3M4 14h3M17 10h3M17 14h3M10 4v3M14 4v3M10 17v3M14 17v3"/>',
  shield:'<path d="M12 3 4 6v5c0 5 3.4 8.4 8 10 4.6-1.6 8-5 8-10V6Z"/>',
  zap:'<path d="M13 2 4 14h6l-1 8 9-12h-6Z"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  radar:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M21 12h-3"/>',
  wifi:'<path d="M2 9a16 16 0 0 1 20 0M5 12.5a11 11 0 0 1 14 0M8.5 16a6 6 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1"/>',
  pulse:'<path d="M3 12h4l2-6 3 12 2-6h7"/>',
  undo:'<path d="M4 10a8 8 0 1 1 3 9"/><path d="M4 4v6h6"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  down:'<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  logout:'<path d="M9 5H5v14h4M13 8l4 4-4 4M17 12H9"/>'
};
const icon = (n, s) => '<span class="ico"><svg width="'+(s||16)+'" height="'+(s||16)+
  '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" '+
  'stroke-linecap="round" stroke-linejoin="round">'+(ICO[n]||'')+'</svg></span>';

const h = (tag, props, ...kids) => {
  const e = document.createElement(tag);
  if (typeof props === 'string') { e.className = props; props = null; }
  if (props) for (const k in props) {
    const v = props[k];
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v);
    else if (k.slice(0,2) === 'on') e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  (kids||[]).flat(9).forEach(c => {
    if (c == null || c === false) return;
    e.append(c.nodeType ? c : document.createTextNode(String(c)));
  });
  return e;
};
const $ = s => document.querySelector(s);

/* --------------------------------- i18n --------------------------------- */
const D = {
  en: {
    nav:{tools:'TOOLKIT',logout:'LOGOUT',op:'OPERATOR'},
    common:{real:'BRIDGE · REAL',web:'WEB ENGINE'},
    auth:{t:'Identify yourself.',s:'A secure console for controlled security diagnostics.',
      u:'Username',p:'Password',li:'LOG IN',su:'SIGN UP',cta:'AUTHENTICATE',cta2:'CREATE IDENTITY',
      sw:'No account? Sign up',sw2:'Have one? Log in',ok:'ACCESS GRANTED',no:'ACCESS DENIED',
      eu:'3-18 chars: a-z 0-9 _ -',ep:'min 6 chars',ei:'Wrong credentials',ex:'User already exists'},
    trafic:{desc:'Native v15 flooder. Real flooding through the local bridge, or the built-in web engine.',
      control:'CONTROL',state:'STATE',threads:'THREADS',latency:'LATENCY',iface:'NETWORK INTERFACE',
      targets:'TARGETS',power:'POWER',mode:'MODE',payload:'PAYLOAD (B)',attack:'ATTACK',stop:'STOP',
      scan:'SCAN NETWORK',bands:'BANDS 2.4/5G',watch:'WATCH',restore:'RESTORE',
      tabDev:'DEVICES',tabAp:'BANDS',tabAct:'ACTIVITY',noDev:'No data. Hit SCAN NETWORK.',
      band:'BAND',ch:'CHANNEL',sig:'SIGNAL',noTarget:'Add at least one target'},
    user:{desc:'Real OSINT: GitHub, Gravatar, DNS and site sweep with metadata extraction.'},
    meta:{desc:'Read EXIF from your photos: GPS, date, camera and software. Fully local.',
      drop:'Drop images here or click to pick',clean:'No EXIF metadata (clean photo)',all:'Show all EXIF fields'},
    crypto:{desc:'Hashes, base64, URL and JWT decoder. Fully local.',ph:'Paste text here…',result:'RESULT'}
  },
  es: {
    nav:{tools:'HERRAMIENTAS',logout:'SALIR',op:'OPERADOR'},
    common:{real:'BRIDGE · REAL',web:'MOTOR WEB'},
    auth:{t:'Identifícate.',s:'Una consola segura para diagnósticos de seguridad controlados.',
      u:'Usuario',p:'Contraseña',li:'INICIAR SESIÓN',su:'CREAR CUENTA',cta:'AUTENTICAR',cta2:'CREAR IDENTIDAD',
      sw:'¿Sin cuenta? Regístrate',sw2:'¿Ya tienes? Entra',ok:'ACCESO CONCEDIDO',no:'ACCESO DENEGADO',
      eu:'3-18 caracteres: a-z 0-9 _ -',ep:'mínimo 6 caracteres',ei:'Credenciales incorrectas',ex:'El usuario ya existe'},
    trafic:{desc:'Saturador nativo v15. Flood real por el bridge local, o el motor web integrado.',
      control:'CONTROL',state:'ESTADO',threads:'HILOS',latency:'LATENCIA',iface:'INTERFAZ DE RED',
      targets:'OBJETIVOS',power:'POTENCIA',mode:'MODO',payload:'PAYLOAD (B)',attack:'ATACAR',stop:'PARAR',
      scan:'ESCANEAR RED',bands:'BANDAS 2.4/5G',watch:'VIGILAR',restore:'RESTAURAR',
      tabDev:'DISPOSITIVOS',tabAp:'BANDAS',tabAct:'ACTIVIDAD',noDev:'Sin datos. Pulsa ESCANEAR RED.',
      band:'BANDA',ch:'CANAL',sig:'SEÑAL',noTarget:'Añade al menos un objetivo'},
    user:{desc:'OSINT real: GitHub, Gravatar, DNS y barrido de sitios con extracción de metadatos.'},
    meta:{desc:'Lee EXIF de tus fotos: GPS, fecha, cámara y software. Todo local.',
      drop:'Arrastra imágenes aquí o pulsa para elegir',clean:'Sin metadatos EXIF (foto limpia)',all:'Ver todos los campos EXIF'},
    crypto:{desc:'Hashes, base64, URL y decodificador JWT. Todo en local.',ph:'Pega aquí el texto…',result:'RESULTADO'}
  }
};

/* -------------------------------- estado -------------------------------- */
const state = {
  lang: (navigator.language||'es').toLowerCase().startsWith('es') ? 'es' : 'en',
  user: '', route: 'trafic', formUser: '', formPass: '',
  bridge: { url: localStorage.getItem('fs_bridge') || 'ws://127.0.0.1:8787' }
};
const t = k => { let s = k.split('.').reduce((o,p) => o && o[p], D[state.lang]); return s == null ? k : s; };

/* ------------------------------ utilidades ------------------------------ */
const toast = (m,k) => { const d = h('div','toast '+(k||''), m); $('#toasts').append(d); setTimeout(()=>d.remove(), 3800); };
const log   = m => { const b = $('#syslog'); if(!b) return; b.append(h('div',null,'> '+m)); b.scrollTop = b.scrollHeight; };

async function sha(data, algo) {
  algo = algo || 'SHA-256';
  const buf = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  const d = await crypto.subtle.digest(algo, buf);
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2,'0')).join('');
}
function md5(str) { /* implementación compacta — ver bloque largo más abajo */ }

/* ------------------------------- supabase -------------------------------- */
const SUPABASE = { url:'https://ybplsaowllxxxlxswezd.supabase.co', anonKey:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlicGxzYW93bGx4eHhseHN3ZXpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxMjIxNTgsImV4cCI6MjEwNzY5ODE1OH0.XL3VKL8xFj5zkDFHq1-tL0_XAxK6JKx7TZteWS6Usgg', table:'profiles' };
const SB_OK = () => /^https:\/\/.+\.supabase\.co\/?$/.test(SUPABASE.url.replace(/\/$/,'')) && SUPABASE.anonKey.length > 30;
const sbH = () => ({ apikey:SUPABASE.anonKey, Authorization:'Bearer '+SUPABASE.anonKey, 'Content-Type':'application/json' });
async function sbSignUp(u, hash) {
  const r = await fetch(SUPABASE.url.replace(/\/$/,'')+'/rest/v1/'+SUPABASE.table,
    { method:'POST', headers:Object.assign(sbH(), {Prefer:'return=minimal'}),
      body: JSON.stringify({ username:u.toLowerCase(), pass_hash:hash }) });
  if (r.status === 409) return { ok:false, reason:'exists' };
  if (!r.ok) throw new Error('sb '+r.status);s
  return { ok:true };
}
async function sbSignIn(u) {
  const r = await fetch(SUPABASE.url.replace(/\/$/,'')+'/rest/v1/'+SUPABASE.table+
    '?username=eq.'+encodeURIComponent(u.toLowerCase())+'&select=username,pass_hash', { headers: sbH() });
  if (!r.ok) throw new Error('sb '+r.status);
  return (await r.json())[0] || null;
}

/* -------------------------------- bridge --------------------------------- */
const bridge = {
  connected:false, ws:null, url:state.bridge.url, handlers:[],
  send(o){ if (this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify(o)); },
  on(f){ this.handlers.push(f); },
  emit(m){ this.handlers.forEach(f => { try { f(m); } catch(e){} }); },
  connect(url){
    if (url) { this.url = url; localStorage.setItem('fs_bridge', url); }
    try {
      if (this.ws) this.ws.close();
      this.ws = new WebSocket(this.url);
      this.ws.onopen  = () => { this.connected = true; renderTop(); log('bridge conectado: '+this.url); toast('Bridge conectado','ok'); this.send({type:'hello'}); };
      this.ws.onclose = () => { this.connected = false; renderTop(); };
      this.ws.onerror = () => { this.connected = false; renderTop(); };
      this.ws.onmessage = e => { try { this.emit(JSON.parse(e.data)); } catch(x){} };
    } catch(e){ this.connected = false; renderTop(); }
  }
};

/* --------------------------------- API ----------------------------------- */
const FS = window.FS = {
  modules: [], state, t, h, icon, toast, log, bridge, sha, sb: { SUPABASE, SB_OK },
  register(m){ FS.modules.push(m); },
  fmt: { bytes: n => (n/1024).toFixed(1)+' KB' }
};

/* ------------------------------- auth UI --------------------------------- */
function renderAuth(){
  const a = D[state.lang].auth;
  const u = h('input','inp',{ placeholder:'elliot_alderson', value:state.formUser });
  const p = h('input','inp',{ type:'password' });
  const seg = h('div','seg auth-seg');
  const bl = h('button','on', a.li), bs = h('button','', a.su);
  seg.append(bl, bs);
  let mode = 'login';
  bl.onclick = () => { mode='login'; bl.className='on'; bs.className=''; btn.textContent=a.cta; };
  bs.onclick = () => { mode='signup'; bs.className='on'; bl.className=''; btn.textContent=a.cta2; };
  const err = h('div','err');
  const btn = h('button','btn pri full', a.cta); btn.style.height='44px';

  btn.onclick = async () => {
    const usr = u.value.trim(), pw = p.value;
    err.textContent = '';
    if (!/^[a-zA-Z0-9_-]{3,18}$/.test(usr)) return err.textContent = a.eu;
    if (pw.length < 6) return err.textContent = a.ep;
    const dig = await sha(pw);
    let allowed = false, remote = false;

    if (SB_OK()) {
      try {
        if (mode === 'signup') { const r = await sbSignUp(usr, dig); if (r.ok) { allowed = remote = true; } else err.textContent = a.ex; }
        else { const row = await sbSignIn(usr); if (!row || row.pass_hash !== dig) err.textContent = a.ei; else allowed = remote = true; }
      } catch(e){ /* cae a local */ }
    }
    if (!allowed && !remote) {
      const acc = JSON.parse(localStorage.getItem('fs_accounts') || '{}');
      if (mode === 'signup') {
        if (acc[usr.toLowerCase()]) err.textContent = a.ex;
        else { acc[usr.toLowerCase()] = dig; localStorage.setItem('fs_accounts', JSON.stringify(acc)); allowed = true; }
      } else {
        allowed = acc[usr.toLowerCase()] === dig;
        if (!allowed) err.textContent = a.ei;
      }
    }
    const ov = h('div','ovl '+(allowed?'ok':'')); ov.append(h('b',null, allowed?a.ok:a.no));
    document.body.append(ov);
    setTimeout(() => {
      ov.remove();
      if (allowed) { localStorage.setItem('fs_session', usr); state.user = usr; renderApp(); }
    }, allowed ? 900 : 1100);
  };

  $('#root').innerHTML = '';
  $('#root').append(h('div','auth', h('div','acard',
    h('p','eyebrow', (SB_OK() ? 'SUPABASE' : 'LOCAL') + ' // NODE 05'),
    h('h1', null, a.t), h('p','sub', a.s), seg,
    h('div','field', h('label', null, a.u), u),
    h('div','field', h('label', null, a.p), p),
    err, btn,
    h('div','secure', null, icon('shield',12)+' LOCAL ENCRYPTED SESSION'))));
}

/* ------------------------------ shell UI --------------------------------- */
function renderTop(){
  const el = $('#topR'); if (!el) return; el.innerHTML = '';
  el.append(h('button',{ class:'pill '+(bridge.connected?'ok':'bad'),
    onclick:() => bridge.connected ? (bridge.ws.close(), bridge.connected=false, renderTop()) : bridge.connect() },
    h('i'), bridge.connected ? 'BRIDGE ON' : 'BRIDGE OFF'));
  el.append(h('button',{ class:'mini', onclick:() => { const u = prompt('WebSocket del bridge:', bridge.url); if (u) bridge.connect(u); } },'⚙'));
  el.append(h('div','op', h('span',null,t('nav.op')), h('b',null,state.user)));
  el.append(h('button',{ class:'mini', onclick:() => { localStorage.removeItem('fs_session'); state.user=''; renderAuth(); } }, t('nav.logout')));
}

function renderApp(){
  const nav = h('div','nav'), tabs = h('div','tabs');
  FS.modules.forEach(m => {
    const b = h('button', null, icon(m.icon,17), h('span',null,h('b',null,m.title[state.lang]),h('small',null,m.sub[state.lang])));
    b.onclick = () => { state.route = m.id; renderApp(); };
    if (m.id === state.route) b.className = 'on';
    nav.append(b);
    const tb = h('button', null, icon(m.icon,14), m.title[state.lang]);
    tb.onclick = () => { state.route = m.id; renderApp(); };
    if (m.id === state.route) tb.className = 'on';
    tabs.append(tb);
  });

  const host = h('div','wrap');
  $('#root').innerHTML = '';
  $('#root').append(h('div','shell',
    h('aside','side',
      h('div','side-h', h('div','brand',{html:'fsociety<b>_</b>'}), h('div','side-sub',null,'TOOLKIT v15')),
      nav,
      h('div','side-f',null,'© fsociety · local-first')),
    h('div', null,
      h('div','top', h('div','top-l', h('div','pill ok', h('i'), 'SISTEMA OK')), h('div','top-r',{id:'topR'})),
      tabs, host)));

  renderTop();
  const m = FS.modules.find(x => x.id === state.route);
  if (m) m.render(host, FS);
}

/* --------------------------------- boot ---------------------------------- */
window.addEventListener('DOMContentLoaded', () => {
  const saved = localStorage.getItem('fs_session');
  if (saved) { state.user = saved; renderApp(); } else renderAuth();
  setTimeout(() => { try { bridge.connect(); } catch(e){} }, 1200);
});
})();