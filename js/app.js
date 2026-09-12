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
    const sourceCats = search ? search.categories : cats;
    const sourceTopics = search ? search.topics : [];
    const board = document.getElementById("board");
    if (board) {
      if (!sourceCats.length && !sourceTopics.length) {
        board.innerHTML = '<section class="board">' + UI.emptyBox(q ? "Sonuç yok" : "Forum yok", "", health.ok ? '<a class="btn btn-primary" href="admin/categories.html">Forum ekle</a>' : '<a class="btn btn-primary" href="setup.html">Kurulum</a>') + "</section>";
      } else {
        var html = '<section class="board"><div class="board-h"><b>' + (q ? "Arama" : "Forumlar") + '</b></div>';
        html += '<div class="forum-head"><span>Forum</span><span>Konu</span><span>Mesaj</span><span>Son mesaj</span></div>';
        for (const c of sourceCats) {
          const topics = health.ok ? await DB.topics(c.id) : [];
          var postCount = 0;
          for (const t of topics) postCount += (await DB.posts(t.id)).length;
          const last = topics[0] || null;
          html += '<a class="forum-row" href="category.html?id=' + encodeURIComponent(c.id) + '">' +
            '<div class="f-main"><div class="f-ico">' + UI.escapeHtml(c.icon || "●") + '</div><div>' +
            '<div class="f-title">' + UI.escapeHtml(c.name) + '</div>' +
            (c.description ? '<div class="f-desc">' + UI.escapeHtml(c.description) + "</div>" : "") +
            "</div></div>" +
            '<div class="f-num">' + topics.length + "</div>" +
            '<div class="f-num">' + postCount + "</div>" +
            '<div class="f-last">' + (last ? "<b>" + UI.escapeHtml(last.title) + "</b>" + UI.fmtTime(last.updatedAt) : "—") + "</div></a>";
        }
        (sourceTopics || []).forEach(function (t) {
          html += '<a class="forum-row" href="thread.html?id=' + encodeURIComponent(t.id) + '"><div class="f-main"><div class="f-ico">▸</div><div><div class="f-title">' + UI.escapeHtml(t.title) + "</div></div></div><div></div><div></div><div class=\"f-last\">" + UI.fmtTime(t.updatedAt) + "</div></a>";
        });
        html += "</section>";
        board.innerHTML = html;
      }
    }
    const box = document.getElementById("board-stats");
    if (box) {
      box.innerHTML = '<section class="board stats-box"><div class="board-h"><b>İstatistik</b></div>' +
        '<div class="stats-grid"><div class="stats-cell">Konu: <b>' + stats.topics + "</b> · Mesaj: <b>" + stats.posts + "</b> · Üye: <b>" + stats.users + "</b></div>" +
        '<div class="stats-cell">Çevrimiçi <span class="online-dot"></span> <b>' + UI.escapeHtml(user.name) + "</b></div></div></section>";
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
      if (title) title.textContent = "Forum yok";
      if (list) list.innerHTML = UI.emptyBox("Forum yok", "", '<a class="btn btn-primary" href="index.html">Forumlar</a>');
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
      list.innerHTML = UI.emptyBox("Konu yok", "", '<a class="btn btn-primary" href="new-topic.html?category=' + encodeURIComponent(cat.id) + '">Yeni konu</a>');
      return;
    }
    var html = '<div class="thread-head"><span>Konu</span><span>Yazan</span><span>Yanıt</span><span>Son mesaj</span></div>';
    for (const t of topics) {
      const replies = Math.max(0, (await DB.posts(t.id)).length - 1);
      const author = await DB.userById(t.authorId);
      html += '<a class="thread-row" href="thread.html?id=' + encodeURIComponent(t.id) + '"><div>' +
        (t.pinned ? '<span class="badge badge-pin">Sabit</span>' : "") +
        (t.locked ? '<span class="badge badge-lock">Kilitli</span>' : "") +
        '<span class="f-title">' + UI.escapeHtml(t.title) + "</span></div>" +
        '<div class="f-last">' + UI.escapeHtml(author ? author.name : "—") + "</div>" +
        '<div class="f-num">' + replies + "</div>" +
        '<div class="f-last">' + UI.fmtTime(t.updatedAt) + "</div></a>";
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
    const note = document.getElementById("login-note");
    if (note && !health.ok) note.innerHTML = '<a href="setup.html">Kurulum</a>';
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
