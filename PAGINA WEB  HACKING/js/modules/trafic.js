/* =============================================================================
 *  modules/trafic.js — panel GUI del saturador nativo v15
 *  Con bridge conectado habla con Trafic.exe real; si no, usa el motor web.
 * ========================================================================== */
FS.register({
  id:'trafic', icon:'bars',
  title:{en:'TRAFIC', es:'TRAFIC'},
  sub:{en:'network flooder · v15', es:'saturador de red · v15'},

  render(host, F){
    const {h, t, toast, log, bridge, icon} = F;

    const S = { sel:0, targets:['192.168.1.7','192.168.1.9'], power:32, mode:'eco',
                payload:1400, running:false, hilos:0, pps:0, lat:[], timer:null,
                devices:[], aps:[], tab:'dev',
                adapters:[{n:'Wi-Fi (Intel AX201)',ip:'192.168.1.4',gw:'192.168.1.1',wifi:true},
                          {n:'Ethernet (Realtek RTL8168)',ip:'192.168.1.9',gw:'192.168.1.1',wifi:false}] };

    const DEV = [{ip:'192.168.1.1',mac:'50:c7:bf:1a:2b:3c',fab:'TP-Link',tag:'router'},
                 {ip:'192.168.1.4',mac:'a4:2b:b0:9c:11:22',fab:'TP-Link',tag:'me'},
                 {ip:'192.168.1.7',mac:'b8:27:eb:4d:9e:10',fab:'RaspberryPi'},
                 {ip:'192.168.1.9',mac:'64:09:80:aa:bb:cc',fab:'Xiaomi'},
                 {ip:'192.168.1.12',mac:'24:0a:c4:5f:33:aa',fab:'ESP'},
                 {ip:'192.168.1.15',mac:'3c:71:bf:77:12:08',fab:'ESP'},
                 {ip:'192.168.1.21',mac:'dc:a6:32:9e:44:01',fab:'RaspberryPi'}];

    const APS = [{b:'5 GHz',ch:44,dbm:-48,s:'fsociety_5G'},{b:'5 GHz',ch:36,dbm:-57,s:'MiFibra-4A2C'},
                 {b:'5 GHz',ch:100,dbm:-66,s:'MOVISTAR_PLUS'},{b:'5 GHz',ch:149,dbm:-72,s:'(oculto)'},
                 {b:'2.4 GHz',ch:1,dbm:-44,s:'fsociety_2G'},{b:'2.4 GHz',ch:6,dbm:-52,s:'MiFibra-4A2C'},
                 {b:'2.4 GHz',ch:6,dbm:-61,s:'Vodafone-A1B2'},{b:'2.4 GHz',ch:11,dbm:-70,s:'TP-Link_8F20'},
                 {b:'2.4 GHz',ch:13,dbm:-78,s:'(oculto)'}];

    const el = (tag, cls, txt) => { const e = h(tag, cls ? {class:cls} : null); if (txt != null) e.textContent = txt; return e; };

    /* ---- widgets ---- */
    const logBox = el('div','log');
    const logAdd = (s, c) => { const d = el('div', c || '', s); logBox.append(d); logBox.scrollTop = logBox.scrollHeight;
                               if (logBox.children.length > 500) logBox.firstChild.remove(); };

    const iface = el('select','inp');
    const tgt = el('input','inp'); tgt.placeholder = '192.168.1.7';
    const chips = el('div','chips');
    const pow = el('input',''); pow.type='range'; pow.min=8; pow.max=64; pow.step=8; pow.value=32;
    const powV = el('b','','32');
    const payload = el('input','inp'); payload.type='number'; payload.value=1400;
    const seg = el('div','seg'); const bEco = el('button','on','ECO'); const bTurbo = el('button','','TURBO'); seg.append(bEco,bTurbo);
    const mState = el('b','','—'), mHilos = el('b','','0'), mPps = el('b','','0'), mLat = el('b','','—');
    const cv = el('canvas',''); cv.width=260; cv.height=44; cv.style.width='100%'; cv.style.height='44px';
    const devBody = el('tbody',''), apBody = el('tbody','');
    const stPill = el('span','pill','—');

    /* ---- adaptadores ---- */
    function adapters(){
      iface.innerHTML = '';
      S.adapters.forEach((a,i) => { const o = el('option','',(a.wifi?'[WiFi] ':'[ETH] ')+a.n); o.value=i; iface.append(o); });
      iface.value = S.sel;
    }
    /* ---- objetivos ---- */
    function drawChips(){
      chips.innerHTML='';
      S.targets.forEach((ip,i) => {
        const c = el('span','chip'); c.append(ip);
        const x = el('b','','×'); x.onclick = () => { S.targets.splice(i,1); drawChips(); };
        c.append(x); chips.append(c);
      });
    }
    /* ---- tabla dispositivos ---- */
    function drawDev(){
      devBody.innerHTML='';
      if (!S.devices.length) { devBody.append(h('tr',null,h('td',{colspan:5,class:'empty',text:t('trafic.noDev')}))); return; }
      S.devices.forEach(d => {
        const tr = h('tr');
        const cb = h('input'); cb.type='checkbox'; cb.checked = S.targets.includes(d.ip);
        cb.onchange = () => { if (cb.checked) { if (!S.targets.includes(d.ip)) S.targets.push(d.ip); }
                              else S.targets = S.targets.filter(x => x !== d.ip); drawChips(); };
        tr.append(h('td',null,cb), h('td',{class:'mono',text:d.ip}), h('td',{class:'mono',text:d.mac}), h('td',{text:d.fab||'—'}));
        const td = h('td');
        if (d.tag === 'router') td.append(el('span','tag rt','ROUTER'));
        else if (d.tag === 'me') td.append(el('span','tag me','TÚ'));
        else { const b = el('button','mini','ATACAR'); b.onclick = () => { S.targets=[d.ip]; drawChips(); attack(); }; td.append(b); }
        tr.append(td); devBody.append(tr);
      });
    }
    /* ---- tabla bandas ---- */
    function drawAp(){
      apBody.innerHTML='';
      S.aps.forEach(a => {
        const sig = Math.max(1, Math.min(4, Math.round((a.dbm + 90) / 12)));
        const bars = el('span','bars');
        for (let i=0;i<4;i++) bars.append(el('i', i < sig ? 'a' : ''));
        apBody.append(h('tr',null, h('td',{text:a.b}), h('td',{class:'mono',text:'ch '+a.ch}),
          h('td',{class:'mono',text:a.dbm+' dBm'}), h('td',null,bars), h('td',{text:a.s})));
      });
    }
    /* ---- sparkline de latencia ---- */
    function spark(){
      const c = cv.getContext('2d'); c.clearRect(0,0,cv.width,cv.height);
      if (S.lat.length < 2) return;
      const mx = Math.max(60, ...S.lat);
      c.strokeStyle = '#ff003c'; c.lineWidth = 1.6; c.beginPath();
      S.lat.forEach((v,i) => { const x = i/(S.lat.length-1)*cv.width, y = cv.height - (v/mx)*cv.height;
                               i ? c.lineTo(x,y) : c.moveTo(x,y); });
      c.stroke();
      c.fillStyle='rgba(255,0,60,.10)'; c.lineTo(cv.width,cv.height); c.lineTo(0,cv.height); c.closePath(); c.fill();
    }
    function ping(host){
      const sat = S.running && S.targets.includes(host);
      if (sat && Math.random() < .12) return -1;
      return Math.max(1, Math.round((host === '8.8.8.8' ? 16 : 4) + (sat ? 240 : S.running ? 38 : 0) + Math.random() * (sat ? 760 : 20)));
    }
    function metrics(){
      mState.textContent = S.running ? 'ATACANDO' : 'EN ESPERA';
      mState.className = S.running ? 'red' : 'teal';
      mHilos.textContent = S.hilos;
      mPps.textContent = Math.round(S.pps).toLocaleString('es');
      mLat.textContent = S.lat.length ? (S.lat[S.lat.length-1] < 0 ? 'sin resp.' : S.lat[S.lat.length-1]+' ms') : '—';
      stPill.className = 'pill ' + (S.running ? 'ok' : 'bad');
      stPill.innerHTML = '<i></i> ' + (S.running ? 'FLOOD ACTIVO' : 'EN ESPERA');
    }
    function tick(){
      S.pps = (S.mode === 'eco' ? 1150 : 4400) * S.hilos;
      S.lat.push(ping(S.targets[0] || S.adapters[S.sel].gw));
      if (S.lat.length > 60) S.lat.shift();
      metrics(); spark();
    }
    /* ---- acciones ---- */
    function attack(){
      if (!S.targets.length) return toast(t('trafic.noTarget'),'err');
      const per = Math.max(1, Math.floor(S.power / S.targets.length));
      S.hilos = Math.min(64, per * S.targets.length);
      S.running = true; S.pps = 0;
      if (!S.timer) S.timer = setInterval(tick, 400);
      metrics();
      logAdd('> ATACANDO ' + S.targets.join(', ') + '  con ' + S.hilos + ' hilos · ' + (S.mode==='eco'?'ECO':'TURBO'), 'ansi-mint');
      if (bridge.connected) bridge.send({ type:'input', data:'a\n' + S.targets.join(', ') + '\n' });
    }
    function stop(){
      S.running = false; S.pps = 0; S.hilos = 0;
      if (S.timer) { clearInterval(S.timer); S.timer = null; }
      metrics(); spark();
      logAdd('> PARADO. hilos cerrados.','ansi-red');
      if (bridge.connected) bridge.send({ type:'input', data:'s\n' });
    }
    function scan(){
      logAdd('> barriendo ' + S.adapters[S.sel].ip.replace(/\.[0-9]+$/,'') + '.x …');
      if (bridge.connected) bridge.send({ type:'input', data:'d\n' });
      else { S.devices = DEV.slice(); drawDev(); logAdd('  ' + S.devices.length + ' equipos encontrados','ansi-mint'); }
    }
    function bands(){
      logAdd('> escaneo de bandas 2.4/5 GHz …');
      if (bridge.connected) bridge.send({ type:'input', data:'b\n' });
      else { S.aps = APS.slice(); drawAp(); logAdd('  ' + S.aps.length + ' redes detectadas','ansi-mint'); }
    }
    function watch(){
      logAdd('> vigilando latencia …');
      if (bridge.connected) bridge.send({ type:'input', data:'w\n' });
      else if (!S.timer) S.timer = setInterval(tick, 400);
    }
    function restore(){
      stop(); S.lat = []; spark();
      logAdd('> cache ARP y DNS limpias · RED LIBRE.','ansi-amb');
      if (bridge.connected) bridge.send({ type:'input', data:'r\n\n' });
    }
    /* ---- eventos ---- */
    iface.onchange = () => { S.sel = +iface.value; logAdd('> interfaz -> ' + S.adapters[S.sel].n); };
    pow.oninput = () => { S.power = +pow.value; powV.textContent = pow.value; };
    payload.oninput = () => { S.payload = +payload.value || 1400; };
    bEco.onclick = () => { S.mode='eco'; bEco.className='on'; bTurbo.className=''; };
    bTurbo.onclick = () => { S.mode='turbo'; bTurbo.className='on turbo'; bEco.className=''; };
    const addT = el('button','mini','+');
    addT.onclick = () => { const v = tgt.value.trim(); if (v && !S.targets.includes(v)) { S.targets.push(v); drawChips(); tgt.value=''; } };
    tgt.onkeydown = e => { if (e.key === 'Enter') addT.onclick(); };

    const bAtk = el('button','btn pri full'); bAtk.innerHTML = icon('zap') + ' ' + t('trafic.attack'); bAtk.onclick = attack;
    const bStop = el('button','btn dan full'); bStop.innerHTML = icon('stop') + ' ' + t('trafic.stop'); bStop.onclick = stop;
    const bScan = el('button','btn'); bScan.innerHTML = icon('radar') + ' ' + t('trafic.scan'); bScan.onclick = scan;
    const bAp = el('button','btn'); bAp.innerHTML = icon('wifi') + ' ' + t('trafic.bands'); bAp.onclick = bands;
    const bW = el('button','btn'); bW.innerHTML = icon('pulse') + ' ' + t('trafic.watch'); bW.onclick = watch;
    const bR = el('button','btn gho'); bR.innerHTML = icon('undo') + ' ' + t('trafic.restore'); bR.onclick = restore;

    const tabDev = el('button','on',t('trafic.tabDev')), tabAp = el('button','',t('trafic.tabAp')), tabAct = el('button','',t('trafic.tabAct'));
    const paneDev = el('div',''), paneAp = el('div',''), paneAct = el('div','');
    function tab(k){
      S.tab = k; [tabDev,tabAp,tabAct].forEach(b => b.className = '');
      paneDev.style.display = paneAp.style.display = paneAct.style.display = 'none';
      if (k==='dev'){ tabDev.className='on'; paneDev.style.display=''; }
      else if (k==='ap'){ tabAp.className='on'; paneAp.style.display=''; }
      else { tabAct.className='on'; paneAct.style.display=''; }
    }
    tabDev.onclick=()=>tab('dev'); tabAp.onclick=()=>tab('ap'); tabAct.onclick=()=>tab('act');

    paneDev.append(h('table','tbl', h('thead',null,h('tr',null,h('th',{text:''}),h('th',{text:'IP'}),h('th',{text:'MAC'}),h('th',{text:'FABRICANTE'}),h('th',{text:''}))), devBody));
    paneAp.append(h('table','tbl', h('thead',null,h('tr',null,h('th',{text:t('trafic.band')}),h('th',{text:t('trafic.ch')}),h('th',{text:t('trafic.sig')}),h('th',{text:''}),h('th',{text:'SSID'}))), apBody));
    paneAct.append(logBox);

    host.append(h('div',null,
      h('div','head',
        h('div',null, h('div','crumb',null,'ROOT / TOOLKIT / ',h('b',null,'TRAFIC')),
          h('h1',null,'TRAFIC'), h('p',null,t('trafic.desc'))),
        h('div',null, stPill)),
      h('div','metrics',
        h('div','metric',h('span',null,t('trafic.state')),mState),
        h('div','metric',h('span',null,t('trafic.threads')),mHilos),
        h('div','metric',h('span',null,'PPS'),mPps),
        h('div','metric',h('span',null,t('trafic.latency')),mLat)),
      h('div','grid g2',{style:'margin-top:14px'},
        h('section','card',
          h('div','card-h', h('span',null,t('trafic.control')),
            h('span',{class:'badge ' + (bridge.connected?'ok':'wn')}, bridge.connected ? t('common.real') : t('common.web'))),
          h('div','card-b',
            h('div','field', h('label',null,t('trafic.iface')), iface),
            h('div','field', h('label',null,t('trafic.targets')), h('div','row',tgt,addT), h('div',{style:'margin-top:7px'},chips)),
            h('div','field', h('label',null,t('trafic.power'),powV), pow),
            h('div','field', h('label',null,t('trafic.mode')), seg),
            h('div','field', h('label',null,t('trafic.payload')), payload),
            h('div',{class:'row',style:'margin-bottom:8px'}, bAtk, bStop),
            h('div',{class:'row',style:'flex-wrap:wrap'}, bScan, bAp, bW, bR))),
        h('section','card',
          h('div','mtab', tabDev, tabAp, tabAct),
          h('div','card-b tight', paneDev, paneAp, paneAct)))));

    adapters(); drawChips(); drawDev(); drawAp(); metrics(); tab('dev');

    /* salida del binario real -> log + parseo a tablas */
    bridge.on(m => {
      if (m.type !== 'out') return;
      logAdd(m.text.replace(/\x1b\[[0-9;]*m/g,''));
      const dev = m.text.match(/^\s*\d+\s+(\d+\.\d+\.\d+\.\d+)\s+([0-9a-f:]{17})\s+(\S*)/gim);
      if (dev && dev.length) { S.devices = dev.map(l => { const p = l.trim().split(/\s+/); return { ip:p[1], mac:p[2], fab:p[3]||'' }; }); drawDev(); }
      const ap = m.text.match(/^\s*(2\.4|5)\s*GHz\s+ch(\d+)\s+(-?\d+)\s*dBm\s+(.*)$/gim);
      if (ap && ap.length) { S.aps = ap.map(l => { const p = l.trim().match(/(2\.4|5)\s*GHz\s+ch(\d+)\s+(-?\d+)\s*dBm\s+(.*)/);
        return { b:p[1]+' GHz', ch:+p[2], dbm:+p[3], s:p[4] }; }); drawAp(); }
    });
  }
});