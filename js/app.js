(function () {
  const UI = window.MeydanUI;
  const DB = window.MeydanDB;

  async function mountPublic(user) {
    const settings = await DB.settings();
    const hold = document.getElementById("site-header");
    if (hold) hold.outerHTML = UI.header(user, settings);
    UI.wireChrome();
  }

  async function renderIndex(user) {
    await mountPublic(user);
    const settings = await DB.settings();
    let stats = { users: 1, topics: 0, posts: 0, categories: 0 };
    let cats = [];
    const health = await DB.health();
    try {
      if (health.ok) {
        stats = await DB.stats();
        cats = await DB.categories();
      }
    } catch (e) {
      UI.toast(e.message, "err");
    }
    const q = UI.param("q");
    const search = q && health.ok ? await DB.search(q) : null;
    const hero = document.getElementById("hero-slot");
    if (hero) {
      var setupNote = health.ok
        ? "Veriler Supabase uzerinden geliyor. Kategoriler bos; ilk bolumu admin panelinden ac."
        : "Supabase baglandi ama tablolar henuz yok. setup.html sayfasindaki SQL'i Dashboard > SQL Editor'da calistir.";
      hero.innerHTML = `
        <section class="hero">
          <div>
            <div class="badge badge-pin" style="margin-bottom:12px;">Yalnizca admin erisimi</div>
            <h1>${UI.escapeHtml(settings.tagline || "Konus, tartis, birlikte uret.")}</h1>
            <p>${setupNote}</p>
            <div class="hero-stats">
              <div class="stat-pill"><b>${stats.users}</b><span>Uye</span></div>
              <div class="stat-pill"><b>${stats.topics}</b><span>Konu</span></div>
              <div class="stat-pill"><b>${stats.posts}</b><span>Mesaj</span></div>
              <div class="stat-pill"><b>${stats.categories}</b><span>Kategori</span></div>
            </div>
          </div>
          <div class="hero-card">
            <h3>Hizli basla</h3>
            <p style="color:#cbd5e1;font-size:.9rem;margin-bottom:12px;">${health.ok ? "Once bir kategori olustur." : "Once semayi kur."}</p>
            <a class="btn btn-primary" href="${health.ok ? "admin/categories.html" : "setup.html"}">${health.ok ? "Kategori ekle" : "Kurulum"}</a>
          </div>
        </section>`;
    }
    const list = document.getElementById("category-list");
    if (list) {
      const sourceCats = search ? search.categories : cats;
      const sourceTopics = search ? search.topics : [];
      if (q) document.getElementById("list-title").textContent = "Arama: " + q;
      if (!sourceCats.length && !sourceTopics.length) {
        list.innerHTML = UI.emptyBox(
          health.ok ? (q ? "Sonuc yok" : "Henuz kategori yok") : "Tablolar yok",
          health.ok ? (q ? "Baska bir sozcuk dene." : "Admin panelinden ilk kategoriyi olustur.") : "SQL semasini calistir.",
          health.ok ? '<a class="btn btn-primary" href="admin/categories.html">Kategori olustur</a>' : '<a class="btn btn-primary" href="setup.html">Kurulum</a>'
        );
      } else {
        var html = "";
        for (const c of sourceCats) {
          const count = health.ok ? await DB.topicCounts(c.id) : 0;
          const last = health.ok ? await DB.lastTopicActivity(c.id) : null;
          html += `
            <a class="cat-row" href="category.html?id=${encodeURIComponent(c.id)}">
              <div class="cat-icon" style="background:#eef2ff;color:#4f46e5">${UI.escapeHtml(c.icon || "📁")}</div>
              <div>
                <div class="cat-title">${UI.escapeHtml(c.name)}</div>
                <div class="cat-desc">${UI.escapeHtml(c.description || "")}</div>
              </div>
              <div class="cat-meta"><b>${count} konu</b>${last ? UI.fmtTime(last.updatedAt) : "Henuz yok"}</div>
            </a>`;
        }
        (sourceTopics || []).forEach(function (t) {
          html += `
            <a class="cat-row" href="thread.html?id=${encodeURIComponent(t.id)}">
              <div class="cat-icon" style="background:#fff7ed;color:#c2410c">💬</div>
              <div>
                <div class="cat-title">${UI.escapeHtml(t.title)}</div>
                <div class="cat-desc">Konu</div>
              </div>
              <div class="cat-meta">${UI.fmtTime(t.updatedAt)}</div>
            </a>`;
        });
        list.innerHTML = html;
      }
    }
    const online = document.getElementById("online-slot");
    if (online) {
      online.innerHTML = `
        <div class="user-mini">
          <span class="avatar">${UI.escapeHtml(window.MeydanAuth.initials(user))}</span>
          <div><b>${UI.escapeHtml(user.name)}</b><div class="muted">Yonetici · tek oturum</div></div>
        </div>
        <p class="muted" style="margin-top:8px">Baska uye yok.</p>`;
    }
  }

  async function renderCategory(user) {
    await mountPublic(user);
    const id = UI.param("id");
    const cat = await DB.categoryById(id);
    const title = document.getElementById("cat-title");
    const desc = document.getElementById("cat-desc");
    const list = document.getElementById("thread-list");
    const newBtn = document.getElementById("new-topic-btn");
    if (!cat) {
      if (title) title.textContent = "Kategori bulunamadi";
      if (list) list.innerHTML = UI.emptyBox("Bu kategori yok", "Silinmis veya henuz olusturulmamis.", '<a class="btn btn-primary" href="index.html">Ana sayfa</a>');
      if (newBtn) newBtn.style.display = "none";
      return;
    }
    if (title) title.textContent = cat.name;
    const crumb = document.getElementById("crumb-name");
    if (crumb) crumb.textContent = cat.name;
    if (desc) desc.textContent = cat.description || "";
    if (newBtn) newBtn.href = "new-topic.html?category=" + encodeURIComponent(cat.id);
    const topics = await DB.topics(cat.id);
    if (!topics.length) {
      list.innerHTML = UI.emptyBox("Konu yok", "Bu kategoride henuz tartisma baslatilmadi.", '<a class="btn btn-primary" href="new-topic.html?category=' + encodeURIComponent(cat.id) + '">Ilk konuyu ac</a>');
      return;
    }
    var html = "";
    for (const t of topics) {
      const replies = Math.max(0, (await DB.posts(t.id)).length - 1);
      const author = await DB.userById(t.authorId);
      html += `
          <a class="thread-row" href="thread.html?id=${encodeURIComponent(t.id)}">
            <div>
              ${t.pinned ? '<span class="badge badge-pin">Sabit</span>' : ""}
              ${t.locked ? '<span class="badge badge-lock">Kilitli</span>' : ""}
              <div class="cat-title" style="margin-top:6px">${UI.escapeHtml(t.title)}</div>
              <div class="muted">Baslatan ${UI.escapeHtml(author ? author.name : "—")} · ${replies} yanit</div>
            </div>
            <div class="muted">${replies} yanit</div>
            <div class="muted">${UI.fmtTime(t.updatedAt)}</div>
          </a>`;
    }
    list.innerHTML = html;
  }

  async function renderThread(user) {
    await mountPublic(user);
    const id = UI.param("id");
    const topic = await DB.topicById(id);
    const wrap = document.getElementById("thread-wrap");
    if (!topic) {
      wrap.innerHTML = UI.emptyBox("Konu yok", "Silinmis olabilir.", '<a class="btn btn-primary" href="index.html">Ana sayfa</a>');
      return;
    }
    const cat = await DB.categoryById(topic.categoryId);
    document.getElementById("crumb-cat").textContent = cat ? cat.name : "Kategori";
    document.getElementById("crumb-cat").href = cat ? "category.html?id=" + cat.id : "index.html";
    document.getElementById("thread-title").textContent = topic.title;
    document.getElementById("thread-flags").innerHTML =
      (topic.pinned ? '<span class="badge badge-pin">Sabit</span>' : "") +
      (topic.locked ? '<span class="badge badge-lock">Kilitli</span>' : "");
    const posts = await DB.posts(topic.id);
    var html = "";
    for (var i = 0; i < posts.length; i++) {
      const p = posts[i];
      const a = await DB.userById(p.authorId);
      html += `
          <article class="post">
            <div class="author">
              <div class="avatar">${UI.escapeHtml(window.MeydanAuth.initials(a || { name: "?" }))}</div>
              <div class="author-name">${UI.escapeHtml(a ? a.name : "Silinmis")}</div>
              <div class="author-role">${a && a.role === "admin" ? "Yonetici" : "Uye"}</div>
              <div class="author-meta">${a ? a.messages + " mesaj" : ""}</div>
            </div>
            <div class="post-body">
              <div class="post-meta"><span>#${i + 1} · ${UI.fmtTime(p.createdAt)}</span></div>
              <div class="post-content"><p>${UI.escapeHtml(p.body).replace(/\n/g, "<br>")}</p></div>
            </div>
          </article>`;
    }
    document.getElementById("posts").innerHTML = html;
    const form = document.getElementById("reply-form");
    const box = document.getElementById("reply-box");
    if (topic.locked) {
      box.innerHTML = '<p class="muted">Bu konu kilitli. Yeni yanit yazilamaz.</p>';
    } else {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        try {
          await DB.addPost({ topicId: topic.id, body: form.body.value, authorId: user.id });
          UI.toast("Yanit eklendi");
          location.reload();
        } catch (err) {
          UI.toast(err.message, "err");
        }
      });
    }
    document.getElementById("pin-btn").addEventListener("click", async function () {
      await DB.updateTopic(topic.id, { pinned: !topic.pinned });
      location.reload();
    });
    document.getElementById("lock-btn").addEventListener("click", async function () {
      await DB.updateTopic(topic.id, { locked: !topic.locked });
      location.reload();
    });
    document.getElementById("del-btn").addEventListener("click", async function () {
      if (!confirm("Konu silinsin mi?")) return;
      await DB.deleteTopic(topic.id);
      location.href = cat ? "category.html?id=" + cat.id : "index.html";
    });
  }

  async function renderNewTopic(user) {
    await mountPublic(user);
    const cats = await DB.categories();
    const select = document.getElementById("topic-cat");
    const preset = UI.param("category");
    if (!cats.length) {
      document.getElementById("new-topic-card").innerHTML = UI.emptyBox(
        "Once kategori gerekli",
        "Konu acmak icin admin panelinden kategori olustur.",
        '<a class="btn btn-primary" href="admin/categories.html">Kategori ekle</a>'
      );
      return;
    }
    select.innerHTML = cats.map(function (c) {
      return '<option value="' + c.id + '" ' + (c.id === preset ? "selected" : "") + ">" + UI.escapeHtml(c.name) + "</option>";
    }).join("");
    document.getElementById("new-topic-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        const topic = await DB.addTopic({ categoryId: select.value, title: e.target.title.value, body: e.target.body.value, authorId: user.id });
        location.href = "thread.html?id=" + encodeURIComponent(topic.id);
      } catch (err) {
        UI.toast(err.message, "err");
      }
    });
  }

  async function renderProfile(user) {
    await mountPublic(user);
    const profile = (await DB.userById(user.id)) || user;
    document.getElementById("prof-name").textContent = profile.name;
    document.getElementById("prof-meta").textContent = user.email + " · tek admin";
    document.getElementById("prof-avatar").textContent = window.MeydanAuth.initials(user);
    document.getElementById("prof-msg").textContent = (profile.messages || 0) + " mesaj";
  }

  async function renderLogin() {
    const existing = await window.MeydanAuth.current();
    if (existing) {
      location.replace("index.html");
      return;
    }
    const health = await DB.health();
    const note = document.querySelector(".auth-card .muted");
    if (note && !health.ok) {
      note.innerHTML = 'Tablolar henuz yok. <a href="setup.html" style="color:var(--primary);font-weight:700">Kurulum SQL</a> dosyasini calistir. Giris icin e-posta onayini da acman gerekebilir.';
    }
    const form = document.getElementById("login-form");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try {
        await window.MeydanAuth.login(form.email.value.trim(), form.password.value);
        const next = UI.param("next");
        location.href = next && !next.startsWith("http") ? next : "index.html";
      } catch (err) {
        UI.toast(err.message, "err");
      }
    });
  }

  async function start() {
    const page = window.MeydanAuth.path();
    if (page === "login.html") return renderLogin();
    if (page === "register.html" || page === "setup.html") return;
    const user = await window.MeydanAuth.requireAdmin();
    if (!user) return;
    if (page === "index.html" || page === "") return renderIndex(user);
    if (page === "category.html") return renderCategory(user);
    if (page === "thread.html") return renderThread(user);
    if (page === "new-topic.html") return renderNewTopic(user);
    if (page === "profile.html") return renderProfile(user);
    return mountPublic(user);
  }
  start().catch(function (err) { console.error(err); });
})();
