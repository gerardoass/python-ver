/* =============================================================================
 *  modules/metadata.js — lector EXIF local (GPS, fecha, cámara, software)
 *  Parser TIFF/IFD propio + mapa Leaflet + huella SHA-256
 * ========================================================================== */
FS.register({
  id:'meta', icon:'img',
  title:{en:'METADATA', es:'METADATA'},
  sub:{en:'EXIF · GPS · date', es:'EXIF · GPS · fecha'},

  render(host, F){
    const {h, t, toast, icon, sha} = F;
    const out = h('div');
    const drop = h('div','drop', h('span',{html:icon('down',22)}),
      h('div',{style:'margin-top:8px;font-size:11px'}, t('meta.drop')),
      h('div',{style:'font-size:9px;color:var(--dim)'},'JPEG · PNG · WebP'));
    const inp = h('input',{type:'file',multiple:true,accept:'image/*',style:'display:none'});

    drop.onclick = () => inp.click();
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('hot'); };
    drop.ondragleave = () => drop.classList.remove('hot');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('hot'); handle(e.dataTransfer.files); };
    inp.onchange = () => handle(inp.files);

    async function handle(files){
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const dim = await size(buf, f.type);
        const ex = parseEXIF(new Uint8Array(buf));

        const c = h('div','card',{style:'margin-bottom:12px'},
          h('div','card-h', h('span',null,f.name.slice(0,42)),
            h('span',{class:'badge '+(ex.gps?'ok':'wn')}, ex.gps ? 'GPS ✔' : 'SIN GPS')));
        const b = h('div','card-b'); c.append(b);

        const left = h('div',null, h('img',{src:URL.createObjectURL(f),
          style:'width:100%;max-height:220px;object-fit:contain;border-radius:6px;border:1px solid var(--line);background:#040606'}));
        const kv = h('div','kv');
        const add = (k,v,hi) => { if (v==null||v==='') return; kv.append(h('dt',null,k), h('dd',{class:hi?'hi':''}, String(v))); };
        add('archivo', f.name);
        add('tamaño', (f.size/1024).toFixed(1)+' KB');
        add('tipo', f.type);
        add('dimensiones', dim);
        add('sha256', (await sha(buf)).slice(0,24)+'…');
        add('fecha', ex.date, true);
        add('cámara', ex.make && (ex.make+' '+ex.model));
        add('software', ex.software);
        add('exposición', ex.exp);
        add('iso', ex.iso);
        add('gps', ex.gps ? ex.gps.lat.toFixed(6)+', '+ex.gps.lon.toFixed(6) : null, true);
        add('altitud', ex.gps && ex.gps.alt != null ? ex.gps.alt+' m' : null);

        const right = h('div',null,kv);
        if (ex.gps) {
          const map = h('div','map',{style:'margin-top:10px'}); right.append(map);
          setTimeout(() => loadMap(map, ex.gps), 60);
          right.append(h('div',{class:'row',style:'margin-top:8px'},
            h('a',{class:'btn sm',href:'https://www.google.com/maps?q='+ex.gps.lat+','+ex.gps.lon,target:'_blank',rel:'noopener'},'Google Maps'),
            h('a',{class:'btn sm gho',href:'https://www.openstreetmap.org/?mlat='+ex.gps.lat+'&mlon='+ex.gps.lon+'#map=17/'+ex.gps.lat+'/'+ex.gps.lon,target:'_blank',rel:'noopener'},'OSM')));
        } else {
          right.append(h('div',{style:'margin-top:10px;font-size:10px;color:var(--dim)'}, t('meta.clean')));
        }
        if (Object.keys(ex.raw).length) {
          const det = h('details',{style:'margin-top:10px'},
            h('summary',{style:'font-size:9.5px;color:var(--muted);cursor:pointer'}, t('meta.all')+' ('+Object.keys(ex.raw).length+')'));
          const dk = h('div','kv');
          Object.keys(ex.raw).slice(0,80).forEach(k => dk.append(h('dt',null,k), h('dd',null,String(ex.raw[k]).slice(0,90))));
          det.append(dk); right.append(det);
        }
        b.append(h('div','grid g2e', left, right));
        out.prepend(c);
      }
    }

    function size(buf, type){
      return new Promise(res => {
        const u = URL.createObjectURL(new Blob([buf],{type:type||'image/*'}));
        const i = new Image();
        i.onload = () => { res(i.naturalWidth+' × '+i.naturalHeight); URL.revokeObjectURL(u); };
        i.onerror = () => res('?');
        i.src = u;
      });
    }

    /* ------------------- parser EXIF (TIFF / IFD) ------------------- */
    const TAG = {0x010F:'Make',0x0110:'Model',0x0131:'Software',0x0132:'ModifyDate',0x9003:'DateTimeOriginal',
      0x9004:'CreateDate',0x829A:'ExposureTime',0x829D:'FNumber',0x8827:'ISO',0x920A:'FocalLength',
      0x9209:'Flash',0x0112:'Orientation',0x013B:'Artist',0x8298:'Copyright',0x010E:'ImageDescription',
      0xA002:'PixelXDimension',0xA003:'PixelYDimension',0xA434:'LensModel',
      0x0001:'GPSLatitudeRef',0x0002:'GPSLatitude',0x0003:'GPSLongitudeRef',0x0004:'GPSLongitude',
      0x0005:'GPSAltitudeRef',0x0006:'GPSAltitude',0x0007:'GPSTimeStamp',0x001D:'GPSDateStamp'};

    function parseEXIF(u8){
      const out = { raw:{} };
      if (u8[0] !== 0xFF || u8[1] !== 0xD8) return out;   // solo JPEG
      let off = 2;
      while (off < u8.length - 4) {
        if (u8[off] !== 0xFF) { off++; continue; }
        const m = u8[off+1];
        if (m === 0xE1) {
          const s = off + 4;
          if (String.fromCharCode(u8[s],u8[s+1],u8[s+2],u8[s+3],u8[s+4],u8[s+5]) === 'Exif\u0000\u0000') tiff(u8, s+6, out);
          break;
        }
        if (m === 0xDA || m === 0xD9) break;
        off += 2 + ((u8[off+2]<<8) | u8[off+3]);
      }
      return out;
    }

    function tiff(u8, base, out){
      const le = String.fromCharCode(u8[base],u8[base+1]) === 'II';
      const R = (o,n) => { let v=0; if (le) { for (let i=n-1;i>=0;i--) v=(v<<8)|u8[o+i]; } else { for (let i=0;i<n;i++) v=(v<<8)|u8[o+i]; } return v; };
      const gps = {}; let lat, lon, alt, latR, lonR;

      const ifd = (off, which) => {
        const n = R(off,2);
        for (let i=0;i<n;i++) {
          const e = off + 2 + i*12;
          const tag = R(e,2), typ = R(e+2,2), cnt = R(e+4,4), vo = e+8;
          const sizeA = [0,1,1,2,4,8,1,1,2,4,8,4,8][typ] || 1;
          const total = sizeA*cnt;
          const valOff = total > 4 ? base + R(vo,4) : vo;
          const str = () => { let s=''; for (let k=0;k<cnt;k++){ const ch=u8[valOff+k]; if (ch) s+=String.fromCharCode(ch); } return s; };
          const num = () => typ===3 ? R(valOff,2) : typ===4 ? R(valOff,4) :
                        typ===5 ? R(valOff,4)/R(valOff+4,4) : typ===10 ? R(valOff,4)/R(valOff+4,4) : R(valOff,sizeA);
          const name = TAG[tag]; if (!name) continue;

          if (which === 'gps') {
            gps[name] = typ===2 ? str() : num();
            if (tag===0x0002){ lat=[]; for(let k=0;k<cnt;k++){ const o2=valOff+k*8; lat.push(R(o2,4)/R(o2+4,4)); } }
            if (tag===0x0004){ lon=[]; for(let k=0;k<cnt;k++){ const o2=valOff+k*8; lon.push(R(o2,4)/R(o2+4,4)); } }
            if (tag===0x0001) latR = str();
            if (tag===0x0003) lonR = str();
            if (tag===0x0006) alt = num();
            continue;
          }
          if (tag===0x8769){ ifd(base + R(vo,4), 'exif'); continue; }
          if (tag===0x8825){ ifd(base + R(vo,4), 'gps');  continue; }
          out.raw[name] = typ===2 ? str() : num();
        }
      };
      ifd(base + R(base+4,4), 'main');

      const g = out.raw;
      out.make = g.Make; out.model = g.Model; out.software = g.Software;
      out.date = g.DateTimeOriginal || g.CreateDate || g.ModifyDate;
      out.exp = g.ExposureTime ? (g.ExposureTime < 1 ? '1/'+Math.round(1/g.ExposureTime) : g.ExposureTime+'s') : null;
      out.iso = g.ISO;
      if (lat && lon) {
        const d = a => a[0] + a[1]/60 + (a[2]||0)/3600;
        let la = d(lat), lo = d(lon);
        if (latR === 'S') la = -la;
        if (lonR === 'W') lo = -lo;
        out.gps = { lat:la, lon:lo, alt: alt ? Math.round(alt) : null };
      }
      Object.assign(out.raw, gps);
    }

    /* --------------------------- mapa Leaflet --------------------------- */
    function loadMap(el, gps){
      if (window.L) return mk(el,gps);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = () => {
        const l = document.createElement('link');
        l.rel='stylesheet'; l.href='https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
        document.head.append(l); setTimeout(() => mk(el,gps), 80);
      };
      document.head.append(s);
    }
    function mk(el, gps){
      const m = L.map(el).setView([gps.lat, gps.lon], 16);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=cb1_2nve_1_afe1da6ca18e958f7724fb54',{attribution:'© OSM'}).addTo(m);
      L.marker([gps.lat, gps.lon]).addTo(m);
      setTimeout(() => m.invalidateSize(), 120);
    }

    host.append(h('div',null,
      h('div','head',
        h('div',null, h('div','crumb',null,'ROOT / TOOLKIT / ',h('b',null,'METADATA')),
          h('h1',null,'METADATA'), h('p',null,t('meta.desc'))),
        h('span',{class:'badge ok'},'EXIF · OFFLINE')),
      drop, inp, h('div',{style:'height:14px'}), out));
  }
});