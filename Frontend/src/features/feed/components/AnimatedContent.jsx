import { motion } from "motion/react";

export default function AnimatedContent({
  children,
  distance = 100,
  direction = "vertical",
  reverse = false,
  duration = 0.8,
  ease = "easeOut",
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  delay = 0,
  className = "",
  ...props
}) {
  const axis = direction === "horizontal" ? "x" : "y";
  const offset = reverse ? -distance : distance;

  return (
    <motion.div
      className={className}
      initial={{
        [axis]: offset,
        scale,
        opacity: animateOpacity ? initialOpacity : 1,
      }}
      animate={{ [axis]: 0, scale: 1, opacity: 1 }}
      transition={{ duration, ease, delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
