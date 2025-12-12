import * as THREE from "three";

// Re-usable vector pools
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _v4 = new THREE.Vector3(); 
const _n = new THREE.Vector3();

export const PHYSICS_CONFIG = {
  FPS: 30,
  SUB_STEPS: 15,
  CAGE_RADIUS: 160,
  BALL_RADIUS: 19,
  CAGE_Y: 100,
};

export const TIME_STEP = 1 / PHYSICS_CONFIG.FPS;
export const STEP_DT = TIME_STEP / PHYSICS_CONFIG.SUB_STEPS;

export function runPhysicsFrame(state, props, isSpinningInput, triggerKick) {
  if (!state) return;

  // Apply kick
  if (triggerKick) {
    state.balls.forEach(b => {
      if (!b.drawn) {
         b.vel.add(new THREE.Vector3((state.rand()-0.5)*300, state.rand()*250 + 50, (state.rand()-0.5)*300));
         b.sleeping = false;
      }
    });
  }

  // Spin ramp
  if (isSpinningInput) {
     state.rotationSpeed = Math.min(5.5, state.rotationSpeed + TIME_STEP * 4.0);
  } else {
     state.rotationSpeed = Math.max(0, state.rotationSpeed - TIME_STEP * 2.0);
  }

  // Check for Ball Draw Trigger (Interactive Mode Only)
  if (state.waitingForDraw && !state.spinning && state.rotationSpeed < 0.2) {
    state.waitingForDraw = false;
    const available = state.balls.filter(b => !b.drawn);
    if (available.length > 0) {
      // Deterministic pick using physics RNG
      const pick = available[Math.floor(state.rand() * available.length)];
      if (props.onBallDraw) {
        props.onBallDraw(pick.number, state.frameIndex);
      }
    }
  }

  // Sub-stepping
  for (let step = 0; step < PHYSICS_CONFIG.SUB_STEPS; step++) {
     performSubStep(STEP_DT, state, props);
  }

  state.frameIndex++;
}

function performSubStep(dt, s, pProps) {
  const CAGE_RADIUS = s.R;
  const BALL_RADIUS = PHYSICS_CONFIG.BALL_RADIUS;
  const RESTITUTION = 0.5; 
  const FRICTION = 0.96; 
  const GRAVITY = new THREE.Vector3(0, -980, 0);

  // Rotate cage
  s.wireGroup.rotation.x += s.rotationSpeed * dt;
  const cagePos = s.cageGroup.position;
  const R_inner = CAGE_RADIUS - (BALL_RADIUS + 4); 
  const R_sq = R_inner * R_inner;
  
  // Angular vel for tangential forces
  const angularVel = new THREE.Vector3(s.rotationSpeed, 0, 0);

  for (const b of s.balls) {
    // Check drawn status (External control overrides physics)
    if (pProps.drawnNumbers && pProps.drawnNumbers.includes(b.number)) {
      b.drawn = true;
      b.sleeping = true;
      b.pos.set(0, -99999, 0);
      b.vel.set(0, 0, 0);
      continue;
    }

    if (b.sleeping && (s.rotationSpeed > 0.5 || s.frameIndex <= 100)) b.sleeping = false;
    if (b.sleeping) continue;

    // Integration
    b.vel.addScaledVector(GRAVITY, dt);
    
    // Cage spin influence
    if (s.rotationSpeed > 0) {
      _v1.subVectors(b.pos, cagePos);
      const tangential = _v2.copy(angularVel).cross(_v1);
      b.vel.addScaledVector(tangential, dt * 1.0);
    }

    b.vel.multiplyScalar(0.999); // Drag
    b.pos.addScaledVector(b.vel, dt);

    // Boundary Collision
    _v1.subVectors(b.pos, cagePos);
    const distSq = _v1.lengthSq();
    
    if (distSq > R_sq) {
      const dist = Math.sqrt(distSq);
      _n.copy(_v1).multiplyScalar(1 / dist);

      // 1. Hard Position Clamp to prevent escape
      b.pos.copy(cagePos).addScaledVector(_n, R_inner);

      // 2. Velocity Reflection
      const wallVel = _v2.copy(angularVel).cross(_v1); // v of wall at contact
      const relVel = _v3.subVectors(b.vel, wallVel);
      const vDotN = relVel.dot(_n);

      if (vDotN > 0) {
          relVel.addScaledVector(_n, -(1 + 0.4) * vDotN); // Restitution with wall
          
          // Tangential friction
          _v4.copy(_n).multiplyScalar(relVel.dot(_n));
          const tangentV = relVel.clone().sub(_v4);
          tangentV.multiplyScalar(FRICTION); 
          relVel.copy(tangentV).add(_v4);
          
          b.vel.addVectors(relVel, wallVel);
          
          // Random perturbation to prevent stacking
          if (s.rotationSpeed > 1.0) {
            b.vel.add(new THREE.Vector3((s.rand()-0.5)*50, (s.rand()-0.5)*50, (s.rand()-0.5)*50));
          }
      }
    }
  }

  // Ball-Ball Collisions
  const nBalls = s.balls.length;
  // Iterate 8 times for stability
  for (let iter = 0; iter < 8; iter++) {
      for (let i = 0; i < nBalls; i++) {
          const bi = s.balls[i];
          if (bi.drawn || bi.sleeping) continue;

          for (let j = i + 1; j < nBalls; j++) {
              const bj = s.balls[j];
              if (bj.drawn || bj.sleeping) continue;

              _v1.subVectors(bi.pos, bj.pos);
              const d2 = _v1.lengthSq();
              const rSum = BALL_RADIUS * 2;
              
              if (d2 < rSum * rSum && d2 > 0.0001) {
                  const d = Math.sqrt(d2);
                  _n.copy(_v1).multiplyScalar(1 / d);

                  const overlap = rSum - d;
                  const shift = _n.clone().multiplyScalar(overlap * 0.5);
                  
                  bi.pos.add(shift);
                  bj.pos.sub(shift);

                  const relVel = _v2.subVectors(bi.vel, bj.vel);
                  const vn = relVel.dot(_n);
                  if (vn < 0) {
                      const jImpulse = -(1 + RESTITUTION) * vn * 0.5;
                      _v3.copy(_n).multiplyScalar(jImpulse);
                      bi.vel.add(_v3);
                      bj.vel.sub(_v3);
                  }
              }
          }
      }
  }

  // Secondary Boundary Clamp (post-collision cleanup)
  for (const b of s.balls) {
     if(b.drawn || b.sleeping) continue;
     _v1.subVectors(b.pos, cagePos);
     const dSq = _v1.lengthSq();
     if(dSq > R_sq) {
        const d = Math.sqrt(dSq);
        _v1.multiplyScalar((R_inner - 0.5) / d);
        b.pos.copy(cagePos).add(_v1);
     }
  }
  
  // Aggressive Sleep & Damping at Rest
  if (s.rotationSpeed < 0.05 && s.frameIndex > 100) {
    for (const b of s.balls) {
      if (b.drawn) continue;
      const speedSq = b.vel.lengthSq();
      if (speedSq < 50) {
         b.vel.multiplyScalar(0.5); // High friction at low speed
      }
      if (speedSq < 5) {
         b.vel.set(0,0,0);
         b.sleeping = true;
      }
    }
  }
}