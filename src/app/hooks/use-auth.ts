import { useEffect, useMemo, useState } from "react";
import { KEY_SESSION, KEY_USERS, createEmptyUserData, userDataKey } from "../data";
import type { User } from "../types";
import { loadJson, nowISO, saveJson, sha256, uid } from "../utils";

export type AuthMode = "login" | "register";

export function useAuth() {
  const [users, setUsers] = useState<User[]>(() => loadJson<User[]>(KEY_USERS, []));
  const [sessionUserId, setSessionUserId] = useState<string | null>(() => loadJson<string | null>(KEY_SESSION, null));
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authErr, setAuthErr] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const currentUser = useMemo(() => users.find((u) => u.id === sessionUserId) ?? null, [users, sessionUserId]);

  useEffect(() => {
    saveJson(KEY_USERS, users);
  }, [users]);

  useEffect(() => {
    saveJson(KEY_SESSION, sessionUserId);
  }, [sessionUserId]);

  async function handleAuth() {
    setAuthErr(null);
    const email = authEmail.trim().toLowerCase();
    const password = authPassword;

    if (!email || !email.includes("@")) return setAuthErr("Enter a valid email.");
    if (!password || password.length < 8) return setAuthErr("Password must be at least 8 characters.");

    setAuthBusy(true);
    try {
      const hash = await sha256(`${email}::${password}`);
      if (authMode === "register") {
        if (users.some((u) => u.email === email)) {
          setAuthErr("That email is already registered.");
          return;
        }

        const newUser: User = { id: uid("u"), email, passwordHash: hash, createdAt: nowISO() };
        setUsers((prev) => [newUser, ...prev]);
        saveJson(userDataKey(newUser.id), createEmptyUserData());
        setSessionUserId(newUser.id);
        setAuthPassword("");
        setAuthErr(null);
        return;
      }

      const user = users.find((x) => x.email === email);
      if (!user) {
        setAuthErr("No account found for that email.");
        return;
      }
      if (user.passwordHash !== hash) {
        setAuthErr("Incorrect password.");
        return;
      }

      setSessionUserId(user.id);
      setAuthPassword("");
    } finally {
      setAuthBusy(false);
    }
  }

  function logout() {
    setSessionUserId(null);
    setAuthEmail("");
    setAuthPassword("");
    setAuthErr(null);
  }

  return {
    users,
    setUsers,
    sessionUserId,
    setSessionUserId,
    currentUser,
    authMode,
    setAuthMode,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authErr,
    authBusy,
    handleAuth,
    logout,
  };
}
