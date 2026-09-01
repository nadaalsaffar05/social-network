export default function GlassSurface({
  children,
  width = 200,
  height = 80,
  borderRadius = 20,
  className = "",
  style = {},
}) {
  return (
    <div
      className={`glass-surface ${className}`}
      style={{
        ...style,
        width: typeof width === "number" ? `${width}px` : width,
        height: typeof height === "number" ? `${height}px` : height,
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div className="glass-surface__content">{children}</div>
    </div>
  );
}
