// auth/auth.js
export function login(username) {
  localStorage.setItem("loot_user", JSON.stringify({
    name: username,
    loginAt: Date.now()
  }));
}

export function logout() {
  localStorage.removeItem("loot_user");
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("loot_user"));
  } catch {
    return null;
  }
}
