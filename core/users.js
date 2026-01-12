export function createUser({ username, email, passwordHash }) {
  return {
    id: crypto.randomUUID(),
    username,
    email,
    passwordHash,

    createdAt: Date.now(),

    stats: {
      needsOpen: 0,
      needsTotal: 0,
      wins: 0,
      donations: 0
    }
  };
}
