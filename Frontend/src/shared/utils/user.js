export function getUserFullName(user, fallback = "") {
  return (
    [user?.first_name, user?.last_name].filter(Boolean).join(" ") || fallback
  );
}

export function getUserDisplayName(user, fallback = "User") {
  return user?.nickname || getUserFullName(user, fallback);
}
