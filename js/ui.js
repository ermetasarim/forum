(function () {
  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.from((root || document).querySelectorAll(sel));
  }

  function toast(msg, type) {
    let hold = qs("#toast-hold");
    if (!hold) {
      hold = document.createElement("div");
      hold.id = "toast-hold";
      document.body.appendChild(hold);
    }
    const el = document.createElement("div");
    el.className = "toast " + (type || "");
    el.textContent = msg;
    hold.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function fmtTime(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - ts;
    if (diff < 60000) return "az önce";
    if (diff < 3600000) return Math.floor(diff / 60000) + " dk önce";
    if (diff < 86400000) return Math.floor(diff / 3600000) + " sa önce";
    return d.toLocaleString("tr-TR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function param(name) {
    return new URLSearchParams(location.search).get(name);
  }

  function emptyBox(title, text, actionHtml) {
    return `
      <div class="empty">
        <div class="empty-icon">∅</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(text)}</p>
        ${actionHtml || ""}
      </div>`;
  }

  function bindSearch(input) {
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const q = input.value.trim();
      const prefix = window.MeydanAuth.isAdminPage() ? "../" : "";
      location.href = prefix + "index.html?q=" + encodeURIComponent(q);
    });
  }

  function header(user, settings) {
    settings = settings || {};
    const adminPrefix = window.MeydanAuth.isAdminPage() ? "" : "admin/";
    const rootPrefix = window.MeydanAuth.isAdminPage() ? "../" : "";
    return `
      <header class="site-header">
        <div class="container header-inner">
          <a class="logo" href="${rootPrefix}index.html">
            <span class="logo-mark">M</span> ${escapeHtml(settings.siteName || "Meydan")}
          </a>
          <div class="search">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3-3"/></svg>
            <input type="search" id="global-search" placeholder="Konu veya kategori ara..." />
          </div>
          <div class="header-actions">
            <a class="btn btn-outline" href="${adminPrefix}dashboard.html">Admin</a>
            <a class="btn btn-ghost" href="${rootPrefix}profile.html">${escapeHtml(user.name)}</a>
            <button class="btn btn-ghost" type="button" id="logout-btn">Çıkış</button>
            <span class="avatar">${escapeHtml(window.MeydanAuth.initials(user))}</span>
          </div>
        </div>
      </header>`;
  }

  function adminSidebar(active) {
    const items = [
      ["dashboard.html", "Kontrol paneli"],
      ["users.html", "Kullanıcılar"],
      ["moderation.html", "Moderasyon"],
      ["categories.html", "Kategoriler"],
      ["settings.html", "Ayarlar"],
      ["reports.html", "Raporlar"],
    ];
    return `
      <aside class="admin-sidebar">
        <div class="admin-brand"><span class="logo-mark">M</span> Meydan Admin</div>
        <div class="nav-label">Genel</div>
        ${items
          .slice(0, 4)
          .map(
            ([href, label]) =>
              `<a class="nav-link ${active === href ? "active" : ""}" href="${href}">${label}</a>`
          )
          .join("")}
        <div class="nav-label">Sistem</div>
        ${items
          .slice(4)
          .map(
            ([href, label]) =>
              `<a class="nav-link ${active === href ? "active" : ""}" href="${href}">${label}</a>`
          )
          .join("")}
        <a class="nav-link" href="../index.html">Siteye dön</a>
        <button class="nav-link" type="button" id="logout-btn" style="width:100%;background:none;border:0;text-align:left;cursor:pointer">Çıkış</button>
      </aside>`;
  }

  function wireChrome() {
    bindSearch(qs("#global-search"));
    qsa("#logout-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await window.MeydanAuth.logout();
        const login = window.MeydanAuth.isAdminPage() ? "../login.html" : "login.html";
        location.href = login;
      });
    });
  }

  window.MeydanUI = {
    qs,
    qsa,
    toast,
    fmtTime,
    escapeHtml,
    param,
    emptyBox,
    header,
    adminSidebar,
    wireChrome,
  };
})();
