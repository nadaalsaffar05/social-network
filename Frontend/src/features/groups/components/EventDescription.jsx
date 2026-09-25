import { useLayoutEffect, useRef, useState } from "react";

export default function EventDescription({ eventID, description }) {
  const textRef = useRef(null);
  const [expandedDescription, setExpandedDescription] = useState(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const isExpanded = expandedDescription === description;

  useLayoutEffect(() => {
    if (isExpanded || !textRef.current) {
      return undefined;
    }

    const text = textRef.current;
    const updateTruncation = () => {
      setIsTruncated(text.scrollWidth > text.clientWidth + 1);
    };

    updateTruncation();

    const resizeObserver = new ResizeObserver(updateTruncation);
    resizeObserver.observe(text);

    return () => resizeObserver.disconnect();
  }, [description, isExpanded]);

  const descriptionID = `group-event-description-${eventID}`;

  return (
    <div
      className={`group-event-description${
        isExpanded ? " group-event-description--expanded" : ""
      }`}
    >
      <p
        ref={textRef}
        id={descriptionID}
        className="group-event-description__text"
      >
        {description}
      </p>

      {isTruncated && (
        <button
          type="button"
          className="group-event-description__toggle"
          aria-expanded={isExpanded}
          aria-controls={descriptionID}
          onClick={() =>
            setExpandedDescription((current) =>
              current === description ? null : description,
            )
          }
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
