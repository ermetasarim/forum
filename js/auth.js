(function () {
  function path() {
    return location.pathname.split("/").pop() || "index.html";
  }
  function isAuthPage() {
    const p = path();
    return p === "login.html" || p === "register.html" || p === "setup.html";
  }
  function isAdminPage() {
    return location.pathname.includes("/admin/");
  }
  function initials(user) {
    if (!user || !user.name) return "ER";
    return user.name.split(" ").map(function (p) { return p[0]; }).join("").slice(0, 2).toUpperCase();
  }
  function roleOf(user) {
    return (user && user.user_metadata && user.user_metadata.role) || (user && user.app_metadata && user.app_metadata.role) || "";
  }
  function toAppUser(sessionUser) {
    if (!sessionUser) return null;
    if (roleOf(sessionUser) !== "admin") return null;
    return {
      id: sessionUser.id,
      email: sessionUser.email,
      name: (sessionUser.user_metadata && sessionUser.user_metadata.name) || "Erdem",
      role: "admin",
      status: "active",
      messages: 0
    };
  }
  async function current() {
    const res = await window.MeydanDB.client.auth.getSession();
    if (res.error || !res.data.session) return null;
    return toAppUser(res.data.session.user);
  }
  async function login(email, password) {
    const res = await window.MeydanDB.client.auth.signInWithPassword({
      email: String(email || "").trim(),
      password: String(password || "")
    });
    if (res.error) {
      var msg = res.error.message || "";
      if (/confirm/i.test(msg)) {
        throw new Error("E-posta henuz onaylanmadi. Gmail kutundaki Supabase dogrulama linkine tikla. Ya da Dashboard > Authentication > Providers > Email > Confirm email secenegini kapat.");
      }
      if (/invalid/i.test(msg)) throw new Error("E-posta veya sifre hatali.");
      throw new Error(msg);
    }
    const appUser = toAppUser(res.data.user);
    if (!appUser) {
      await window.MeydanDB.client.auth.signOut();
      throw new Error("Giris yalnizca admin rolu icin acik.");
    }
    await window.MeydanDB.ensureProfile(appUser);
    return appUser;
  }
  async function logout() {
    await window.MeydanDB.client.auth.signOut();
  }
  async function requireAdmin() {
    const user = await current();
    if (user) return user;
    const nextPage = (isAdminPage() ? "admin/" : "") + path() + location.search;
    const loginHref = isAdminPage() ? "../login.html" : "login.html";
    location.replace(loginHref + "?next=" + encodeURIComponent(nextPage));
    return null;
  }
  window.MeydanAuth = { current: current, login: login, logout: logout, initials: initials, requireAdmin: requireAdmin, isAuthPage: isAuthPage, isAdminPage: isAdminPage, path: path };
})();
