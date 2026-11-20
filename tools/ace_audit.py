#!/usr/bin/env python3
"""Ace audit: checks that every generated hole can actually be aced with the game's own physics, and writes the
ACE_FIX table that index.html uses to swap in a working condition / wind / pin where the random draw made one impossible.

  python3 tools/ace_audit.py FIRST LAST [--out fixes.jsonl] [--check]     (needs playwright + chrome)

For each hole it replays tee shots (every club that can reach, power on the game's 0.001 grid, aim on its 0.1 yd grid, no curve)
through the same stepBall() the server replays, and counts how many (club, power, aim) combinations finish in the cup,
whether by dropping in or rolling in. A hole needs at least MIN_ACES of them. If it has fewer, the nearest variant (softer
course condition, calmer wind, a more reachable pin spot) that does is chosen.
--check audits the table as it stands in index.html (use it before every release); without it the table is rebuilt."""
import itertools, json, os, re, sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MIN_ACES = 6
CHROME = os.environ.get('CHROME', '/usr/bin/google-chrome')
HOOK = r"""
window.__aud = () => {
  const raw = (clubId, p, aim) => {
    mode='full'; clubIdx = CLUBS.findIndex(c=>c.id===clubId); fullType='full'; currentLie='tee';
    const dd = Math.max(0.5, dPin(0,0)); const yaw = yawTo(0,0) + Math.atan2(aim, dd); const gh = Hh(0,0); const L = shotParams(p);
    const b = {x:0,z:0,sx:0,sz:0,trail:[],carry:0,t:0,wet:false,lipped:false,lipT:0,side:0,spin:L.spin,y:gh+0.05,vx:L.speed*Math.cos(L.launch)*Math.sin(yaw),vy:L.speed*Math.sin(L.launch),vz:L.speed*Math.cos(L.launch)*Math.cos(yaw),state:'air',landed:false,bounced:false};
    let i=0; while (b.state==='air'||b.state==='roll'){ stepBall(1/240,b,false); if(++i>240*60) break; }
    return b;
  };
  ffMute = true; const _f = finish; finish = () => {}; const _s = sfx.cup, _sp = sfx.splash; sfx.cup = ()=>{}; sfx.splash = ()=>{};
  const d = dPin(0,0), y0 = yawTo(0,0), out = {yd:+d.toFixed(1), clubs:[], total:0};
  for (const c of CLUBS){
    if (c.carry < d-14 || c.carry > d+45) continue;
    let pa=null, pb=null;
    for (let p=0.5; p<=1.0001; p+=0.005){ const b = raw(c.id,p,0); const cr = b.landX===undefined?0:Math.hypot(b.landX,b.landZ); if (cr>=d-14 && pa===null) pa=p; if (cr<=d+3) pb=p; }
    if (pa===null || pb===null){ out.clubs.push({club:c.id,holed:0,n:0}); continue; }
    let holed=0, n=0;
    for (let p=Math.round((pa-0.005)*1000)/1000; p<=pb+0.005; p+=0.001){
      const pr = Math.round(p*1000)/1000, b0 = raw(c.id,pr,0), lx = (b0.landX===undefined?b0.x:b0.landX) - PIN.x, lz = (b0.landZ===undefined?b0.z:b0.landZ) - PIN.z;
      const a0 = -(lx*Math.cos(y0) - lz*Math.sin(y0));
      for (let a=a0-2; a<=a0+2.001; a+=0.1){ const ar = Math.round(a*10)/10; if (Math.abs(ar) > 40) continue; n++; if (raw(c.id,pr,ar).state==='holed') holed++; }
    }
    out.clubs.push({club:c.id,holed,n}); out.total += holed;
  }
  ffMute=false; finish=_f; sfx.cup=_s; sfx.splash=_sp;
  out.cond = LOOK.cond; out.type = LOOK.type; out.pin = LOOK.pin; out.wind = LOOK.wind;
  return out;
};"""

def build_page(path, check):
    src = open(os.path.join(ROOT, 'index.html')).read()
    if not check:
        assert 'const ACE_FIX = {/*ACEFIX*/};' in src or 'const ACE_FIX = {' in src
        src = re.sub(r'const ACE_FIX = \{.*?\};\n', 'const ACE_FIX = window.__OVR || {};\n', src, count=1, flags=re.S)
    marker = "\n})();\n</script>"
    assert src.count(marker) == 1
    open(path, 'w').write(src.replace(marker, HOOK + marker))

def variants(pick):
    conds = [pick['cond']] + [c for c in ('normal', 'soft') if c != pick['cond']]
    winds = [pick['wind']] + [w for w in ('steady', 'calm') if w != pick['wind']]
    pins = [pick['pin']] + [p for p in ('middle', 'front', 'back') if p != pick['pin']]
    combos = list(itertools.product(range(len(conds)), range(len(winds)), range(len(pins))))
    combos.sort(key=lambda t: (sum(1 for x in t if x), t[0], t[2], t[1]))
    for ci, wi, pi in combos[1:]:
        yield {'cond': conds[ci], 'wind': winds[wi], 'pin': pins[pi]}

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    check = '--check' in sys.argv
    out = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else None
    if out and out in args: args.remove(out)
    first, last = int(args[0]), int(args[1])
    page = f'/tmp/ace_audit_{os.getpid()}.html'; build_page(page, check)
    keys = []
    for n in range(first, last + 1):
        wd = ((n - 1 + 5) % 7)
        keys += [(n, k) for k in range(3)] if wd in (5, 6) else [(n, 0)]
    res = []
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
        def run(n, sub, ovr):
            pg = br.new_page(); pg.set_default_timeout(0)
            pg.add_init_script('window.__OVR = ' + json.dumps(ovr))
            pg.goto(f'file://{page}#h{n}' + (f's{sub}' if sub else ''), wait_until='domcontentloaded'); pg.wait_for_timeout(1200)
            try: return pg.evaluate('window.__aud()')
            finally: pg.close()
        for n, sub in keys:
            key = str(n) if sub == 0 else f'{n}.{sub}'
            base = run(n, sub, {})
            rec = {'key': key, 'base': base['total'], 'orig': {k: base[k] for k in ('cond', 'wind', 'pin', 'type', 'yd')}}
            if base['total'] < MIN_ACES and not check:
                for v in variants(base):
                    r = run(n, sub, {key if sub else n: v}) if sub == 0 else run(n, sub, {key: v})
                    if r['total'] >= MIN_ACES:
                        rec['fix'] = v; rec['fixed'] = r['total']; rec['fixed_yd'] = r['yd']; break
                else:
                    rec['fix'] = None
            print(json.dumps(rec), flush=True)
            if out: open(out, 'a').write(json.dumps(rec) + '\n')
        br.close()
    os.remove(page)

if __name__ == '__main__': main()
