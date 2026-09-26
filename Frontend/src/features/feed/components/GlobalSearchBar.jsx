import { useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlass,
  X,
  Plus,
  User,
  UsersThree,
  Article,
  ArrowUpRight,
  CircleNotch,
} from "@phosphor-icons/react";
import { globalSearch } from "../../../api/search.js";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { getUserFullName } from "../../../shared/utils/user.js";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import { PROFILE_PRIVACY, POST_PRIVACY } from "../../../shared/constants/enums.js";
import "./GlobalSearchBar.css";

const ALL_FILTERS = [
  { id: "users", label: "Users", icon: User },
  { id: "groups", label: "Groups", icon: UsersThree },
  { id: "posts", label: "Posts", icon: Article },
];

const EMPTY_RESULTS = { users: [], groups: [], posts: [] };

export default function GlobalSearchBar() {
  const navigateTo = usePageNavigate();
  const [query, setQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState(
    new Set(["users", "groups", "posts"])
  );
  const [showAddFilterMenu, setShowAddFilterMenu] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(EMPTY_RESULTS);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const selectedItemRef = useRef(null);

  const flattenedItems = useMemo(() => {
    const items = [];
    if (activeFilters.has("users") && results.users) {
      results.users.forEach((user) => {
        items.push({
          type: "user",
          id: user.id,
          path: `/profile/${user.id}`,
        });
      });
    }
    if (activeFilters.has("groups") && results.groups) {
      results.groups.forEach((group) => {
        const path = group.is_member
          ? `/groups/${group.id}`
          : `/groups?selected=${group.id}`;
        items.push({
          type: "group",
          id: group.id,
          path,
        });
      });
    }
    if (activeFilters.has("posts") && results.posts) {
      results.posts.forEach((post) => {
        items.push({
          type: "post",
          id: post.id,
          path: `/posts/${post.id}`,
        });
      });
    }
    return items;
  }, [results, activeFilters]);

  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [selectedIndex]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setShowAddFilterMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const types = Array.from(activeFilters);
        const data = await globalSearch({ query: trimmed, types });
        if (cancelled) return;

        setResults({
          users: data.users || [],
          groups: data.groups || [],
          posts: data.posts || [],
        });
      } catch {
        if (!cancelled) {
          setResults(EMPTY_RESULTS);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, activeFilters]);

  function handleQueryChange(nextQuery) {
    setQuery(nextQuery);
    setSelectedIndex(-1);
    setIsOpen(true);

    if (nextQuery.trim().length < 2) {
      setResults(EMPTY_RESULTS);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
  }

  function handleKeyDown(event) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (flattenedItems.length > 0) {
        setSelectedIndex((prev) =>
          prev < flattenedItems.length - 1 ? prev + 1 : 0
        );
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      if (flattenedItems.length > 0) {
        setSelectedIndex((prev) =>
          prev <= 0 ? flattenedItems.length - 1 : prev - 1
        );
      }
    } else if (event.key === "Enter") {
      if (
        isOpen &&
        selectedIndex >= 0 &&
        selectedIndex < flattenedItems.length
      ) {
        event.preventDefault();
        handleSelectResult(flattenedItems[selectedIndex].path);
      }
    } else if (event.key === "Escape") {
      setIsOpen(false);
      setShowAddFilterMenu(false);
      inputRef.current?.blur();
    }
  }

  function handleRemoveFilter(filterId, e) {
    e.stopPropagation();
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.size > 1) {
        next.delete(filterId);
      }
      return next;
    });
    setSelectedIndex(-1);
    if (query.trim().length >= 2) {
      setIsLoading(true);
    }
  }

  function handleAddFilter(filterId) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      next.add(filterId);
      return next;
    });
    setShowAddFilterMenu(false);
    setSelectedIndex(-1);
    if (query.trim().length >= 2) {
      setIsLoading(true);
    }
  }

  function handleSelectResult(path) {
    setIsOpen(false);
    navigateTo(path);
  }

  const inactiveFilters = ALL_FILTERS.filter(
    (f) => !activeFilters.has(f.id)
  );

  const totalResultsCount =
    (activeFilters.has("users") ? results.users.length : 0) +
    (activeFilters.has("groups") ? results.groups.length : 0) +
    (activeFilters.has("posts") ? results.posts.length : 0);

  const hasSearchInput = query.trim().length >= 2;

  return (
    <div className="global-search-container" ref={containerRef}>
      <div
        className={`global-search-bar ${
          isOpen ? "global-search-bar--focused" : ""
        }`}
        onClick={() => {
          setIsOpen(true);
          inputRef.current?.focus();
        }}
      >
        <MagnifyingGlass
          className="global-search-bar__icon"
          size={19}
          weight="bold"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => handleQueryChange(event.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search users, groups, posts..."
          aria-label="Global search"
          aria-expanded={isOpen}
          aria-controls="global-search-dropdown"
          autoComplete="off"
          spellCheck="false"
        />
        {isLoading && (
          <CircleNotch
            className="global-search-bar__spinner animate-spin"
            size={18}
            aria-hidden="true"
          />
        )}
        {query && !isLoading && (
          <button
            type="button"
            className="global-search-bar__clear"
            onClick={(event) => {
              event.stopPropagation();
              handleQueryChange("");
              inputRef.current?.focus();
            }}
            aria-label="Clear search query"
          >
            <X size={15} weight="bold" />
          </button>
        )}
      </div>

      {isOpen && (
        <div
          id="global-search-dropdown"
          className="global-search-dropdown"
          role="region"
          aria-label="Search results"
        >
          {/* Header & Filter Tags */}
          <div className="global-search-header">
            <div className="global-search-header__top">
              <span className="global-search-header__title">
                I'm searching for...
              </span>
              {inactiveFilters.length > 0 && (
                <div className="global-search-add-filter-wrapper">
                  <button
                    type="button"
                    className="global-search-add-filter-btn"
                    onClick={() =>
                      setShowAddFilterMenu((prev) => !prev)
                    }
                  >
                    <Plus size={14} weight="bold" />
                    <span>Add Filter</span>
                  </button>
                  {showAddFilterMenu && (
                    <div className="global-search-add-filter-menu">
                      {inactiveFilters.map((filter) => {
                        const Icon = filter.icon;
                        return (
                          <button
                            key={filter.id}
                            type="button"
                            className="global-search-add-filter-menu-item"
                            onClick={() => handleAddFilter(filter.id)}
                          >
                            <Icon size={16} />
                            <span>{filter.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="global-search-filters">
              {ALL_FILTERS.map((filter) => {
                const isActive = activeFilters.has(filter.id);
                if (!isActive) return null;
                const Icon = filter.icon;
                return (
                  <span
                    key={filter.id}
                    className="global-search-filter-tag global-search-filter-tag--active"
                  >
                    <Icon size={14} weight="bold" />
                    <span>{filter.label}</span>
                    {activeFilters.size > 1 && (
                      <button
                        type="button"
                        className="global-search-filter-tag__remove"
                        onClick={(e) => handleRemoveFilter(filter.id, e)}
                        aria-label={`Remove ${filter.label} filter`}
                      >
                        <X size={12} weight="bold" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="global-search-results-list">
            {!hasSearchInput ? (
              <div className="global-search-empty-state">
                <MagnifyingGlass size={32} weight="duotone" />
                <p>Type at least 2 characters to search across the network</p>
              </div>
            ) : isLoading && totalResultsCount === 0 ? (
              <div className="global-search-loading-state">
                <CircleNotch size={26} className="animate-spin" />
                <span>Searching {Array.from(activeFilters).join(", ")}...</span>
              </div>
            ) : totalResultsCount === 0 ? (
              <div className="global-search-empty-state">
                <p>No results found for &ldquo;{query}&rdquo;</p>
                <small>Try searching with different keywords or add filters</small>
              </div>
            ) : (
              <>
                {activeFilters.has("users") && results.users.length > 0 && (
                  <div className="global-search-section">
                    <div className="global-search-section__header">
                      <span>Users</span>
                      <span className="global-search-section__count">
                        {results.users.length}
                      </span>
                    </div>
                    <ul className="global-search-items">
                      {results.users.map((user, idx) => {
                        const itemIndex = idx;
                        const isSelected = itemIndex === selectedIndex;
                        const fullName = getUserFullName(user, "User");
                        return (
                          <li key={user.id}>
                            <button
                              ref={isSelected ? selectedItemRef : null}
                              type="button"
                              className={`global-search-item ${
                                isSelected ? "global-search-item--selected" : ""
                              }`}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              onClick={() =>
                                handleSelectResult(`/profile/${user.id}`)
                              }
                            >
                              <div className="global-search-item__avatar">
                                <Avatar
                                  avatarPath={user.avatar_path}
                                  seed={user.id}
                                  alt=""
                                  size="sm"
                                />
                              </div>
                              <div className="global-search-item__details">
                                <div className="global-search-item__primary">
                                  <span className="global-search-item__title">
                                    {fullName}
                                  </span>
                                </div>
                                <div className="global-search-item__secondary">
                                  {user.nickname ? (
                                    <span>@{user.nickname}</span>
                                  ) : (
                                    <span>{user.email}</span>
                                  )}
                                </div>
                              </div>
                              <div className="global-search-item__end">
                                {user.is_self ? (
                                  <span className="global-search-badge global-search-badge--neutral">
                                    You
                                  </span>
                                ) : user.is_following ? (
                                  <span className="global-search-badge global-search-badge--active">
                                    Following
                                  </span>
                                ) : user.is_requested ? (
                                  <span className="global-search-badge global-search-badge--warning">
                                    Requested
                                  </span>
                                ) : user.privacy === PROFILE_PRIVACY.PRIVATE ? (
                                  <span className="global-search-badge global-search-badge--muted">
                                    Private
                                  </span>
                                ) : null}
                                <ArrowUpRight
                                  className="global-search-item__arrow"
                                  size={16}
                                  weight="bold"
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {activeFilters.has("groups") && results.groups.length > 0 && (
                  <div className="global-search-section">
                    <div className="global-search-section__header">
                      <span>Groups</span>
                      <span className="global-search-section__count">
                        {results.groups.length}
                      </span>
                    </div>
                    <ul className="global-search-items">
                      {results.groups.map((group, idx) => {
                        const itemIndex =
                          (activeFilters.has("users") ? results.users.length : 0) +
                          idx;
                        const isSelected = itemIndex === selectedIndex;
                        return (
                          <li key={group.id}>
                            <button
                              ref={isSelected ? selectedItemRef : null}
                              type="button"
                              className={`global-search-item ${
                                isSelected ? "global-search-item--selected" : ""
                              }`}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              onClick={() =>
                                handleSelectResult(
                                  group.is_member
                                    ? `/groups/${group.id}`
                                    : `/groups?selected=${group.id}`
                                )
                              }
                            >
                              <div className="global-search-item__icon-wrapper">
                                <UsersThree size={20} weight="duotone" />
                              </div>
                              <div className="global-search-item__details">
                                <div className="global-search-item__primary">
                                  <span className="global-search-item__title">
                                    {group.title}
                                  </span>
                                </div>
                                <div className="global-search-item__secondary">
                                  <span>
                                    {group.member_count}{" "}
                                    {group.member_count === 1
                                      ? "member"
                                      : "members"}
                                  </span>
                                  {group.description && (
                                    <>
                                      <span className="global-search-dot">·</span>
                                      <span className="global-search-snippet">
                                        {group.description}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                              <div className="global-search-item__end">
                                {group.is_member ? (
                                  <span className="global-search-badge global-search-badge--active">
                                    Member
                                  </span>
                                ) : group.is_pending ? (
                                  <span className="global-search-badge global-search-badge--warning">
                                    Pending
                                  </span>
                                ) : null}
                                <ArrowUpRight
                                  className="global-search-item__arrow"
                                  size={16}
                                  weight="bold"
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {activeFilters.has("posts") && results.posts.length > 0 && (
                  <div className="global-search-section">
                    <div className="global-search-section__header">
                      <span>Posts</span>
                      <span className="global-search-section__count">
                        {results.posts.length}
                      </span>
                    </div>
                    <ul className="global-search-items">
                      {results.posts.map((post, idx) => {
                        const itemIndex =
                          (activeFilters.has("users") ? results.users.length : 0) +
                          (activeFilters.has("groups") ? results.groups.length : 0) +
                          idx;
                        const isSelected = itemIndex === selectedIndex;
                        const authorFullName =
                          [post.author_first_name, post.author_last_name]
                            .filter(Boolean)
                            .join(" ") || "Author";
                        const dateFormatted = formatLocalDate(post.created_at, {
                          month: "short",
                          day: "numeric",
                        });

                        return (
                          <li key={post.id}>
                            <button
                              ref={isSelected ? selectedItemRef : null}
                              type="button"
                              className={`global-search-item ${
                                isSelected ? "global-search-item--selected" : ""
                              }`}
                              onMouseEnter={() => setSelectedIndex(itemIndex)}
                              onClick={() =>
                                handleSelectResult(`/posts/${post.id}`)
                              }
                            >
                              <div className="global-search-item__avatar">
                                <Avatar
                                  avatarPath={post.author_avatar_path}
                                  seed={post.author_id}
                                  alt=""
                                  size="sm"
                                />
                              </div>
                              <div className="global-search-item__details">
                                <div className="global-search-item__primary">
                                  <span className="global-search-item__title global-search-item__content-preview">
                                    {post.content}
                                  </span>
                                </div>
                                <div className="global-search-item__secondary">
                                  <span>By {authorFullName}</span>
                                  {post.group_title && (
                                    <>
                                      <span className="global-search-dot">
                                        ·
                                      </span>
                                      <span>in {post.group_title}</span>
                                    </>
                                  )}
                                  <span className="global-search-dot">·</span>
                                  <span>{dateFormatted}</span>
                                </div>
                              </div>
                              <div className="global-search-item__end">
                                {post.privacy === POST_PRIVACY.GROUP && (
                                  <span className="global-search-badge global-search-badge--neutral">
                                    Group
                                  </span>
                                )}
                                {post.privacy === POST_PRIVACY.FOLLOWERS && (
                                  <span className="global-search-badge global-search-badge--neutral">
                                    Followers
                                  </span>
                                )}
                                {post.privacy === POST_PRIVACY.PUBLIC && (
                                  <span className="global-search-badge global-search-badge--active">
                                    Public
                                  </span>
                                )}
                                <ArrowUpRight
                                  className="global-search-item__arrow"
                                  size={16}
                                  weight="bold"
                                />
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
