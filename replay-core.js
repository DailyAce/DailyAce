// Daily Ace physics for the server-side shot replay. Generated from the game. Upload next to index.html.
function makeHole(holeNum){
"use strict";
const D2R = Math.PI/180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function hash(n){ let h = 2166136261 ^ n; for (let i=0;i<6;i++){ h = Math.imul(h ^ (h >>> 13), 0x5bd1e995); h ^= h >>> 15; } return h >>> 0; }
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const R = rng(hash(holeNum * 7919));
const rr = (a, b) => a + R()*(b-a);
const fxR = rng(99);
const NAMES = ['Osprey Point','Cedar Bluff','Heron Lake','Saltmarsh','Granite Ridge','Fox Hollow','Willow Bend','Kestrel Cove','Juniper Flats','Lantern Hill','Bramble Pond','Stillwater','Quarry Rise','Larkspur','Old Mill Run','Ironwood',
  'Sandpiper Bay','Hawthorn Gap','Bluestem','Pine Barrens','Lighthouse Reach','Copper Creek','Elm Hollow','Whistling Pines','Tern Island','Maple Rise','Kingfisher','Driftwood','Silver Lake','Thistle Down','Owl\'s Head','Cranberry Bog','Shepherd\'s Rest','Black Rock','Wren Meadow','Fiddler\'s Green','Marsh Hawk','Briar Patch','Summit Pond','Lost Pines'];
const nameFor = n => NAMES[(((n*17) % NAMES.length) + NAMES.length) % NAMES.length];  // walks every name before any repeats
R(); const holeName = nameFor(holeNum);
// ---------- palettes ----------
const PALETTES = {
  golden: {sky:['#272a57','#6b4f7f','#d77f7c','#f6b67f','#fbd59a'], sun:[0.13,0.085], core:'#fff4da', glow:'255,214,150',
    ridges:[['#b48aa0','#d7a59a'],['#7c6487','#a77c8c'],['#45405f','#5e5170']], gfar:'#8d7d5e', gmid:'#4c6c37', gnear:'#3a5d2c',
    water:['#f6c890','#d99487','#6d5f86','#2f3c63'], tree:['#23332c','#2b3a2a'], haze:'#9a7487', rim:'255,190,120', green:['#83bb58','#649d43'], fringe:'#5a8b3b', fair:'#4f7e37', mist:0, kind:'pine', cloud:'255,200,160'},
  mist: {sky:['#7f93b5','#aab6cc','#d9d2da','#f1dfd0','#f6e9dc'], sun:[-0.22,0.12], core:'#fffaf0', glow:'255,240,215',
    ridges:[['#a4adc2','#c4c6d2'],['#8591a8','#a6abbc'],['#5a6680','#717a92']], gfar:'#9ea795', gmid:'#58784a', gnear:'#3d6233',
    water:['#f1ece6','#cdd2dc','#7f8fb0','#3b4d6e'], tree:['#21322d','#2a3a33'], haze:'#aab3c2', rim:'255,245,225', green:['#7db65a','#5f9a45'], fringe:'#55873d', fair:'#4c7c38', mist:1, kind:'pine', cloud:'255,245,235'},
  autumn: {sky:['#365f97','#5f8dbf','#9dbcd6','#e6d8b8','#f3e0b1'], sun:[0.26,0.16], core:'#fffbe8', glow:'255,236,180',
    ridges:[['#8ea2b8','#b5bfc4'],['#6e8197','#909da8'],['#4d5a66','#65707a']], gfar:'#a59b67', gmid:'#5a7440', gnear:'#41632f',
    water:['#e3e7e3','#a9bfd0','#4f6f99','#26395e'], tree:['#2a3b2c','#33402b'], haze:'#a3b0bd', rim:'255,225,170', green:['#86bd5a','#669f45'], fringe:'#5c8c3d', fair:'#52803a', mist:0, kind:'mixed', cloud:'255,250,240',
    leaves:['#c4562b','#d98c2b','#a8361f','#e0b03a','#b8642a']},
};
const PAL_NAME = ['golden','mist','autumn'][Math.floor(R()*3)];
const PAL = PALETTES[PAL_NAME];

// ---------- weekly difficulty curve ----------
// Easy Monday, building to the toughest hole on Friday, easing off for the weekend. Starts with hole 5 (Wed, Oct 21, 2026);
// earlier holes keep their original layout so past rounds still replay exactly.
const CURVE_FROM = 5;
const WEEKDAY = (((holeNum - 1 + 5) % 7) + 7) % 7;           // 0 = Monday (hole 1 was a Saturday)
const CURVE = [0.08, 0.3, 0.5, 0.72, 0.95, 0.5, 0.3];
const DIFF_WORDS = ['Easy', 'Medium', 'Tricky', 'Hard', 'Toughest', 'Tricky', 'Medium'];
const CURVED = holeNum >= CURVE_FROM, DIFF = CURVED ? CURVE[WEEKDAY] : 0.5, DIFF_WORD = CURVED ? DIFF_WORDS[WEEKDAY] : null;
const dl = (easy, hard) => easy + (hard - easy)*DIFF;               // value for today's difficulty
const rg = (a, b, ea, eb, ha, hb) => CURVED ? rr(dl(ea, ha), dl(eb, hb)) : rr(a, b);   // one draw either way

// ---------- hole generation ----------
const SIDE = R() < 0.5 ? -1 : 1;                      // the side the water wraps
const GR = {x:rr(-7,7)*-SIDE, z:rg(148,184, 138,156, 176,194), rx:rg(20,24, 22.5,25.5, 17.5,20.5), rz:rg(16.5,20, 18.5,21.5, 14,17), rot:rr(-0.35,0.35), p1:rr(0,6.28), p2:rr(0,6.28)};
const FRINGE_W = 3.2;
const AVG_R = (GR.rx + GR.rz)/2;
function lobe(a){ return 1 + 0.07*Math.sin(3*a + GR.p1) + 0.05*Math.cos(2*a + GR.p2); }
function gDist(x, z){ // normalized distance from green centre: 1 = green edge
  const c = Math.cos(-GR.rot), s = Math.sin(-GR.rot); const dx = x-GR.x, dz = z-GR.z;
  const px = dx*c - dz*s, pz = dx*s + dz*c; const a = Math.atan2(pz/GR.rz, px/GR.rx);
  return Math.hypot(px/GR.rx, pz/GR.rz) / lobe(a);
}
function shapePts(scale, n=64){ // outline at normalized distance `scale`
  const pts = []; const c = Math.cos(GR.rot), s = Math.sin(GR.rot);
  for (let i=0;i<n;i++){ const a = i/n*Math.PI*2; const l = lobe(a)*scale; const px = Math.cos(a)*GR.rx*l, pz = Math.sin(a)*GR.rz*l; pts.push([GR.x + px*c - pz*s, GR.z + px*s + pz*c]); }
  return pts;
}
const FRINGE_SCALE = 1 + FRINGE_W/AVG_R;
const greenPts = shapePts(1), fringePts = shapePts(FRINGE_SCALE);

// contours: tilt, a tier, and mounds/hollows
const SLOPE_K = CURVED ? dl(0.7, 1.4) : 1, BUMP_K = CURVED ? dl(0.65, 1.45) : 1;
const TILT = {z:rr(0.012,0.024)*SLOPE_K, x:rr(-0.012,0.012)*SLOPE_K};
const TIER = R() < 0.7 ? {ang:rr(0,6.28), off:rr(-6,6), h:rr(0.3,0.55)*SLOPE_K} : null;
const BUMPS = Array.from({length:4+Math.floor(R()*3)}, () => { const a = rr(0,6.28), d = rr(0,0.85); return {x:GR.x + Math.cos(a)*GR.rx*d, z:GR.z + Math.sin(a)*GR.rz*d, r:rr(4,9), a:rr(0.12,0.36)*BUMP_K*(R()<0.6?1:-1)}; });
function rawH(x, z){
  let h = TILT.z*(z-GR.z) + TILT.x*(x-GR.x);
  if (TIER){ const t = ((x-GR.x)*Math.cos(TIER.ang) + (z-GR.z)*Math.sin(TIER.ang) - TIER.off)/2.2; h += TIER.h/(1+Math.exp(-t)); }
  for (const b of BUMPS){ const d2 = ((x-b.x)**2 + (z-b.z)**2)/(b.r*b.r); if (d2 < 9) h += b.a*Math.exp(-d2); }
  return h;
}
let RAW_MIN = Infinity; for (let i=0;i<400;i++){ const a = rr(0,6.28), d = Math.sqrt(R())*FRINGE_SCALE; const x = GR.x + Math.cos(a)*GR.rx*d, z = GR.z + Math.sin(a)*GR.rz*d; RAW_MIN = Math.min(RAW_MIN, rawH(x,z)); }
const BANK = 8;  // yards over which the green's contours fade into the surrounds
const BOX = {x0:GR.x-GR.rx*1.15-BANK-2, x1:GR.x+GR.rx*1.15+BANK+2, z0:GR.z-GR.rz*1.15-BANK-2, z1:GR.z+GR.rz*1.15+BANK+2};
function Hh(x, z){
  if (x < BOX.x0 || x > BOX.x1 || z < BOX.z0 || z > BOX.z1) return 0;
  const d = gDist(x, z); let m = 1;
  if (d > 1){ const t = Math.min(1, (d-1)*AVG_R/BANK); m = 1 - t*t*(3-2*t); }
  if (m <= 0) return 0;
  return m*(rawH(x, z) - RAW_MIN + 0.08);
}
function grad(x, z){ const e = 0.25; return [(Hh(x+e,z)-Hh(x-e,z))/(2*e), (Hh(x,z+e)-Hh(x,z-e))/(2*e)]; }

// pin: a random spot that is putting-flat enough
let PIN = null;
for (let tries=0; tries<60 && !PIN; tries++){
  const a = rr(0,6.28), d = rg(0.2,0.78, 0.12,0.5, 0.5,0.84); const x = GR.x + Math.cos(a)*GR.rx*d, z = GR.z + Math.sin(a)*GR.rz*d;
  const g = grad(x, z); if (gDist(x,z) < (CURVED ? 0.86 : 0.8) && Math.hypot(g[0], g[1]) < 0.03) PIN = {x, z};
}
if (!PIN) PIN = {x:GR.x, z:GR.z};
const YARDS = Math.round(Math.hypot(PIN.x, PIN.z));

// lake: wraps the front and one side of the green
function catmull(pts, seg){ const out = []; for (let i=0;i<pts.length-1;i++){ const p0 = pts[Math.max(0,i-1)], p1 = pts[i], p2 = pts[i+1], p3 = pts[Math.min(pts.length-1,i+2)]; for (let k=0;k<seg;k++){ const t = k/seg, t2 = t*t, t3 = t2*t; out.push([0,1].map(j => 0.5*((2*p1[j]) + (-p0[j]+p2[j])*t + (2*p0[j]-5*p1[j]+4*p2[j]-p3[j])*t2 + (-p0[j]+3*p1[j]-3*p2[j]+p3[j])*t3))); } } out.push(pts[pts.length-1]); return out; }
const FZ = GR.z - GR.rz - 4;           // front of the green complex
const sideEdge = GR.x*SIDE + GR.rx*FRINGE_SCALE + (CURVED ? dl(13, 5) : 9);   // harder days pull the water in tight
let farS = [[1400, GR.z+260],[620, GR.z+200],[sideEdge+28, GR.z+80],[sideEdge+2, GR.z+22],[sideEdge, GR.z-8],[sideEdge-4, FZ-18],[19, FZ-48],[0, FZ-56],[-34, FZ-60],[-220, FZ-52],[-1400, FZ-30]];
farS = catmull(farS, 6).map(([x,z]) => [x*SIDE, z]);
if (SIDE < 0) farS.reverse();
const nearShore = []; for (let x=-1400; x<=1400; x+=25) nearShore.push([x, 32 + 3*Math.sin(x*0.05) + 2*Math.sin(x*0.13+1) - Math.max(0, Math.abs(x)-60)*0.1]);
const lakePts = nearShore.concat(farS.map(([x,z]) => [x, z + 1.5*Math.sin(x*0.11)]));
function inPoly(pts, x, z){ let c = false; for (let i=0, j=pts.length-1; i<pts.length; j=i++){ const a = pts[i], b = pts[j]; if ((a[1] > z) !== (b[1] > z) && x < (b[0]-a[0])*(z-a[1])/(b[1]-a[1]) + a[0]) c = !c; } return c; }

// fairway: the running room into the green
const FW = CURVED ? dl(1.3, 0.85) : 1;
const fairwayPts = catmull([[-14*FW, FZ-52],[-16*FW, FZ-30],[GR.x - GR.rx*0.9, GR.z - GR.rz*0.55],[GR.x - GR.rx*0.6, GR.z],[GR.x + GR.rx*0.6, GR.z],[GR.x + GR.rx*0.9, GR.z - GR.rz*0.55],[16*FW, FZ-30],[14*FW, FZ-52],[-14*FW, FZ-52]], 5);

// bunkers
function bunker(x, z, rx, rz, rot){ if (CURVED){ const k = dl(0.85, 1.25); rx *= k; rz *= k; } const pts = []; for (let i=0;i<28;i++){ const a = i/28*Math.PI*2; const px = Math.cos(a)*rx*(1+0.08*Math.sin(a*3+x)), pz = Math.sin(a)*rz*(1+0.06*Math.cos(a*2+z)); pts.push([x + px*Math.cos(rot) - pz*Math.sin(rot), z + px*Math.sin(rot) + pz*Math.cos(rot)]); } return {x, z, rx, rz, rot, pts}; }
const BUNKERS = [];
{ const s = -SIDE; const a = Math.PI*1.5 + s*rr(0.5,0.85); // front corner on the dry side
  const d = FRINGE_SCALE + 0.18; BUNKERS.push(bunker(GR.x + Math.cos(a)*GR.rx*d, GR.z + Math.sin(a)*GR.rz*d, rr(5.5,7.5), rr(3,4), rr(-0.6,0.6))); }
{ const a = Math.PI*0.5 + SIDE*rr(0,0.6); const d = FRINGE_SCALE + 0.16; BUNKERS.push(bunker(GR.x + Math.cos(a)*GR.rx*d, GR.z + Math.sin(a)*GR.rz*d, rr(6,8), rr(2.8,3.6), rr(-0.4,0.4))); }
if (R() < (CURVED ? dl(0.2, 0.95) : 0.65)) BUNKERS.push(bunker(GR.x + rr(-8,8), FZ - rr(10,20), rr(2.6,3.6), rr(2,2.6), rr(0,3)));
function inBunker(b, x, z){ const c = Math.cos(-b.rot), s = Math.sin(-b.rot); const dx = x-b.x, dz = z-b.z; const px = dx*c - dz*s, pz = dx*s + dz*c; return px*px/(b.rx*b.rx) + pz*pz/(b.rz*b.rz) <= 1; }
const TEE = {x0:-7, x1:7, z0:-6, z1:7};
function surfaceAt(x, z){
  const d = gDist(x, z);
  if (d <= 1) return 'green';
  for (const b of BUNKERS) if (inBunker(b, x, z)) return 'sand';
  if (d <= FRINGE_SCALE) return 'fringe';
  if (inPoly(fairwayPts, x, z)) return 'fairway';
  if (inPoly(lakePts, x, z)) return 'water';
  if (x>TEE.x0 && x<TEE.x1 && z>TEE.z0 && z<TEE.z1) return 'tee';
  return 'rough';
}

// wind (same for everyone today)
const WIND = (() => { const mph = Math.round(rg(0,14, 0,6, 5,16)); const ang = rr(0, Math.PI*2); return {x:Math.sin(ang)*mph, z:Math.cos(ang)*mph, mph}; })();

// ---------- scenery ----------
const ridges = PAL.ridges.map((c, i) => {
  const r = [{z:2000,h:150,a:120},{z:1250,h:90,a:70},{z:760,h:42,a:30}][i]; const g = rng(hash(holeNum*31 + i)); const ph = [g()*9,g()*9,g()*9,g()*9];
  const pts = []; for (let x=-5200; x<=5200; x+=45){ const n = 0.55*Math.sin(x/610+ph[0]) + 0.3*Math.sin(x/233+ph[1]) + 0.12*Math.sin(x/97+ph[2]) + 0.05*Math.sin(x/31+ph[3]); pts.push([x, Math.max(25, r.h + r.a*n)]); }
  return {...r, c1:c[0], c2:c[1], pts};
});
const trees = [];
function okForTree(x, z, clear){ const s = surfaceAt(x, z); return s === 'rough' && gDist(x, z) > clear && !inPoly(lakePts, x, z); }
function addTree(x, z, h){ const round = PAL.kind === 'mixed' && fxR() < 0.7; trees.push({x, z, h, w:h*(round ? 0.55 : 0.34)*(0.9+fxR()*0.25), seed:Math.floor(fxR()*1e6), tone:fxR(), round, leaf:PAL.leaves ? PAL.leaves[Math.floor(fxR()*PAL.leaves.length)] : null}); }
for (let i=0;i<70;i++){ const x = -450 + fxR()*900, z = GR.z + 260 + fxR()*220; if (!inPoly(lakePts, x, z)) addTree(x, z, 16+fxR()*14); }
for (let i=0;i<60;i++){ const x = -SIDE*(28 + fxR()*110) + GR.x, z = 50 + fxR()*(GR.z+90); if (okForTree(x, z, 1.9)) addTree(x, z, 15+fxR()*12); }
for (let i=0;i<30;i++){ const x = GR.x + (fxR()-0.5)*120, z = GR.z + GR.rz + 22 + fxR()*60; if (okForTree(x, z, 2.1)) addTree(x, z, 16+fxR()*12); }
for (let i=0;i<14;i++){ const s = i%2 ? 1 : -1; const z = -12 + fxR()*40; const x = s*(26 + z*0.12 + fxR()*40); if (okForTree(x, z, 2)) addTree(x, z, 14+fxR()*9); }
const reeds = []; for (let i=0;i<120;i++){ const p = lakePts[Math.floor(fxR()*lakePts.length)]; if (Math.abs(p[0]) < 200) reeds.push({x:p[0] + (fxR()-0.5)*6, z:p[1] + (fxR()-0.5)*1.4, h:0.7 + fxR()*0.9}); }
const clouds = Array.from({length:7}, () => ({u:-0.9+fxR()*1.8, v:0.15+fxR()*0.5, s:0.6+fxR()*0.9, puffs:Array.from({length:5+Math.floor(fxR()*4)}, () => [fxR()*2-1, fxR()*0.5-0.25, 0.35+fxR()*0.45])}));
const glints = Array.from({length:150}, () => ({u:fxR(), v:fxR(), ph:fxR()*6.28, sp:1+fxR()*2.5, l:fxR()}));
const birds = Array.from({length:4}, (_, i) => ({u:-1.3-i*0.12-fxR()*0.1, v:0.32+fxR()*0.08, ph:fxR()*6, sp:0.012+fxR()*0.004}));

// relief grid (precomputed shading for the green complex)
const STEP = 2;
const NX = Math.ceil((BOX.x1-BOX.x0)/STEP)+1, NZ = Math.ceil((BOX.z1-BOX.z0)/STEP)+1;
const nodeH = new Float32Array(NX*NZ);
for (let j=0;j<NZ;j++) for (let i=0;i<NX;i++) nodeH[j*NX+i] = Hh(BOX.x0+i*STEP, BOX.z0+j*STEP);
const sunV = (() => { const v = [PAL.sun[0], PAL.sun[1], 1]; const l = Math.hypot(...v); return v.map(c => c/l); })();
const cells = [];
for (let j=0;j<NZ-1;j++) for (let i=0;i<NX-1;i++){
  const cx = BOX.x0+(i+0.5)*STEP, cz = BOX.z0+(j+0.5)*STEP; const surf = surfaceAt(cx, cz);
  if (surf === 'water') continue;
  const h00 = nodeH[j*NX+i], h10 = nodeH[j*NX+i+1], h01 = nodeH[(j+1)*NX+i], h11 = nodeH[(j+1)*NX+i+1];
  const hx = ((h10-h00)+(h11-h01))/(2*STEP), hz = ((h01-h00)+(h11-h10))/(2*STEP);
  const n = [-hx, 1, -hz]; const nl = Math.hypot(...n);
  const dot = (n[0]*sunV[0] + n[1]*sunV[1] + n[2]*sunV[2])/nl;
  const shade = Math.max(-1, Math.min(1, (dot - sunV[1])*7));
  if (Math.abs(shade) < 0.03 && Math.max(h00,h10,h01,h11) < 0.01) continue;
  const col = shade < 0 ? `rgba(14,22,30,${(-shade*0.5).toFixed(3)})` : `rgba(255,236,190,${(shade*0.32).toFixed(3)})`;
  const hc = (h00+h10+h01+h11)/4; const gd = gDist(cx, cz);
  let readCol = null;
  if (gd < FRINGE_SCALE + 0.05){ const band = Math.floor(hc/0.1); const t = Math.min(1, hc/1.4); const base = [61+(242-61)*t, 127+(212-127)*t, 176+(92-176)*t]; const k = band % 2 ? 1 : 0.86; readCol = `rgba(${base.map(v => Math.round(v*k)).join(',')},0.62)`; }
  cells.push({i, j, col, readCol});
}
const arrows = []; for (let z=GR.z-GR.rz; z<=GR.z+GR.rz; z+=3.2) for (let x=GR.x-GR.rx; x<=GR.x+GR.rx; x+=3.2){ if (gDist(x,z) < 0.95){ const g = grad(x,z); const s = Math.hypot(g[0], g[1]); if (s > 0.006) arrows.push({x, z, gx:-g[0]/s, gz:-g[1]/s, s}); } }

// ---------- camera & projection ----------

let mode = 'full', currentLie = 'tee', clubIdx = 4, fullType = 'full', shortType = 'pitch', stopped = false;
const ffMute = true, sfx = {cup(){}, lip(){}, thud(){}, splash(){}};
function finish(){ stopped = true; }
function splash(b){ b.state = 'wet'; b.wet = true; finish(); }
// ---------- clubs, shots, physics ----------
const G = 10.72, KD = 0.005, KL = 0.004, CUP = 0.118;
function simFlat(speed, launch, spin){ let y=0.03, z=0, vy=speed*Math.sin(launch), vz=speed*Math.cos(launch), s=spin; const dt=1/120;
  for (let i=0;i<4000;i++){ const v=Math.hypot(vy,vz); vy+=(-G-KD*v*vy+KL*v*v*s)*dt; vz+=(-KD*v*vz)*dt; y+=vy*dt; z+=vz*dt; s*=Math.exp(-dt/7); if (y<=0 && vy<0) break; } return z; }
const CLUBS = [
  {id:'SW', name:'Sand wedge', speed:39, launch:30},
  {id:'PW', name:'Pitching wedge', speed:44, launch:26},
  {id:'9i', name:'9 iron', speed:47.5, launch:23.5},
  {id:'8i', name:'8 iron', speed:51, launch:21},
  {id:'7i', name:'7 iron', speed:54.5, launch:18.5},
  {id:'6i', name:'6 iron', speed:58, launch:16.5},
  {id:'5i', name:'5 iron', speed:61.5, launch:14.5},
];
CLUBS.forEach(c => { c.carry = Math.round(simFlat(c.speed, c.launch*D2R, 1)); });
const SHORT = { chip:{name:'Chip', launch:15, spin:0.45, carry:30}, pitch:{name:'Pitch', launch:38, spin:1.0, carry:50}, flop:{name:'Flop', launch:56, spin:1.0, carry:30}, sand:{name:'Sand', launch:44, spin:0.9, carry:40} };
for (const k in SHORT){ const s = SHORT[k]; let lo = 3, hi = 60; for (let i=0;i<30;i++){ const m = (lo+hi)/2; if (simFlat(m, s.launch*D2R, s.spin) < s.carry) lo = m; else hi = m; } s.v100 = (lo+hi)/2; }
const SURF = {
  green:{keep:0.22, e:0.16, dec:0.65}, fringe:{keep:0.3, e:0.2, dec:1.5}, fairway:{keep:0.42, e:0.25, dec:1.5},
  rough:{keep:0.2, e:0.12, dec:5}, tee:{keep:0.35, e:0.2, dec:2}, sand:{keep:0.03, e:0.02, dec:40} };
const PUTT_RANGES = [4, 8, 15, 30, 60, 100]; // feet rolled at 100% on a flat green
const MAX_STROKES = 6;
const LIE_NAME = {tee:'Tee box', fairway:'Fairway', rough:'Rough', sand:'Bunker', fringe:'Fringe', green:'Green', water:'Water'};
const LIE_IN = {tee:'still on the tee', fairway:'on the fairway', rough:'in the rough', sand:'in the bunker', fringe:'on the fringe', green:'on the green', water:'in the water'};

// expected strokes to hole out (v1 baseline, tuned to this game; replaced by the field's own data later)
function interp(tbl, x){ if (x <= tbl[0][0]) return tbl[0][1]; for (let i=1;i<tbl.length;i++){ if (x <= tbl[i][0]){ const a = tbl[i-1], b = tbl[i]; return a[1] + (b[1]-a[1])*(x-a[0])/(b[0]-a[0]); } } const a = tbl.at(-2), b = tbl.at(-1); return b[1] + (b[1]-a[1])*(x-b[0])/(b[0]-a[0]); }
const E_PUTT = [[0,1],[1,1],[2,1.01],[3,1.04],[4,1.13],[5,1.23],[6,1.34],[8,1.5],[10,1.61],[15,1.78],[20,1.87],[30,1.98],[40,2.06],[50,2.14],[60,2.21],[90,2.4],[120,2.55]];
const E_FAIR = [[0,2.1],[5,2.2],[10,2.3],[20,2.4],[30,2.52],[40,2.6],[60,2.7],[80,2.75],[100,2.8],[120,2.85],[140,2.91],[160,2.98],[180,3.08],[200,3.19],[220,3.32]];
const E_SAND = [[0,2.35],[5,2.4],[10,2.43],[20,2.53],[30,2.66],[40,2.82],[60,3.15],[100,3.23],[150,3.25],[200,3.4]];
function expStrokes(lie, yd){
  if (lie === 'holed') return 0;
  if (lie === 'green') return interp(E_PUTT, yd*3);
  if (lie === 'fringe') return Math.min(interp(E_PUTT, yd*3) + 0.08, interp(E_FAIR, yd));
  if (lie === 'sand') return interp(E_SAND, yd);
  const f = interp(E_FAIR, yd);
  if (lie === 'rough') return f + (yd <= 20 ? 0.12 : yd >= 100 ? 0.18 : 0.12 + 0.06*(yd-20)/80);
  return f;
}

const dPin = (x, z) => Math.hypot(x-PIN.x, z-PIN.z);
const yawTo = (x, z) => Math.atan2(PIN.x-x, PIN.z-z);
// where the target sits: aimOff is stored as the sideways offset at pin distance (that's what the shot uses),
// aimDist moves the target nearer or farther along the same line
function aimGeom(){
  const d = Math.max(0.5, dPin(ball.x, ball.z)), y0 = yawTo(ball.x, ball.z), along = aimDist ?? d, lat = aimOff*along/d;
  return {d, y0, along, lat, x:ball.x + Math.sin(y0)*along + Math.cos(y0)*lat, z:ball.z + Math.cos(y0)*along - Math.sin(y0)*lat};
}
function lieMods(){
  if (currentLie === 'rough') return {v:0.94, s:0.55};
  if (currentLie === 'sand') return mode === 'short' && shortType === 'sand' ? {v:1, s:1} : {v: mode === 'full' ? 0.88 : 0.6, s:0.5};
  return {v:1, s:1};
}
function shotParams(power){
  const m = lieMods();
  if (mode === 'full'){ const c = CLUBS[clubIdx], knock = fullType === 'punch';
    return {speed:c.speed*(knock ? 0.95 : 1)*(0.32 + 0.68*Math.min(power, 1.06))*m.v, launch:(c.launch - (knock ? 4 : 0) - (power < 0.25 ? 8 : 0))*D2R, spin:(knock ? 0.75 : 1)*m.s}; }
  const s = SHORT[shortType];
  return {speed:s.v100*Math.sqrt(clamp(power, 0.02, 1.06))*m.v, launch:s.launch*D2R, spin:s.spin*m.s};
}
function stepBall(dt, b, sim){
  b.t += dt;
  if (b.state === 'air'){
    const v = Math.hypot(b.vx, b.vy, b.vz), vh = Math.hypot(b.vx, b.vz) || 1, wk = sim ? 0 : 1;
    b.vx += (-KD*v*b.vx + WIND.x*0.05*wk + b.side*b.spin*(b.vz/vh))*dt;
    b.vz += (-KD*v*b.vz + WIND.z*0.05*wk - b.side*b.spin*(b.vx/vh))*dt;
    b.vy += (-G - KD*v*b.vy + KL*v*v*b.spin)*dt;
    b.x += b.vx*dt; b.y += b.vy*dt; b.z += b.vz*dt; b.spin *= Math.exp(-dt/7);
    const gh = Hh(b.x, b.z);
    if (b.y <= gh && b.vy < 0){
      b.y = gh; const s = surfaceAt(b.x, b.z);
      if (!b.landed){
        b.landed = true; b.carry = Math.hypot(b.x-b.sx, b.z-b.sz); b.landX = b.x; b.landZ = b.z;
        if (sim){ b.state = 'stopped'; return; }
        if (dPin(b.x, b.z) < 0.07){ b.x = PIN.x; b.z = PIN.z; b.state = 'holed'; sfx.cup(); return finish(); }
      }
      if (s === 'water') return splash(b);
      const S = SURF[s]; const vh2 = Math.hypot(b.vx, b.vz) || 1; const steep = Math.min(1, Math.sin(Math.atan2(-b.vy, vh2))/Math.SQRT1_2);
      const keep = b.bounced ? 0.85 : Math.max(0.05, 1 - 0.75*b.spin*steep)*S.keep;
      b.bounced = true; b.vx *= keep; b.vz *= keep; b.vy = -b.vy*S.e; b.spin *= 0.3; b.side = 0;
      if (!ffMute) sfx.thud(s);
      if (b.vy < 1.2){ b.vy = 0; b.state = 'roll'; }
    }
  } else if (b.state === 'roll'){
    const s = surfaceAt(b.x, b.z); if (s === 'water') return splash(b);
    const S = SURF[s]; const g = grad(b.x, b.z); const sp = Math.hypot(b.vx, b.vz);
    const ax = -G*5/7*g[0], az = -G*5/7*g[1]; const slopeA = Math.hypot(ax, az);
    const dp = dPin(b.x, b.z);
    if (dp < 0.075 && b.t > (b.lipT || 0)){
      const cap = 2.4*(1 - 0.55*(dp/0.075)**2);
      if (sp < cap){ b.x = PIN.x; b.z = PIN.z; b.state = 'holed'; sfx.cup(); return finish(); }
      const side = (b.vx*(PIN.z-b.z) - b.vz*(PIN.x-b.x)) > 0 ? -1 : 1, off = dp/0.075, rot = side*0.35*off;
      const c = Math.cos(rot), sn = Math.sin(rot); const nvx = b.vx*c - b.vz*sn, nvz = b.vx*sn + b.vz*c, keep = 0.75 + 0.1*off;
      b.vx = nvx*keep; b.vz = nvz*keep; b.lipT = b.t + 0.25; b.lipped = true; if (!ffMute) sfx.lip();
    }
    if ((sp < 0.04 && slopeA < S.dec*0.9) || b.t > 40){ b.vx = b.vz = 0; b.state = 'stopped'; return finish(); }
    b.vx += ax*dt; b.vz += az*dt;
    const sp2 = Math.hypot(b.vx, b.vz); if (sp2 > 0){ const nsp = Math.max(0, sp2 - S.dec*dt); b.vx *= nsp/sp2; b.vz *= nsp/sp2; }
    b.x += b.vx*dt; b.z += b.vz*dt; b.y = Hh(b.x, b.z);
  }
}
function findDrop(x, z){
  const d0 = dPin(x, z);
  for (let r=1.5; r<=120; r+=1.5){
    let best = null;
    for (let k=0;k<72;k++){ const a = k/72*Math.PI*2; const px = x + Math.cos(a)*r, pz = z + Math.sin(a)*r; const s = surfaceAt(px, pz);
      if ((s === 'fairway' || s === 'rough' || s === 'fringe' || s === 'tee') && dPin(px, pz) >= d0 - 0.5){ const dd = dPin(px, pz); if (!best || dd < best.d) best = {x:px, z:pz, d:dd}; } }
    if (best){ const s = surfaceAt(best.x, best.z); const back = yawTo(best.x, best.z); return {x:best.x - Math.sin(back)*(s === 'fringe' ? 0 : 1.5), z:best.z - Math.cos(back)*(s === 'fringe' ? 0 : 1.5)}; }
  }
  return {x:0, z:0};
}

const gradeNum = sg => Math.round(clamp(50 + 50*Math.tanh(sg/0.75), 0, 100));
// ---- server replay: re-runs every shot of a submitted round with the game's own physics ----
function replay(shots){
  const CLUB_IDS = CLUBS.map(c => c.id), bad = why => ({ok:false, reason:why});
  if (!Array.isArray(shots) || shots.length === 0 || shots.length > 14) return bad('Round has no shots.');
  let bx = 0, bz = 0, strokes = 0, first = true, done = false, pickedUp = false, flag = null;
  const recs = [];
  for (const s of shots){
    if (!Array.isArray(s) || s.length < 12) return bad('Bad shot record.');
    if (s[1] === 'gimme' || s[12] === 1) continue;            // the server adds its own gimmes
    if (done){ flag = flag || 'Extra shots after the hole was finished.'; break; }
    const [md, type, club, , , cEndLie, cEndD, , p, cu, aim, range] = s;
    const d = dPin(bx, bz); currentLie = first ? 'tee' : surfaceAt(bx, bz);
    const canPuttHere = currentLie === 'green' || ((currentLie === 'fringe' || currentLie === 'fairway') && d < 25);
    const legal = currentLie === 'green' ? md === 'putt' : (first || d > 60) ? md === 'full' : (md === 'short' || (md === 'putt' && canPuttHere));
    if (!legal) return bad(`Shot ${recs.length + 1}: that shot isn't available from there.`);
    if (typeof p !== 'number' || typeof cu !== 'number' || typeof aim !== 'number' || !isFinite(p) || !isFinite(cu) || !isFinite(aim)) return bad('Missing swing data.');
    if (p < 0 || p > (md === 'putt' ? 1.05 : 1.12) || Math.abs(cu) > 1) return bad('Swing out of range.');
    mode = md;
    if (md === 'full'){ clubIdx = CLUB_IDS.indexOf(club); if (clubIdx < 0 || (type !== 'full' && type !== 'punch')) return bad('Unknown club.'); fullType = type; if (Math.abs(aim) > 40) return bad('Bad aim.'); }
    else if (md === 'short'){ const opts = currentLie === 'sand' ? ['sand','chip','pitch'] : ['chip','pitch','flop']; if (!opts.includes(type)) return bad('Unknown shot type.'); shortType = type; if (Math.abs(aim) > 20) return bad('Bad aim.'); }
    else { if (!PUTT_RANGES.includes(range)) return bad('Unknown putt range.'); if (!Number.isInteger(aim) || Math.abs(aim) > 40) return bad('Bad aim.'); }
    // launch(), as in the game
    const E0 = expStrokes(currentLie, d);
    const aimYawS = () => { const dd = Math.max(0.5, dPin(bx, bz)); const lat = mode === 'putt' ? aim*CUP : aim; return yawTo(bx, bz) + Math.atan2(lat, dd); };
    const yaw = aimYawS() + (mode === 'putt' ? cu*0.03 : cu*0.035);
    const gh = Hh(bx, bz);
    const b = {x:bx, z:bz, sx:bx, sz:bz, trail:[], carry:0, t:0, wet:false, lipped:false, lipT:0, side:0, spin:0};
    if (mode === 'putt'){
      const v = Math.sqrt(2*SURF.green.dec*(range/3)*p);
      Object.assign(b, {y:gh, vx:v*Math.sin(yaw), vy:0, vz:v*Math.cos(yaw), state:'roll', landed:true, bounced:true}); b.landX = b.x; b.landZ = b.z;
    } else {
      const L = shotParams(p);
      Object.assign(b, {y:gh+0.05, vx:L.speed*Math.cos(L.launch)*Math.sin(yaw), vy:L.speed*Math.sin(L.launch), vz:L.speed*Math.cos(L.launch)*Math.cos(yaw), spin:L.spin, side:cu*(mode === 'full' ? 5.5 : 2.5), state:'air', landed:false, bounced:false});
    }
    stopped = false; let i = 0;
    while (!stopped && i < 240*60){ stepBall(1/240, b, false); i++; }
    // finish(), as in the game
    const holed = b.state === 'holed', wet = !!b.wet; let endLie, endD, Ea, penalty = 0, drop = null;
    if (holed){ endLie = 'holed'; endD = 0; Ea = 0; }
    else if (wet){ penalty = 1; drop = findDrop(b.x, b.z); endLie = surfaceAt(drop.x, drop.z); endD = dPin(drop.x, drop.z); Ea = expStrokes(endLie, endD); }
    else { endLie = surfaceAt(b.x, b.z); endD = dPin(b.x, b.z); Ea = expStrokes(endLie, endD); }
    const sg = E0 - Ea - 1 - penalty;
    const rec = {mode:md, fromLie:currentLie, fromD:d, endLie, endD, holed, wet, grade:gradeNum(sg), gimme:false};
    recs.push(rec);
    if (!flag && (cEndLie !== endLie || Math.abs((+cEndD || 0) - endD) > 0.25 + 0.01*d)) flag = `Shot ${recs.length} replayed to a different spot (${endLie} ${(endD*3).toFixed(1)} ft vs ${cEndLie} ${((+cEndD||0)*3).toFixed(1)} ft).`;
    strokes += 1 + penalty; first = false;
    if (!holed && !wet && endLie === 'green' && endD*3 <= 3){ recs.push({mode:'putt', fromLie:'green', fromD:endD, endLie:'holed', endD:0, holed:true, wet:false, grade:null, gimme:true}); strokes += 1; done = true; }
    if (wet){ bx = drop.x; bz = drop.z; } else { bx = b.x; bz = b.z; }
    if (holed) done = true;
    else if (!done && strokes >= MAX_STROKES){ done = true; pickedUp = true; }
  }
  if (!done) return bad('The round never finished.');
  const grades = recs.filter(r => r.grade !== null).map(r => r.grade);
  const avg = grades.length ? grades.reduce((a, c) => a + c, 0)/grades.length : 0;
  const WORDS = {1:'Ace', 2:'Birdie', 3:'Par', 4:'Bogey', 5:'Double bogey', 6:'Triple bogey'};
  const tee = recs[0], putts = recs.filter(r => r.mode === 'putt'), made = putts.filter(r => r.holed && !r.gimme);
  let updown = null;
  recs.forEach((x, i) => { if (x.fromLie !== 'green' && i > 0 && (x.mode === 'short' || x.mode === 'putt')){ const rest = recs.slice(i+1); if (x.holed || (rest.length === 1 && rest[0].holed)) updown = Math.max(updown || 0, x.fromD*3); } });
  return {ok:true, flag, strokes: pickedUp ? 7 : strokes, word: pickedUp ? 'Picked up' : (WORDS[strokes] || `${strokes} strokes`), avg:+avg.toFixed(2),
    teeFt: tee.wet ? null : tee.holed ? 0 : +(tee.endD*3).toFixed(2), putts: putts.length, longPutt: made.length ? +Math.max(...made.map(r => r.fromD*3)).toFixed(2) : null,
    updown: updown === null ? null : +updown.toFixed(2), shots: recs.length};
}

return {replay, holeName, YARDS, PIN, WIND};
}
