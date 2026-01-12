import bcrypt from "bcrypt";

const sessions = new Map();

export function login(user, password) {
  if (!bcrypt.compareSync(password, user.passwordHash)) {
    throw new Error("invalid_credentials");
  }

  const token = crypto.randomUUID();
  sessions.set(token, user.id);

  return token;
}

export function requireAuth(token) {
  const userId = sessions.get(token);
  if (!userId) {
    throw new Error("auth_required");
  }
  return userId;
}
