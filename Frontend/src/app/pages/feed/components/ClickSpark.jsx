import { useCallback, useEffect, useRef } from "react";

export default function ClickSpark({
  sparkColor = "#fff",
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = "ease-out",
  extraScale = 1,
  children,
}) {
  const canvasRef = useRef(null);
  const sparksRef = useRef([]);
  const animationFrameRef = useRef(null);
  const canvasPadding = sparkRadius + sparkSize;

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return undefined;

    const resize = () => {
      const { width, height } = parent.getBoundingClientRect();
      canvas.width = Math.ceil(width + canvasPadding * 2);
      canvas.height = Math.ceil(height + canvasPadding * 2);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(parent);
    resize();

    return () => observer.disconnect();
  }, [canvasPadding]);

  const ease = useCallback(
    (progress) => {
      if (easing === "linear") return progress;
      if (easing === "ease-in") return progress * progress;
      if (easing === "ease-in-out") {
        return progress < 0.5
          ? 2 * progress * progress
          : -1 + (4 - 2 * progress) * progress;
      }

      return progress * (2 - progress);
    },
    [easing],
  );

  function drawSparks(timestamp) {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    context.clearRect(0, 0, canvas.width, canvas.height);
    sparksRef.current = sparksRef.current.filter((spark) => {
      const elapsed = timestamp - spark.startTime;
      if (elapsed >= duration) return false;

      const progress = ease(elapsed / duration);
      const distance = progress * sparkRadius * extraScale;
      const length = sparkSize * (1 - progress);
      const cosine = Math.cos(spark.angle);
      const sine = Math.sin(spark.angle);

      context.strokeStyle = sparkColor;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(spark.x + distance * cosine, spark.y + distance * sine);
      context.lineTo(
        spark.x + (distance + length) * cosine,
        spark.y + (distance + length) * sine,
      );
      context.stroke();

      return true;
    });

    animationFrameRef.current =
      sparksRef.current.length > 0 ? requestAnimationFrame(drawSparks) : null;
  }

  useEffect(
    () => () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    },
    [],
  );

  function createSparks(event) {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const startTime = performance.now();

    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, index) => ({
        x,
        y,
        angle: (2 * Math.PI * index) / sparkCount,
        startTime,
      })),
    );

    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(drawSparks);
    }
  }

  return (
    <div
      style={{ position: "relative", width: "100%", height: "100%" }}
      onClick={createSparks}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: `-${canvasPadding}px`,
          left: `-${canvasPadding}px`,
          zIndex: 2,
          width: `calc(100% + ${canvasPadding * 2}px)`,
          height: `calc(100% + ${canvasPadding * 2}px)`,
          pointerEvents: "none",
        }}
      />
      {children}
    </div>
  );
}
