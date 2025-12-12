import * as THREE from "three";
import { mulberry32 } from "./utils.js";
import { PHYSICS_CONFIG } from "./BingoPhysics.js";

const { CAGE_RADIUS, CAGE_Y, BALL_RADIUS } = PHYSICS_CONFIG;

export function initBingoScene({ mount, width, height, seed }) {
  const finalSeed = seed !== null ? seed : Math.floor(Math.random() * 100000);
  const prng = mulberry32(finalSeed);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 2000);
  camera.position.set(0, CAGE_Y, 580);
  camera.lookAt(0, CAGE_Y, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mount.appendChild(renderer.domElement);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(100, 300, 200);
  scene.add(dir);
  scene.add(new THREE.AmbientLight(0xffffff, 0.7));

  const cageGroup = new THREE.Group();
  cageGroup.position.y = CAGE_Y;
  scene.add(cageGroup);

  const wireGroup = new THREE.Group(); 
  cageGroup.add(wireGroup);

  const R = CAGE_RADIUS;
  const metalMat = new THREE.MeshStandardMaterial({ 
    color: 0xcccccc, 
    metalness: 0.8, 
    roughness: 0.2,
    side: THREE.DoubleSide
  });

  // Cage Visuals
  const numHoops = 24; 
  const hoopGeo = new THREE.TorusGeometry(R, 1.5, 5, 32); 
  for (let i = 0; i < numHoops; i++) {
    const hoop = new THREE.Mesh(hoopGeo, metalMat);
    hoop.rotation.x = (Math.PI * i) / numHoops;
    wireGroup.add(hoop);
  }
  const numParallels = 12; 
  for (let i = 1; i < numParallels; i++) {
    const theta = -Math.PI / 2 + (Math.PI * i) / numParallels;
    const rRing = R * Math.cos(theta);
    const xRing = R * Math.sin(theta);
    if (rRing > 10) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rRing, 1.5, 5, 48), metalMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = xRing;
      wireGroup.add(ring);
    }
  }
  // Axle & Hatch
  const hubGeo = new THREE.CylinderGeometry(10, 10, 12, 16);
  const hubLeft = new THREE.Mesh(hubGeo, metalMat);
  hubLeft.rotation.z = Math.PI / 2;
  hubLeft.position.x = -R - 5;
  wireGroup.add(hubLeft);
  const hubRight = new THREE.Mesh(hubGeo, metalMat);
  hubRight.rotation.z = Math.PI / 2;
  hubRight.position.x = R + 5;
  wireGroup.add(hubRight);

  const hatchMesh = new THREE.Mesh(new THREE.BoxGeometry(90, 5, 50), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }));
  hatchMesh.position.set(0, -R - 8, 0);
  cageGroup.add(hatchMesh);

  // Balls
  const balls = [];
  const ballGeom = new THREE.IcosahedronGeometry(BALL_RADIUS, 1);
  const ballBaseMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.4 });  
  const groupColors = [0xffadad, 0xadd6ff, 0xfff5ad, 0xb8ffad, 0xe0adff]; 
  const BALL_COUNT = 75;
  
  for (let i = 0; i < BALL_COUNT; i++) {
    const number = i + 1;
    const group = Math.floor((number - 1) / 15);
    const mat = ballBaseMat.clone();
    mat.color.setHex(groupColors[group % 5]); 
    const m = new THREE.Mesh(ballGeom, mat);

    // Random position inside
    const radiusLimit = R - (BALL_RADIUS + 10);
    const theta = prng() * Math.PI * 2;
    const phi = Math.acos(2 * prng() - 1);
    const r = Math.pow(prng(), 1/3) * radiusLimit; 
  
    const startPos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta),
      r * Math.cos(phi)
    );
    m.position.copy(startPos).add(new THREE.Vector3(0, CAGE_Y, 0));

    // Label
    const label = number.toString();
    const canvas = document.createElement("canvas");
    canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(32, 32, 30, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#" + new THREE.Color(groupColors[group%5]).getHexString();
    ctx.lineWidth = 4; ctx.stroke();
    ctx.fillStyle = "#111"; ctx.font = "bold 34px Arial";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(label, 32, 34);
    
    const tex = new THREE.CanvasTexture(canvas);
    const labelPlane = new THREE.Mesh(new THREE.PlaneGeometry(BALL_RADIUS * 1.6, BALL_RADIUS * 1.6), new THREE.MeshBasicMaterial({ map: tex, transparent: true }));
    labelPlane.position.set(0, 0, BALL_RADIUS + 0.1);
    m.add(labelPlane);

    scene.add(m);

    const initialPos = m.position.clone();
    const initialVel = new THREE.Vector3((prng() - 0.5)*5, (prng() - 0.5)*5, (prng() - 0.5)*5);

    balls.push({
      mesh: m,
      pos: initialPos.clone(),
      vel: initialVel.clone(),
      initPos: initialPos.clone(),
      initVel: initialVel.clone(),
      mass: 1.0,
      radius: BALL_RADIUS,
      labelPlane,
      number,
      drawn: false,
      sleeping: false,
    });
  }

  const cleanUp = () => {
     if(mount) mount.removeChild(renderer.domElement);
     renderer.dispose();
  };

  return {
    scene, camera, renderer, cageGroup, wireGroup, balls,
    cleanUp,
    rand: prng,
    baseSeed: finalSeed,
    R,
  };
}

export function updateMeshes(state) {
  if(!state) return;
  for (let b of state.balls) {
     b.mesh.position.copy(b.pos);
     b.mesh.visible = !b.drawn;
     if (!b.drawn) b.labelPlane.lookAt(state.camera.position);
  }
}