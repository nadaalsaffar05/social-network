import { useEffect, useRef, useState } from "react";
import {
  CircleNotch,
  MagnifyingGlass,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { globalSearch } from "../../../api/search.js";

import "./GroupSearchBar.css";

export default function GroupSearchBar({ onSelect }) {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const selectedItemRef = useRef(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setGroups([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const data = await globalSearch({
          query: trimmedQuery,
          types: ["groups"],
        });
        setGroups(data.groups ?? []);
      } catch (error) {
        console.error("Group search failed:", error);
        setGroups([]);
      } finally {
        setIsLoading(false);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [query]);
  useEffect(() => {
    if (!selectedItemRef.current) {
      return;
    }
    selectedItemRef.current.scrollIntoView({
      block: "nearest",
      behavior: "smooth",
    });
  }, [selectedIndex]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  function handleSelect(group) {
    setIsOpen(false);
    setQuery("");
    setGroups([]);
    setSelectedIndex(-1);
    onSelect(group);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (groups.length > 0) {
        setSelectedIndex((current) =>
          current < groups.length - 1 ? current + 1 : 0,
        );
      }
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (groups.length > 0) {
        setSelectedIndex((current) =>
          current <= 0 ? groups.length - 1 : current - 1,
        );
      }
      return;
    }
    if (event.key === "Enter") {
      if (isOpen && selectedIndex >= 0 && selectedIndex < groups.length) {
        event.preventDefault();
        handleSelect(groups[selectedIndex]);
      }
      return;
    }
    if (event.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const hasSearchInput = query.trim().length >= 2;

  return (
    <div className="group-search" ref={containerRef}>
      <div
        className={`group-search__bar ${
          isOpen ? "group-search__bar--focused" : ""
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <MagnifyingGlass
          className="group-search__icon"
          size={18}
          weight="bold"
          aria-hidden="true"
        />

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search groups..."
          aria-label="Search groups"
          autoComplete="off"
          spellCheck="false"
        />

        {isLoading && (
          <CircleNotch
            className="group-search__spinner animate-spin"
            size={18}
            aria-hidden="true"
          />
        )}

        {query && !isLoading && (
          <button
            type="button"
            className="group-search__clear"
            onClick={(event) => {
              event.stopPropagation();
              setQuery("");
              setGroups([]);
              inputRef.current?.focus();
            }}
            aria-label="Clear group search"
          >
            <X size={13} weight="bold" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="group-search__dropdown">
          {!hasSearchInput ? (
            <p className="group-search__message">
              Type at least 2 characters to search groups
            </p>
          ) : isLoading ? (
            <p className="group-search__message">Searching groups...</p>
          ) : groups.length === 0 ? (
            <p className="group-search__message">No matching groups</p>
          ) : (
            <div className="group-search__results">
              {groups.map((group, index) => (
                <button
                  key={group.id}
                  ref={index === selectedIndex ? selectedItemRef : null}
                  type="button"
                  className={`group-search__result ${
                    index === selectedIndex
                      ? "group-search__result--selected"
                      : ""
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => handleSelect(group)}
                >
                  <span className="group-search__result-icon">
                    <UsersThree size={19} weight="bold" />
                  </span>

                  <span className="group-search__result-details">
                    <strong>{group.title}</strong>

                    <small>
                      <span>
                        {group.member_count}{" "}
                        {group.member_count === 1 ? "member" : "members"}
                      </span>

                      {group.description && (
                        <>
                          <span className="group-search__separator">·</span>
                          <span className="group-search__description">
                            {group.description}
                          </span>
                        </>
                      )}
                    </small>
                  </span>

                  <span className="group-search__result-actions">
                    {group.is_member && (
                      <span className="group-search__member-badge">Member</span>
                    )}

                    <span className="group-search__open" aria-hidden="true">
                      ↗
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
