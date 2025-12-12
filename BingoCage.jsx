import { jsxDEV } from "react/jsx-dev-runtime";
import React, { useRef, useEffect } from "react";
import * as THREE from "three";
import { mulberry32 } from "./utils.js";
import { runPhysicsFrame, TIME_STEP } from "./BingoPhysics.js";
import { initBingoScene, updateMeshes } from "./BingoScene.js";
function BingoCage({
  width = 560,
  height = 420,
  tappable = true,
  autoSpin = false,
  onSpinStart,
  onBallDraw,
  onFrameUpdate,
  replayData,
  controlledSpin = null,
  spinSchedule = [],
  drawnNumbers = null,
  seed = null,
  currentFrame = void 0
}) {
  const mountRef = useRef(null);
  const rafRef = useRef(null);
  const lastSimulatedFrame = useRef(-1);
  const stateRef = useRef({
    scene: null,
    camera: null,
    renderer: null,
    cageGroup: null,
    wireGroup: null,
    balls: [],
    spinning: false,
    waitingForDraw: false,
    // flag to trigger draw after spin
    rotationSpeed: 0,
    R: 160,
    rand: Math.random,
    cageY: 100,
    frameIndex: 0,
    baseSeed: 0
  });
  const propsRef = useRef({ controlledSpin, drawnNumbers, autoSpin, spinSchedule, onSpinStart, onBallDraw, onFrameUpdate, replayData });
  useEffect(() => {
    propsRef.current = { controlledSpin, drawnNumbers, autoSpin, spinSchedule, onSpinStart, onBallDraw, onFrameUpdate, replayData };
  }, [controlledSpin, drawnNumbers, autoSpin, spinSchedule, onSpinStart, onBallDraw, onFrameUpdate, replayData]);
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const sceneState = initBingoScene({
      mount,
      width,
      height,
      seed
    });
    stateRef.current = {
      ...stateRef.current,
      ...sceneState,
      spinning: propsRef.current.autoSpin,
      waitingForDraw: false,
      rotationSpeed: 0,
      acc: 0,
      frameIndex: 0
    };
    return () => {
      cancelAnimationFrame(rafRef.current);
      sceneState.cleanUp();
    };
  }, [width, height, seed]);
  useEffect(() => {
    if (!stateRef.current || !stateRef.current.scene) return;
    if (currentFrame !== void 0) {
      const targetFrame = Math.max(0, Math.floor(currentFrame));
      const s = stateRef.current;
      const pProps = propsRef.current;
      if (pProps.replayData) {
        const rd = pProps.replayData;
        const frameData = rd[targetFrame];
        const data = frameData || rd[targetFrame - 1] || rd[targetFrame + 1];
        if (data) {
          s.wireGroup.rotation.x = data[0];
          s.cageGroup.position.y = s.cageY;
          let idx = 1;
          for (let i = 0; i < s.balls.length; i++) {
            const b = s.balls[i];
            if (idx + 2 < data.length) {
              b.pos.set(data[idx], data[idx + 1], data[idx + 2]);
              idx += 3;
            }
            b.drawn = b.pos.y < -500;
          }
          updateMeshes(s);
          s.renderer.render(s.scene, s.camera);
          return;
        }
      }
      if (targetFrame < lastSimulatedFrame.current || targetFrame > lastSimulatedFrame.current + 300) {
        s.spinning = false;
        s.rotationSpeed = 0;
        s.wireGroup.rotation.set(0, 0, 0);
        s.frameIndex = 0;
        s.rand = mulberry32(s.baseSeed);
        for (const b of s.balls) {
          b.drawn = false;
          b.sleeping = false;
          b.pos.copy(b.initPos);
          b.vel.copy(b.initVel);
        }
        lastSimulatedFrame.current = 0;
      }
      let steps = targetFrame - lastSimulatedFrame.current;
      if (steps > 500) steps = 500;
      const schedule = pProps.spinSchedule || [];
      for (let i = 0; i < steps; i++) {
        const simFrame = lastSimulatedFrame.current + i;
        const activeWindow = schedule.find((w) => simFrame >= w.startFrame && simFrame < w.endFrame);
        const isSpinning = !!activeWindow;
        const triggerKick = activeWindow && simFrame === activeWindow.startFrame;
        runPhysicsFrame(s, pProps, isSpinning, triggerKick);
      }
      lastSimulatedFrame.current = targetFrame;
      updateMeshes(s);
      s.renderer.render(s.scene, s.camera);
    } else {
      let lastTime = performance.now();
      const animate = () => {
        const s = stateRef.current;
        if (!s || !s.scene) return;
        const now = performance.now();
        let dt = Math.min(0.1, (now - lastTime) / 1e3);
        lastTime = now;
        s.acc += dt;
        while (s.acc >= TIME_STEP) {
          const isSpinning = s.spinning;
          runPhysicsFrame(s, propsRef.current, isSpinning, false);
          s.acc -= TIME_STEP;
        }
        if (propsRef.current.onFrameUpdate) {
          const data = [parseFloat(s.wireGroup.rotation.x.toFixed(3))];
          for (let i = 0; i < s.balls.length; i++) {
            const b = s.balls[i];
            data.push(
              parseFloat(b.pos.x.toFixed(2)),
              parseFloat(b.pos.y.toFixed(2)),
              parseFloat(b.pos.z.toFixed(2))
            );
          }
          propsRef.current.onFrameUpdate(s.frameIndex, data);
        }
        updateMeshes(s);
        s.renderer.render(s.scene, s.camera);
        rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [currentFrame]);
  const handleTap = () => {
    const s = stateRef.current;
    const p = propsRef.current;
    if (!s || p.controlledSpin !== null) return;
    if (s.spinning) return;
    const currentSimFrame = s.frameIndex;
    if (p.onSpinStart) {
      p.onSpinStart(Math.floor(currentSimFrame));
    }
    s.spinning = true;
    s.waitingForDraw = true;
    s.balls.forEach((b) => {
      if (!b.drawn) {
        b.vel.add(new THREE.Vector3((s.rand() - 0.5) * 250, s.rand() * 200 + 50, (s.rand() - 0.5) * 250));
        b.sleeping = false;
      }
    });
    setTimeout(() => {
      if (stateRef.current) stateRef.current.spinning = false;
    }, 2e3);
  };
  return /* @__PURE__ */ jsxDEV(
    "div",
    {
      ref: mountRef,
      onClick: tappable ? handleTap : void 0,
      style: { width, height, cursor: tappable ? "pointer" : "default" }
    },
    void 0,
    false,
    {
      fileName: "<stdin>",
      lineNumber: 235,
      columnNumber: 5
    },
    this
  );
}
export {
  BingoCage as default
};
