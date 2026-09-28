import { useEffect, useRef } from "react";
import { Mesh, Program, Renderer, Triangle } from "ogl";

import "./GradientWaves.css";

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16) / 255,
        parseInt(result[2], 16) / 255,
        parseInt(result[3], 16) / 255,
      ]
    : [1, 1, 1];
};

const vertex = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime, uSpeed, uAmplitude, uWaveScale, uWaveRatio, uSwell, uTurbulence, uTilt, uZoom, uHeight, uFogDepth, uSteps, uBrightness, uOpacity;
uniform vec3 uHorizonColor, uWaveColor, uCrestColor;
out vec4 fragColor;
float plasma(vec3 r, vec2 freq, vec4 tc) {
  float mx = r.x + tc.x + uSwell * sin((r.y + r.x + tc.x) / 20.0 + tc.y);
  float my = r.y - tc.z + uTurbulence * cos(r.x / 23.0 + tc.w);
  return r.z - (sin(mx * freq.x) * uAmplitude + sin(my * freq.y) * uAmplitude + uHeight);
}
float raymarch(vec3 pos, vec3 dir, vec2 freq, vec4 tc) {
  float dist = 0.0;
  for (int i = 0; i < 96; i++) {
    if (float(i) >= uSteps) break;
    float d = plasma(pos + dist * dir, freq, tc);
    if (abs(d) < 0.1) break;
    dist += 0.9 * d;
    if (abs(dist) > 20000.0) return 20000.0;
  }
  return dist;
}
void main() {
  float T = iTime * uSpeed;
  vec2 freq = vec2(uWaveScale / 7.0, (uWaveScale * uWaveRatio) / 3.0);
  vec4 tc = vec4(T / .130, T / .810, T / .200, T / .710);
  vec2 uv = gl_FragCoord.xy / iResolution.xy - .5;
  uv.x *= iResolution.x / iResolution.y; uv.y *= -1.0;
  float vfov = (3.14159 / 2.3) / max(uZoom, .05);
  vec3 dir = vec3(0., 0., -1.);
  float len = length(uv), c = cos(vfov * len), s = sin(vfov * len);
  dir = mat3(1.,0.,0., 0.,c,-s, 0.,s,c) * dir;
  vec2 unitUv = len > .00001 ? uv / len : vec2(1., 0.);
  dir = mat3(unitUv.x,-unitUv.y,0., unitUv.y,unitUv.x,0., 0.,0.,1.) * dir;
  c = cos(uTilt); s = sin(uTilt);
  dir = mat3(c,0.,s, 0.,1.,0., -s,0.,c) * dir;
  float dist = raymarch(vec3(0.,0.,30.), dir, freq, tc);
  vec3 pos = vec3(0.,0.,30.) + dist * dir;
  float fog = clamp(uFogDepth / max(dist, .001), 0., 1.);
  vec3 body = mix(uWaveColor, uCrestColor, clamp(pos.z * .08 + .5, 0., 1.));
  vec3 color = clamp(mix(uHorizonColor, body, fog) * uBrightness, 0., 1.);
  float alpha = fog * uOpacity;
  fragColor = vec4(color * alpha, alpha);
}`;

export default function GradientWaves({
  horizonColor = "#526b8c",
  waveColor = "#9aafc6",
  crestColor = "#e4edf5",
  speed = 0.3,
  amplitude = 2.5,
  waveScale = 0.6,
  waveRatio = 0.9,
  swell = 35,
  turbulence = 20,
  tilt = 1.11,
  zoom = 1,
  height = 5.5,
  fogDepth = 15,
  detail = "medium",
  brightness = 0.9,
  opacity = 0.18,
  className = "",
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const steps = detail === "low" ? 28 : detail === "high" ? 72 : 48;
    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 1.5),
    });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iResolution: { value: new Float32Array([1, 1]) },
        iTime: { value: 0 },
        uSpeed: { value: speed },
        uAmplitude: { value: amplitude },
        uWaveScale: { value: waveScale },
        uWaveRatio: { value: waveRatio },
        uSwell: { value: swell },
        uTurbulence: { value: turbulence },
        uTilt: { value: tilt },
        uZoom: { value: zoom },
        uHeight: { value: height },
        uFogDepth: { value: fogDepth },
        uSteps: { value: steps },
        uBrightness: { value: brightness },
        uOpacity: { value: opacity },
        uHorizonColor: { value: new Float32Array(hexToRgb(horizonColor)) },
        uWaveColor: { value: new Float32Array(hexToRgb(waveColor)) },
        uCrestColor: { value: new Float32Array(hexToRgb(crestColor)) },
      },
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });
    const canvas = gl.canvas;
    canvas.className = "gradient-waves__canvas";
    container.appendChild(canvas);
    const startedAt = performance.now();
    let frame = 0;
    let isIntersecting = true;
    let lastFrameTime = 0;
    const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const canAnimate = () =>
      !reduceMotionQuery.matches &&
      isIntersecting &&
      document.visibilityState === "visible";

    const renderStatic = () => {
      program.uniforms.iTime.value = 0;
      renderer.render({ scene: mesh });
    };

    const stopAnimation = () => {
      if (frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    };

    const render = (time) => {
      if (!canAnimate()) {
        frame = 0;
        return;
      }

      // The waves remain smooth while halving the amount of fragment work.
      if (time - lastFrameTime >= 1000 / 30) {
        program.uniforms.iTime.value = (time - startedAt) / 1000;
        renderer.render({ scene: mesh });
        lastFrameTime = time;
      }
      frame = requestAnimationFrame(render);
    };

    const updateAnimation = () => {
      stopAnimation();
      if (canAnimate()) {
        lastFrameTime = 0;
        frame = requestAnimationFrame(render);
      } else if (
        isIntersecting &&
        document.visibilityState === "visible"
      ) {
        renderStatic();
      }
    };

    const resize = () => {
      const { width, height: containerHeight } =
        container.getBoundingClientRect();
      renderer.setSize(
        Math.max(1, Math.floor(width)),
        Math.max(1, Math.floor(containerHeight)),
      );
      program.uniforms.iResolution.value[0] = gl.drawingBufferWidth;
      program.uniforms.iResolution.value[1] = gl.drawingBufferHeight;
      if (!frame && isIntersecting && document.visibilityState === "visible") {
        renderStatic();
      }
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    const visibilityObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        updateAnimation();
      },
      { threshold: 0 },
    );
    visibilityObserver.observe(container);
    const handleVisibilityChange = () => updateAnimation();
    const handleReducedMotionChange = () => updateAnimation();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    reduceMotionQuery.addEventListener("change", handleReducedMotionChange);
    resize();
    updateAnimation();
    return () => {
      stopAnimation();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reduceMotionQuery.removeEventListener("change", handleReducedMotionChange);
      canvas.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [
    horizonColor,
    waveColor,
    crestColor,
    speed,
    amplitude,
    waveScale,
    waveRatio,
    swell,
    turbulence,
    tilt,
    zoom,
    height,
    fogDepth,
    detail,
    brightness,
    opacity,
  ]);

  return (
    <div
      ref={containerRef}
      className={`gradient-waves-container ${className}`.trim()}
    />
  );
}
