/* =============================================================================
 *  modules/userscanner.js — OSINT real desde el navegador
 *  GitHub API · Gravatar · DNS-over-HTTPS · barrido de sitios con metadatos
 * ========================================================================== */
FS.register({
  id:'user', icon:'user',
  title:{en:'USER SCANNER', es:'USER SCANNER'},
  sub:{en:'OSINT · personal data', es:'OSINT · datos personales'},

  render(host, F){
    const {h, t, toast, log, icon, sha} = F;

    const SITES = [['Instagram','https://www.instagram.com/'],['Twitter/X','https://x.com/'],
      ['Reddit','https://www.reddit.com/user/'],['GitHub','https://github.com/'],['GitLab','https://gitlab.com/'],
      ['Twitch','https://www.twitch.tv/'],['Steam','https://steamcommunity.com/id/'],
      ['Spotify','https://open.spotify.com/user/'],['Pinterest','https://www.pinterest.com/'],
      ['TikTok','https://www.tiktok.com/@'],['Medium','https://medium.com/@'],['Dev.to','https://dev.to/'],
      ['Keybase','https://keybase.io/'],['Linktree','https://linktr.ee/']];

    const q = h('input','inp',{placeholder:'elliot_alderson'});
    const seg = h('div','seg');
    const bu = h('button','on','USERNAME'), be = h('button','','EMAIL');
    seg.append(bu, be);
    let mode = 'user';
    bu.onclick = () => { mode='user'; bu.className='on'; be.className=''; q.placeholder='elliot_alderson'; };
    be.onclick = () => { mode='email'; be.className='on'; bu.className=''; q.placeholder='elliot@fsociety.com'; };

    const run  = h('button','btn pri full'); run.innerHTML = icon('search') + ' BUSCAR';
    const prog = h('div','bar'); const progI = h('i'); progI.style.width='0%'; prog.append(progI);
    const profile = h('div'), pers = h('div'), sites = h('div');

    const chip = x => h('span','chip', x);
    function card(title, badge){
      const c = h('div','card',{style:'margin-bottom:12px'},
        h('div','card-h', h('span',null,title), badge ? h('span',{class:'badge '+(badge.k||'')},badge.t) : null));
      const b = h('div','card-b'); c.append(b);
      return { root:c, body:b };
    }

    /* --- GitHub (API real, CORS abierto) --- */
    async function github(u){
      try {
        const r = await fetch('https://api.github.com/users/'+encodeURIComponent(u));
        if (!r.ok) { profile.append(h('div','empty','GitHub: sin resultados')); return; }
        const j = await r.json();
        const c = card('GITHUB · REAL', {t:'API', k:'ok'});
        c.body.append(h('div',{class:'row',style:'gap:14px;align-items:flex-start'},
          h('img',{src:j.avatar_url,style:'width:74px;height:74px;border-radius:8px;border:1px solid var(--line)'}),
          h('div',null,
            h('div',{style:'font-size:15px;font-weight:700;color:#fff'}, j.name || u),
            h('div',{style:'color:var(--teal)'}, '@'+j.login),
            h('p',{style:'color:var(--muted);margin:6px 0'}, j.bio || '—'),
            h('div','chips',
              j.location ? chip('📍 '+j.location) : null,
              j.company ? chip('🏢 '+j.company) : null,
              j.blog ? chip('🔗 '+j.blog) : null,
              j.twitter_username ? chip('🐦 @'+j.twitter_username) : null))));
        c.body.append(h('div','kv',
          h('dt',null,'followers'), h('dd',null,String(j.followers)),
          h('dt',null,'repos'), h('dd',null,String(j.public_repos)),
          h('dt',null,'creado'), h('dd',null,(j.created_at||'').slice(0,10))));
        profile.append(c.root);
      } catch(e){ profile.append(h('div','empty','GitHub inaccesible (CORS/CSP)')); }
    }

    /* --- Gravatar (real) --- */
    async function gravatar(mail){
      const md5 = await F.md5(mail.trim().toLowerCase());
      const c = card('GRAVATAR · REAL', {t: md5.slice(0,8), k:'ok'});
      const img = h('img',{src:'https://www.gravatar.com/avatar/'+md5+'?s=120',
        style:'width:74px;height:74px;border-radius:8px;border:1px solid var(--line)'});
      const st = h('span','badge','comprobando…');
      c.body.append(h('div',{class:'row',style:'align-items:center;gap:14px'}, img, h('div',null,h('div',{style:'font-size:12px'},mail),st)));
      fetch('https://www.gravatar.com/avatar/'+md5+'?d=404')
        .then(r => { st.className = 'badge '+(r.ok?'ok':'er'); st.textContent = r.ok ? 'AVATAR ENCONTRADO' : 'SIN AVATAR'; })
        .catch(() => { st.className = 'badge wn'; st.textContent = '?'; });
      profile.append(c.root);
      return md5;
    }

    /* --- DNS-over-HTTPS (real, CORS abierto) --- */
    async function mx(domain){
      try {
        const r = await fetch('https://dns.google/resolve?name='+domain+'&type=MX');
        const j = await r.json();
        const recs = (j.Answer||[]).map(a => a.data);
        const c = card('DNS · MX', {t:'dns.google', k:'ok'});
        c.body.append(h('div','kv', h('dt',null,'dominio'), h('dd',null,domain), h('dt',null,'registros'), h('dd',null,String(recs.length))));
        recs.slice(0,6).forEach(x => c.body.append(h('div',{style:'font-size:10px;color:var(--muted)'},x)));
        pers.append(c.root);
      } catch(e){}
    }

    /* --- barrido de sitios con extracción de <title> --- */
    async function sweep(u){
      sites.innerHTML = '';
      const grid = h('div','thumbs'); sites.append(grid);
      let done = 0;
      const one = async (name, base) => {
        const url = base + encodeURIComponent(u);
        const box = h('div','thumb');
        const st = h('span','badge','…');
        box.append(h('div',{style:'padding:10px;font-size:10px;color:#aab2b0'},name),
          h('div',{style:'padding:0 10px 10px;display:flex;justify-content:space-between;gap:6px'},
            st, h('a',{href:url,target:'_blank',rel:'noopener',style:'font-size:9px'},'abrir')));
        grid.append(box);
        try {
          const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 7000);
          const r = await fetch('https://api.allorigins.win/raw?url='+encodeURIComponent(url), {signal:ctl.signal});
          clearTimeout(to);
          const txt = await r.text();
          const title = (txt.match(/<title[^>]*>([^<]{0,80})/i)||[])[1];
          st.className = 'badge ' + (r.ok ? 'ok' : 'er');
          st.textContent = r.ok ? 'OK' : 'HTTP '+r.status;
          if (title) box.append(h('div',{style:'padding:0 10px 8px;font-size:9px;color:var(--muted)'},title.trim()));
        } catch(e){ st.className='badge wn'; st.textContent='?'; }
        done++; progI.style.width = Math.round(done/SITES.length*100)+'%';
      };
      for (let i=0;i<SITES.length;i+=4) await Promise.all(SITES.slice(i,i+4).map(s => one(s[0], s[1])));
    }

    run.onclick = async () => {
      const v = q.value.trim();
      if (!v) return toast('Escribe un usuario o correo','err');
      profile.innerHTML = sites.innerHTML = pers.innerHTML = '';
      progI.style.width = '0%';
      log('osint: ' + v);
      if (mode === 'email') {
        const md5 = await gravatar(v);
        pers.append(h('div','card',
          h('div','card-h', h('span',null,'HUELLAS')),
          h('div','card-b', h('div','kv',
            h('dt',null,'md5'), h('dd',{class:'hi'}, md5),
            h('dt',null,'sha256'), h('dd',{class:'hi'}, (await sha(v)).slice(0,32)+'…')))));
        await mx(v.split('@')[1] || '');
        await sweep(v.split('@')[0]);
      } else { await github(v); await sweep(v); }
      progI.style.width = '100%';
      toast('Búsqueda completada','ok');
    };

    host.append(h('div',null,
      h('div','head',
        h('div',null, h('div','crumb',null,'ROOT / TOOLKIT / ',h('b',null,'USER SCANNER')),
          h('h1',null,'USER SCANNER'), h('p',null,t('user.desc'))),
        h('span',{class:'badge ok'},'OSINT · REAL')),
      h('div','grid g2',
        h('section','card',
          h('div','card-h', h('span',null,'CONSULTA')),
          h('div','card-b',
            h('div','field', h('label',null,'TIPO'), seg),
            h('div','field', h('label',null,'USUARIO / CORREO'), q),
            run,
            h('div',{style:'margin-top:12px'}, prog))),
        h('div',null, profile, pers, sites))));
  }
});