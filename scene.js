// Scrivania 3D: il libro chiuso appoggiato sotto la luce di una lampada, con oggetti intorno.
// Al tocco la camera scende sul libro e lo inquadra esattamente come il libro sfogliabile (a tutto schermo su telefono).
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const canvas = document.getElementById('scene');
const { spread, pageW, pageH } = window.bookGeom;
const mobile = !spread;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); } catch { renderer = null; }
if (renderer) init().catch(err => { console.error(err); document.body.classList.add('ready'); });

// ---------- texture disegnate su canvas ----------
function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function grain(ctx, w, h, amount) {
  const img = ctx.getImageData(0, 0, w, h), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amount; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  ctx.putImageData(img, 0, 0);
}
function texture(c, color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function woodCanvas() {
  const W = 2048, H = 1024, [c, x] = makeCanvas(W, H);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#5b3a22'); g.addColorStop(.5, '#6a4428'); g.addColorStop(1, '#52331d');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // venature: linee ondulate più scure e più chiare
  for (let i = 0; i < 520; i++) {
    const y0 = Math.random() * H, amp = 1 + Math.random() * 9, f = .0015 + Math.random() * .004, ph = Math.random() * 6.28, dark = Math.random() < .62;
    x.strokeStyle = dark ? `rgba(38,20,9,${.06 + Math.random() * .16})` : `rgba(170,120,78,${.04 + Math.random() * .09})`;
    x.lineWidth = .5 + Math.random() * 2.4;
    x.beginPath();
    for (let px = 0; px <= W; px += 12) {
      const py = y0 + Math.sin(px * f + ph) * amp + Math.sin(px * f * 3.3 + ph * 2) * amp * .3;
      px ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.stroke();
  }
  // nodi del legno
  for (let k = 0; k < 4; k++) {
    const kx = Math.random() * W, ky = Math.random() * H;
    for (let r = 3; r < 55; r += 2.5) { x.strokeStyle = `rgba(40,20,8,${.14 - r / 600})`; x.beginPath(); x.ellipse(kx, ky, r * 2.6, r * .7, 0, 0, 6.28); x.stroke(); }
  }
  // giunture tra le assi
  for (const y of [0, 341, 683]) { x.fillStyle = 'rgba(18,9,4,.6)'; x.fillRect(0, y, W, 3); x.fillStyle = 'rgba(255,220,180,.06)'; x.fillRect(0, y + 3, W, 1); }
  grain(x, W, H, 12);
  return c;
}

function plasterCanvas() {
  const [c, x] = makeCanvas(1024, 1024);
  x.fillStyle = '#4a3d33'; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 90; i++) {
    const r = 40 + Math.random() * 160, px = Math.random() * 1024, py = Math.random() * 1024;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${Math.random() < .5 ? '90,74,60' : '58,46,38'},.25)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  grain(x, 1024, 1024, 18);
  return c;
}

function pageEdgeCanvas() {
  const [c, x] = makeCanvas(512, 64);
  x.fillStyle = '#efe6d6'; x.fillRect(0, 0, 512, 64);
  for (let y = 0; y < 64; y += 1.5) { x.fillStyle = `rgba(120,100,80,${.08 + Math.random() * .2})`; x.fillRect(0, y, 512, .6); }
  return c;
}

function clothCanvas(color) {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = color; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 256; i += 2) { x.fillStyle = 'rgba(0,0,0,.08)'; x.fillRect(0, i, 256, 1); x.fillRect(i, 0, 1, 256); }
  grain(x, 256, 256, 14);
  return c;
}

// copertina: la stessa grafica della copertina HTML. mode: 'color' | 'metal' | 'rough' (le parti in oro riflettono la luce)
function coverCanvas(img, ratio, mode) {
  const W = 1024, H = Math.round(W / ratio), [c, x] = makeCanvas(W, H);
  const base = { color: '#2c3150', metal: '#000', rough: '#c8c8c8' }[mode];
  const gold = { color: null, metal: '#fff', rough: '#5a5a5a' }[mode];
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  if (mode === 'color') { for (let i = 0; i < H; i += 3) { x.fillStyle = 'rgba(0,0,0,.05)'; x.fillRect(0, i, W, 1); } grain(x, W, H, 10); }
  const goldFill = () => {
    if (gold) return gold;
    const g = x.createLinearGradient(0, 0, W, 0); g.addColorStop(0, '#b48e52'); g.addColorStop(.5, '#e9cf98'); g.addColorStop(1, '#b48e52'); return g;
  };
  // cornice
  const m = .045 * W;
  x.strokeStyle = gold || 'rgba(217,183,121,.55)'; x.lineWidth = 2.5;
  x.beginPath(); x.roundRect(m, m, W - 2 * m, H - 2 * m, .03 * W); x.stroke();
  // finestra ad arco con la foto
  const ww = .64 * W, wh = ww * 3.6 / 3, wx = (W - ww) / 2;
  const block = wh + .46 * W;
  const wy = mobile ? (H - block) / 2 : .12 * W;
  const r2 = .04 * W;
  x.save();
  x.beginPath();
  x.moveTo(wx, wy + ww / 2); x.arc(wx + ww / 2, wy + ww / 2, ww / 2, Math.PI, 0);
  x.lineTo(wx + ww, wy + wh - r2); x.quadraticCurveTo(wx + ww, wy + wh, wx + ww - r2, wy + wh);
  x.lineTo(wx + r2, wy + wh); x.quadraticCurveTo(wx, wy + wh, wx, wy + wh - r2); x.closePath();
  if (mode === 'color') {
    x.clip();
    const s = Math.max(ww / img.width, wh / img.height), iw = img.width * s, ih = img.height * s;
    x.drawImage(img, wx - (iw - ww) * .56, wy - (ih - wh) * .3, iw, ih);
  } else { x.fillStyle = mode === 'metal' ? '#000' : '#9a9a9a'; x.fill(); }
  x.restore();
  // nomi in oro
  x.fillStyle = goldFill(); x.textAlign = 'center';
  const fs = .12 * W, top = wy + wh;
  x.font = `italic 300 ${fs}px Fraunces`; x.fillText('Giulia', W / 2, top + .17 * W);
  x.font = `italic 300 ${fs * .45}px Fraunces`; x.fillText('&', W / 2, top + .235 * W);
  x.font = `italic 300 ${fs}px Fraunces`; x.fillText('Marco', W / 2, top + .345 * W);
  x.font = `300 ${.036 * W}px Fraunces`; x.fillStyle = gold || 'rgba(217,183,121,.9)'; x.fillText('12 giugno 2027', W / 2, top + .42 * W);
  return c;
}

function glowSprite(color) {
  const [c, x] = makeCanvas(128, 128);
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(.25, color.replace(/[\d.]+\)$/, '.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return new THREE.SpriteMaterial({ map: texture(c), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
}

function rod(a, b, r, mat) {
  const d = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 20), mat);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return mesh;
}
const shadowy = (o) => { o.traverse(m => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } }); return o; };

async function init() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const photo = new Image(); photo.src = 'foto/coppia.jpg';
  const framed = new Image(); framed.src = 'foto/velo.jpg';
  await Promise.all([photo.decode(), framed.decode(), document.fonts.load('italic 300 100px Fraunces'), document.fonts.load('300 40px Fraunces')]);

  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0806);
  scene.fog = new THREE.Fog(0x0b0806, 3.4, 7);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const camera = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .01, 20);

  // ---------- scrivania e muro ----------
  const woodTex = texture(woodCanvas());
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(2.4, 4.5);
  const desk = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshStandardMaterial({ map: woodTex, roughness: .5, metalness: 0, envMapIntensity: .35 }));
  desk.rotation.x = -Math.PI / 2; desk.position.z = .6; desk.receiveShadow = true; scene.add(desk);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), new THREE.MeshStandardMaterial({ map: texture(plasterCanvas()), roughness: 1, envMapIntensity: .2 }));
  wall.position.set(0, 1.5, -1.35); wall.receiveShadow = true; scene.add(wall);

  // foto incorniciata appesa al muro
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x2b1a10, roughness: .45 });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(.34, .44, .025), frameMat);
  frame.position.set(.42, .62, -1.33);
  const framedTex = texture(framed); framedTex.center.set(.5, .5);
  const print = new THREE.Mesh(new THREE.PlaneGeometry(.27, .37), new THREE.MeshStandardMaterial({ map: framedTex, roughness: .35 }));
  print.position.set(0, 0, .0135); frame.add(print);
  scene.add(shadowy(frame));

  // ---------- il libro ----------
  const ratio = pageW / pageH;
  const BD = .62, BW = BD * ratio, T = .045;
  const book = new THREE.Group();
  const cloth = new THREE.MeshStandardMaterial({ map: texture(clothCanvas('#2c3150')), roughness: .85 });
  const edges = new THREE.MeshStandardMaterial({ map: texture(pageEdgeCanvas()), roughness: .9 });
  const coverMat = new THREE.MeshStandardMaterial({
    map: texture(coverCanvas(photo, ratio, 'color')),
    metalnessMap: texture(coverCanvas(photo, ratio, 'metal'), false), metalness: 1,
    roughnessMap: texture(coverCanvas(photo, ratio, 'rough'), false), roughness: 1, envMapIntensity: .8,
  });
  const plate = (top) => new THREE.Mesh(new THREE.BoxGeometry(BW, .006, BD), top ? [cloth, cloth, coverMat, cloth, cloth, cloth] : cloth);
  const front = plate(true); front.position.y = T - .003;
  const back = plate(false); back.position.y = .003;
  const block = new THREE.Mesh(new THREE.BoxGeometry(BW - .008, T - .012, BD - .012), edges); block.position.set(.002, T / 2, 0);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(.008, T, BD), cloth); spine.position.x = -BW / 2 + .004; spine.position.y = T / 2;
  book.add(front, back, block, spine);
  scene.add(shadowy(book));

  // ---------- lampada da scrivania in ottone ----------
  const brass = new THREE.MeshStandardMaterial({ color: 0xb48c4c, metalness: 1, roughness: .3 });
  const lampBase = new THREE.Vector3(-.78, 0, -.55);
  const elbow = lampBase.clone().add(new THREE.Vector3(.06, .52, .02));
  const head = new THREE.Vector3(-.36, .62, -.22);
  const lamp = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.1, .11, .022, 48), brass); base.position.copy(lampBase).setY(.011);
  lamp.add(base, rod(lampBase.clone().setY(.02), elbow, .009, brass), rod(elbow, head, .008, brass));
  const joint = new THREE.Mesh(new THREE.SphereGeometry(.016, 16, 12), brass); joint.position.copy(elbow); lamp.add(joint);
  const aim = new THREE.Vector3(.02, 0, .04);
  const dir = aim.clone().sub(head).normalize();
  const shade = new THREE.Group(); shade.position.copy(head);
  shade.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);
  const shadeOut = new THREE.Mesh(new THREE.CylinderGeometry(.03, .1, .13, 48, 1, true), brass);
  const shadeIn = new THREE.Mesh(new THREE.CylinderGeometry(.029, .098, .128, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd9a0, emissiveIntensity: 1.6, side: THREE.BackSide }));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.03, 24, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe2b0, emissiveIntensity: 4 }));
  bulb.position.y = -.02;
  shade.add(shadeOut, shadeIn, bulb);
  lamp.add(shade);
  scene.add(shadowy(lamp));
  shadeIn.castShadow = bulb.castShadow = false;

  // ---------- luci ----------
  scene.add(new THREE.HemisphereLight(0xffe6c8, 0x1a0f08, .35));
  const spot = new THREE.SpotLight(0xffcf94, 5.5, 3.2, .7, .8, 1.4);
  spot.position.copy(head).addScaledVector(dir, .04);
  spot.target.position.copy(aim);
  spot.castShadow = true;
  spot.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  spot.shadow.bias = -.0004; spot.shadow.normalBias = .01;
  spot.shadow.camera.near = .05; spot.shadow.camera.far = 3;
  scene.add(spot, spot.target);
  const windowLight = new THREE.DirectionalLight(0x9fb4dc, .45);
  windowLight.position.set(2, 1.6, .4);
  scene.add(windowLight);
  const lampGlow = new THREE.Sprite(glowSprite('rgba(255,214,160,.9)')); lampGlow.scale.set(.5, .5, 1); lampGlow.position.copy(head).addScaledVector(dir, .07); scene.add(lampGlow);

  // ---------- vaso di ortensie ----------
  const vasePts = [[0, 0], [.055, 0], [.07, .02], [.078, .07], [.07, .13], [.05, .18], [.042, .2], [.046, .215]].map(([r, y]) => new THREE.Vector2(r, y));
  const vase = new THREE.Mesh(new THREE.LatheGeometry(vasePts, 64), new THREE.MeshPhysicalMaterial({ color: 0xf2ede5, roughness: .25, clearcoat: .7, clearcoatRoughness: .15 }));
  const flowers = new THREE.Group();
  flowers.add(vase);
  const petal = new THREE.SphereGeometry(.0105, 8, 6);
  const palette = ['#8fa6cf', '#a5b6e2', '#c6d0f0', '#ffffff', '#7b8ec6', '#b9c7ec'].map(c => new THREE.Color(c));
  const blooms = [[-.04, .27, .01, .07], [.05, .255, -.02, .062], [0, .3, -.045, .058], [.025, .24, .055, .05]];
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d6a3c, roughness: .6 });
  const stemMat = new THREE.MeshStandardMaterial({ color: 0x5f7d48, roughness: .7 });
  for (const [bx, by, bz, br] of blooms) {
    const n = 170, inst = new THREE.InstancedMesh(petal, new THREE.MeshStandardMaterial({ roughness: .65 }), n);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const u = Math.random(), v = Math.random() * .85, th = u * Math.PI * 2, ph = Math.acos(1 - v);
      const p = new THREE.Vector3(Math.sin(ph) * Math.cos(th), Math.cos(ph) * .85, Math.sin(ph) * Math.sin(th)).multiplyScalar(br * (.85 + Math.random() * .2));
      s.set(1, .45, 1).multiplyScalar(.8 + Math.random() * .5);
      q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
      m4.compose(p.add(new THREE.Vector3(bx, by, bz)), q, s);
      inst.setMatrixAt(i, m4); inst.setColorAt(i, palette[(Math.random() * palette.length) | 0]);
    }
    flowers.add(inst, rod(new THREE.Vector3(bx * .3, .2, bz * .3), new THREE.Vector3(bx, by - br * .5, bz), .004, stemMat));
  }
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 8), leafMat);
    const a = i / 7 * Math.PI * 2;
    leaf.scale.set(.055, .006, .024);
    leaf.position.set(Math.cos(a) * .07, .225 + Math.random() * .03, Math.sin(a) * .07);
    leaf.rotation.set(0, -a, (Math.random() - .5) * .8 - .3);
    flowers.add(leaf);
  }
  flowers.position.set(.66, 0, -.42);
  scene.add(shadowy(flowers));

  // ---------- candela ----------
  const candle = new THREE.Group();
  candle.add(new THREE.Mesh(new THREE.CylinderGeometry(.05, .056, .012, 40), brass).translateY(.006));
  const wax = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .15, 32), new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: .55, emissive: 0x6a3a10, emissiveIntensity: .05 }));
  wax.position.y = .087; candle.add(wax);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(.0012, .0012, .012, 6), new THREE.MeshBasicMaterial({ color: 0x1a1008 })); wick.position.y = .168; candle.add(wick);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.007, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffd28a })); flame.scale.set(1, 2.4, 1); flame.position.y = .186; candle.add(flame);
  const flameGlow = new THREE.Sprite(glowSprite('rgba(255,170,80,.9)')); flameGlow.scale.set(.16, .2, 1); flameGlow.position.y = .186; candle.add(flameGlow);
  const candleLight = new THREE.PointLight(0xffa458, .6, 1.4, 2); candleLight.position.y = .2; candle.add(candleLight);
  candle.position.set(-.52, 0, .34);
  shadowy(candle); flame.castShadow = false;
  scene.add(candle);

  // ---------- fedi ----------
  const gold = new THREE.MeshStandardMaterial({ color: 0xe0b45c, metalness: 1, roughness: .18, envMapIntensity: 1.2 });
  const ring1 = new THREE.Mesh(new THREE.TorusGeometry(.021, .0034, 24, 72), gold); ring1.rotation.x = Math.PI / 2; ring1.position.set(.4, .0034, .38);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(.019, .003, 24, 72), gold); ring2.rotation.set(Math.PI / 2 - 1.15, .3, 0); ring2.position.set(.428, .016, .372);
  scene.add(shadowy(ring1), shadowy(ring2));

  // ---------- stilografica ----------
  const pen = new THREE.Group();
  const lacquer = new THREE.MeshPhysicalMaterial({ color: 0x14161f, roughness: .12, clearcoat: 1 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(.0065, .0058, .12, 24), lacquer); body.rotation.z = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .055, 24), lacquer); cap.rotation.z = Math.PI / 2; cap.position.x = -.085;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(.0072, .0072, .006, 24), gold); band.rotation.z = Math.PI / 2; band.position.x = -.058;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(.04, .002, .003), gold); clip.position.set(-.09, .0075, 0);
  pen.add(body, cap, band, clip);
  pen.position.set(.46, .0068, .04); pen.rotation.y = .55;
  scene.add(shadowy(pen));

  // ---------- busta con sigillo ----------
  const envMat = new THREE.MeshStandardMaterial({ color: 0xeee2cf, roughness: .9 });
  const envelope = new THREE.Group();
  envelope.add(new THREE.Mesh(new THREE.BoxGeometry(.24, .003, .16), envMat));
  const flapShape = new THREE.Shape(); flapShape.moveTo(-.12, -.08); flapShape.lineTo(.12, -.08); flapShape.lineTo(0, .015); flapShape.closePath();
  const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), new THREE.MeshStandardMaterial({ color: 0xe6d8c2, roughness: .9 }));
  flap.rotation.x = -Math.PI / 2; flap.position.set(0, .0017, 0); envelope.add(flap);
  const seal = new THREE.Mesh(new THREE.CylinderGeometry(.017, .018, .005, 28), new THREE.MeshStandardMaterial({ color: 0x9a3a3a, roughness: .35 }));
  seal.position.set(0, .004, -.012); envelope.add(seal);
  envelope.position.set(-.5, .0015, -.08); envelope.rotation.y = .32;
  scene.add(shadowy(envelope));

  // ---------- pila di libri ----------
  const stack = new THREE.Group();
  [[.26, .04, .34, 0x6b2f33, 0], [.24, .034, .31, 0x43513a, .12], [.21, .03, .28, 0xcdbb98, -.08]].reduce((y, [w, h, d, c, r]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [edges, new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), new THREE.MeshStandardMaterial({ color: c, roughness: .8 }), edges, edges]);
    b.position.y = y + h / 2; b.rotation.y = r; stack.add(b); return y + h;
  }, 0);
  stack.position.set(-.18, 0, -.68); stack.rotation.y = -.2;
  scene.add(shadowy(stack));

  // ---------- polvere nella luce della lampada ----------
  const N = 220, dust = new Float32Array(N * 3), seeds = [];
  for (let i = 0; i < N; i++) {
    const t = Math.random();
    const p = head.clone().lerp(aim, t).add(new THREE.Vector3((Math.random() - .5) * .5 * t, 0, (Math.random() - .5) * .5 * t));
    dust.set([p.x, p.y, p.z], i * 3); seeds.push(Math.random() * 100);
  }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dust, 3));
  const dustPts = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xffe2b8, size: .0035, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dustPts);

  // ---------- camera ----------
  const look0 = new THREE.Vector3(.02, .12, -.12);
  const aspect = () => innerWidth / innerHeight;
  const startPos = () => {
    const dist = aspect() < 1 ? 3.1 : 2.05, az = .38, el = .6;
    return look0.clone().add(new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(dist));
  };
  // inquadratura finale: dall'alto, la copertina occupa sullo schermo la stessa area del libro sfogliabile
  const endPos = () => {
    const coverPx = spread ? pageH : innerHeight;
    const visibleH = BD * innerHeight / coverPx;
    const d = visibleH / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    const offsetPx = spread ? (76 - 84) / 2 : 0;   // il libro sfogliabile è centrato tra i margini sopra e sotto
    return new THREE.Vector3(0, T + d, -offsetPx * visibleH / innerHeight);
  };
  let p0 = startPos();
  camera.position.copy(p0); camera.lookAt(look0);

  addEventListener('resize', () => {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = aspect(); camera.updateProjectionMatrix();
  });

  // ---------- animazione ----------
  let zoom = null, running = true;
  const clock = new THREE.Clock();
  const ease = k => k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  const up0 = new THREE.Vector3(0, 1, 0), up1 = new THREE.Vector3(0, 0, -1);
  function loop() {
    if (!running) return;
    const t = clock.getElapsedTime();
    // fiamma e luce della candela che tremolano
    const fl = .85 + Math.sin(t * 13) * .06 + Math.sin(t * 7.3) * .05 + Math.random() * .04;
    candleLight.intensity = .6 * fl; flame.scale.set(1, 2.4 * fl, 1); flameGlow.material.opacity = fl;
    // polvere che fluttua
    const pos = dustGeo.attributes.position;
    for (let i = 0; i < N; i++) {
      pos.array[i * 3] += Math.sin(t * .3 + seeds[i]) * .00006;
      pos.array[i * 3 + 1] += Math.cos(t * .25 + seeds[i]) * .00005;
    }
    pos.needsUpdate = true;
    if (zoom) {
      const k = Math.min(1, (performance.now() - zoom.t0) / zoom.ms), e = ease(k);
      camera.position.lerpVectors(zoom.from, zoom.to, e);
      camera.up.lerpVectors(up0, up1, e).normalize();
      camera.lookAt(new THREE.Vector3().lerpVectors(look0, new THREE.Vector3(0, T, zoom.to.z), e));
      if (k === 1) { zoom.done(); zoom = null; setTimeout(() => { running = false; }, 2000); }
    } else if (!zoom && camera.up.y > .99) {
      // leggero respiro della camera, come ripresa a mano
      camera.position.copy(p0).add(new THREE.Vector3(Math.sin(t * .4) * .012, Math.sin(t * .3) * .008, 0));
      camera.lookAt(look0);
    }
    renderer.render(scene, camera);
    requestAnimationFrame(loop);
  }
  loop();
  document.body.classList.add('ready');

  window.scene3d = {
    zoom(fast) {
      return new Promise(done => { zoom = { from: camera.position.clone(), to: endPos(), t0: performance.now(), ms: fast ? 1 : 3600, done }; });
    },
  };
}
