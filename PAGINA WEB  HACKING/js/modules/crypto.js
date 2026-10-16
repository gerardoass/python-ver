/* =============================================================================
 *  modules/crypto.js — hashes, base64, URL y JWT (todo local)
 * ========================================================================== */
FS.register({
  id:'crypto', icon:'chip',
  title:{en:'CRYPTO', es:'CRYPTO'},
  sub:{en:'hash · b64 · jwt', es:'hash · b64 · jwt'},

  render(host, F){
    const {h, t, sha, md5} = F;
    const inp = h('textarea','inp',{rows:5,style:'height:auto;padding:10px'});
    inp.placeholder = t('crypto.ph');
    const out = h('div','card',{style:'margin-top:12px'},
      h('div','card-h', h('span',null,t('crypto.result'))),
      h('div','card-b', h('div','kv')));
    const body = out.querySelector('.kv');

    async function go(fn){
      body.innerHTML='';
      const res = await fn(inp.value);
      res.forEach(([k,v]) => body.append(h('dt',null,k), h('dd',{class:'hi',style:'font-size:10.5px'},String(v))));
    }
    const b64e = v => btoa(unescape(encodeURIComponent(v)));
    const b64d = v => decodeURIComponent(escape(atob(v.trim())));

    host.append(h('div',null,
      h('div','head',
        h('div',null, h('div','crumb',null,'ROOT / TOOLKIT / ',h('b',null,'CRYPTO')),
          h('h1',null,'CRYPTO'), h('p',null,t('crypto.desc'))),
        h('span',{class:'badge ok'},'LOCAL')),
      h('section','card', h('div','card-b', inp,
        h('div',{class:'row',style:'margin-top:10px;flex-wrap:wrap'},
          h('button',{class:'btn',onclick:()=>go(async v=>[['md5',md5(v)],['sha1',(await sha(v,'SHA-1')).slice(0,40)],['sha256',await sha(v)]])},'HASH'),
          h('button',{class:'btn',onclick:()=>go(async v=>[['b64',b64e(v)],['b64url',b64e(v).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')]])},'BASE64'),
          h('button',{class:'btn',onclick:()=>go(async v=>{try{return [['decoded',b64d(v)]];}catch(e){return [['error','base64 inválido']];}})},'DECODE'),
          h('button',{class:'btn',onclick:()=>go(async v=>[['url',encodeURIComponent(v)]])},'URL ENC'),
          h('button',{class:'btn',onclick:()=>go(async v=>{
            try{const p=v.split('.');const d=x=>JSON.parse(decodeURIComponent(escape(atob(x.replace(/-/g,'+').replace(/_/g,'/')))));
              return [['header',JSON.stringify(d(p[0]),null,1)],['payload',JSON.stringify(d(p[1]),null,1)],['firma',p[2]||'—']];
            }catch(e){return [['error','no es un JWT válido']];}})},'JWT')))),
      out));
  }
});