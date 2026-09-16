import "./Skeleton.css";

/**
 * Reusable CSS Skeleton Loading Component
 *
 * @param {Object} props
 * @param {'text'|'circular'|'rectangular'|'avatar'|'button'|'card'} [props.variant='rectangular'] - Visual type
 * @param {string|number} [props.width] - Inline width style (e.g. '100%', 120, '40px')
 * @param {string|number} [props.height] - Inline height style (e.g. 20, '100%')
 * @param {string|number} [props.radius] - Inline border-radius override
 * @param {number} [props.count=1] - Number of skeleton items to render
 * @param {string} [props.className] - Additional custom CSS classes
 * @param {Object} [props.style] - Additional inline styles
 */
export default function Skeleton({
  variant = "rectangular",
  width,
  height,
  radius,
  count = 1,
  className = "",
  style = {},
  ...rest
}) {
  const customStyle = {
    ...(width !== undefined && {
      width: typeof width === "number" ? `${width}px` : width,
    }),
    ...(height !== undefined && {
      height: typeof height === "number" ? `${height}px` : height,
    }),
    ...(radius !== undefined && {
      borderRadius: typeof radius === "number" ? `${radius}px` : radius,
    }),
    ...style,
  };

  const classes = `skeleton skeleton--${variant} ${className}`.trim();

  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, index) => (
          <span key={index} className={classes} style={customStyle} {...rest} />
        ))}
      </>
    );
  }

  return <span className={classes} style={customStyle} {...rest} />;
}
