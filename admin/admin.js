(async function () {
  const user = await window.MeydanAuth.requireAdmin();
  if (!user) return;
  const UI = window.MeydanUI;
  const DB = window.MeydanDB;
  const page = window.MeydanAuth.path();

  const side = document.getElementById("admin-sidebar");
  if (side) side.outerHTML = UI.adminSidebar(page);
  UI.wireChrome();
  const who = document.getElementById("admin-who");
  if (who) who.textContent = user.name + " · admin";

  const health = await DB.health();
  if (!health.ok) {
    const main = document.querySelector(".admin-content");
    if (main) {
      main.insertAdjacentHTML("afterbegin", '<div class="card" style="padding:16px;margin-bottom:16px"><b>Tablolar yok.</b> <a href="../setup.html">Kurulum SQL</a> dosyasini Supabase SQL Editor\'da calistir.</div>');
    }
    return;
  }

  if (page === "dashboard.html") {
    const s = await DB.stats();
    document.getElementById("kpi-users").textContent = s.users;
    document.getElementById("kpi-topics").textContent = s.topics;
    document.getElementById("kpi-reports").textContent = s.openReports;
    document.getElementById("kpi-online").textContent = s.online;
    const users = (await DB.users()).slice(0, 8);
    document.getElementById("last-users").innerHTML = users.map(function (u) {
      return "<tr><td>" + UI.escapeHtml(u.name) + '<div class="muted">' + UI.escapeHtml(u.email) + "</div></td><td>" + UI.escapeHtml(u.email) + '</td><td><span class="badge badge-ok">' + UI.escapeHtml(u.status) + "</span></td><td>" + UI.fmtTime(u.createdAt) + "</td></tr>";
    }).join("") || "<tr><td colspan='4'>Kayit yok</td></tr>";
    document.getElementById("reset-btn").addEventListener("click", async function () {
      if (!confirm("Kategoriler, konular ve mesajlar silinsin mi? Admin hesabi kalir.")) return;
      await DB.resetContent();
      UI.toast("Icerik sifirlandi");
      location.reload();
    });
  }

  if (page === "users.html") {
    const users = await DB.users();
    document.getElementById("users-body").innerHTML = users.slice(0, 40).map(function (u) {
      return "<tr><td><b>" + UI.escapeHtml(u.name) + '</b><div class="muted">' + UI.escapeHtml(u.email) + "</div></td><td>" + UI.escapeHtml(u.role) + "</td><td>" + (u.messages || 0) + '</td><td><span class="badge badge-ok">' + UI.escapeHtml(u.status) + "</span></td><td class=\"muted\">" + (u.role === "admin" ? "Admin" : "") + "</td></tr>";
    }).join("");
    const more = document.getElementById("users-more");
    if (more) more.textContent = users.length + " üye";
    document.getElementById("add-user-btn").addEventListener("click", function () {
      UI.toast("Yeni uye ekleme kapali. Yalnizca admin girebilir.", "err");
    });
  }

  if (page === "categories.html") {
    const tbody = document.getElementById("cat-body");
    const form = document.getElementById("cat-form");
    async function paint() {
      const rows = await DB.categories();
      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5">' + UI.emptyBox("Kategori yok", "Forum su an bos. Ilk bolumu ekle.") + "</td></tr>";
        return;
      }
      var html = "";
      for (const c of rows) {
        const count = await DB.topicCounts(c.id);
        html += "<tr><td>" + UI.escapeHtml(c.icon || "") + " <b>" + UI.escapeHtml(c.name) + '</b><div class="muted">' + UI.escapeHtml(c.description || "") + "</div></td><td>" + count + "</td><td>" + UI.escapeHtml(c.visibility) + "</td><td>" + UI.escapeHtml(c.writePerm) + '</td><td><button class="btn btn-danger btn-sm" data-del="' + c.id + '">Sil</button></td></tr>';
      }
      tbody.innerHTML = html;
      UI.qsa("[data-del]").forEach(function (btn) {
        btn.addEventListener("click", async function () {
          if (!confirm("Kategori ve icindeki konular silinsin mi?")) return;
          await DB.deleteCategory(btn.getAttribute("data-del"));
          await paint();
          UI.toast("Kategori silindi");
        });
      });
    }
    await paint();
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await DB.addCategory({ name: form.name.value, description: form.description.value, icon: form.icon.value || "📁", visibility: form.visibility.value, writePerm: form.writePerm.value });
        form.reset();
        await paint();
        UI.toast("Kategori eklendi");
      } catch (err) {
        UI.toast(err.message, "err");
      }
    });
  }

  if (page === "moderation.html") {
    const reports = (await DB.reports()).filter(function (r) { return r.status === "open"; });
    const tbody = document.getElementById("mod-body");
    if (!reports.length) {
      tbody.innerHTML = '<tr><td colspan="5">' + UI.emptyBox("Kuyruk bos", "Bekleyen rapor yok.") + "</td></tr>";
    } else {
      tbody.innerHTML = reports.map(function (r) {
        return "<tr><td>" + UI.escapeHtml(r.targetType) + " " + UI.escapeHtml(r.targetId) + "</td><td>" + UI.escapeHtml(r.reason) + "</td><td>—</td><td><span class='badge badge-warn'>" + UI.escapeHtml(r.priority) + "</span></td><td><button class='btn btn-outline btn-sm' data-ok='" + r.id + "'>Kapat</button></td></tr>";
      }).join("");
    }
  }

  if (page === "settings.html") {
    const s = await DB.settings();
    const form = document.getElementById("settings-form");
    form.siteName.value = s.siteName;
    form.tagline.value = s.tagline;
    form.registration.value = "closed";
    form.maintenance.value = s.maintenance ? "on" : "off";
    form.welcome.value = s.welcome;
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await DB.saveSettings({ siteName: form.siteName.value, tagline: form.tagline.value, registration: "closed", maintenance: form.maintenance.value === "on", welcome: form.welcome.value });
        UI.toast("Ayarlar kaydedildi");
      } catch (err) {
        UI.toast(err.message, "err");
      }
    });
  }

  if (page === "reports.html") {
    const s = await DB.stats();
    document.getElementById("r-dau").textContent = s.online;
    document.getElementById("r-topics").textContent = s.topics;
    document.getElementById("r-posts").textContent = s.posts;
    document.getElementById("r-solve").textContent = "—";
  }
})().catch(function (err) { console.error(err); });
