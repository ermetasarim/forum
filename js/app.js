(function () {
  const UI = window.MeydanUI;
  const DB = window.MeydanDB;

  async function mountPublic(user) {
    const settings = await DB.settings();
    const hold = document.getElementById("site-header");
    if (hold) hold.outerHTML = UI.header(user, settings);
    UI.wireChrome();
  }

  function forumGroups(cats) {
    const groups = [
      { name: "Topluluk", desc: "Duyuru, sohbet, tanışma ve destek.", names: ["Duyurular", "Genel Sohbet", "Tanışma", "Yardım & Destek"] },
      { name: "Teknoloji", desc: "Yazılım, donanım, mobil ve genel teknoloji.", names: ["Teknoloji", "Yazılım", "Donanım", "Mobil"] },
      { name: "Kültür", desc: "Oyun, spor, sinema ve müzik.", names: ["Oyun", "Spor", "Sinema & Dizi", "Müzik"] },
      { name: "Yaşam", desc: "Eğitim, ekonomi ve otomobil.", names: ["Eğitim", "Ekonomi", "Otomobil"] }
    ];
    const used = {};
    const out = groups.map(function (g) {
      const items = g.names.map(function (n) {
        return cats.find(function (c) { return c.name === n; });
      }).filter(Boolean);
      items.forEach(function (c) { used[c.id] = true; });
      return { name: g.name, desc: g.desc, items: items };
    }).filter(function (g) { return g.items.length; });
    const rest = cats.filter(function (c) { return !used[c.id]; });
    if (rest.length) out.push({ name: "Diğer", desc: "", items: rest });
    return out;
  }

  async function renderIndex(user) {
    await mountPublic(user);
    const board = document.getElementById("board");
    if (board) board.innerHTML = '<div class="empty"><p>Yükleniyor…</p></div>';
    const q = UI.param("q");
    var sourceCats = [];
    var extraTopics = [];
    var allTopics = [];
    var authors = {};
    var postCount = {};
    try {
      if (q) {
        const search = await DB.search(q);
        sourceCats = search.categories || [];
        extraTopics = search.topics || [];
      } else {
        const data = await DB.boardIndex();
        sourceCats = data.categories || [];
        allTopics = data.topics || [];
        authors = data.authors || {};
        postCount = data.postCount || {};
      }
    } catch (e) {
      if (board) board.innerHTML = UI.emptyBox("Liste alınamadı", e.message, "");
      return;
    }

    function rowHtml(c) {
      const topics = allTopics.filter(function (t) { return t.category_id === c.id; });
      const last = topics[0] || null;
      var msg = 0;
      topics.forEach(function (t) { msg += postCount[t.id] || 0; });
      var lastHtml = "—";
      if (last) {
        const who = authors[last.author_id] || "";
        lastHtml = (last.pinned ? '<span class="badge badge-guide">Rehber</span> ' : "") +
          '<a class="last-link" href="thread.html?id=' + encodeURIComponent(last.id) + '">' + UI.escapeHtml(last.title) + "</a>" +
          '<div class="last-meta">' + UI.fmtTime(Date.parse(last.updated_at || last.updatedAt)) + (who ? " · " + UI.escapeHtml(who) : "") + "</div>";
      }
      return '<article class="forum-row">' +
        '<div class="f-main"><div class="f-ico">' + UI.escapeHtml((c.icon || "●").slice(0, 3)) + "</div><div>" +
        '<a class="f-title" href="category.html?id=' + encodeURIComponent(c.id) + '">' + UI.escapeHtml(c.name) + "</a>" +
        (c.description ? '<div class="f-desc">' + UI.escapeHtml(c.description) + "</div>" : "") +
        "</div></div>" +
        '<div class="f-counts"><div><span>Konular</span><b>' + topics.length + "</b></div>" +
        "<div><span>Mesajlar</span><b>" + msg + "</b></div></div>" +
        '<div class="f-last">' + lastHtml + "</div></article>";
    }

    if (board) {
      if (!sourceCats.length && !extraTopics.length) {
        board.innerHTML = UI.emptyBox(q ? "Sonuç yok" : "Forum yok", "", '<a class="btn btn-primary" href="admin/categories.html">Forum ekle</a>');
      } else if (q) {
        board.innerHTML = '<section class="node"><div class="node-head"><h2>Arama</h2></div>' + sourceCats.map(rowHtml).join("") + "</section>";
      } else {
        board.innerHTML = forumGroups(sourceCats).map(function (g) {
          return '<section class="node"><div class="node-head"><h2>' + UI.escapeHtml(g.name) + "</h2>" +
            (g.desc ? "<p>" + UI.escapeHtml(g.desc) + "</p>" : "") + "</div>" +
            g.items.map(rowHtml).join("") + "</section>";
        }).join("");
      }
    }
    const box = document.getElementById("board-stats");
    if (box) {
      box.innerHTML = '<section class="node stats-box"><div class="node-head"><h2>İstatistik</h2></div>' +
        '<div class="stats-grid"><div class="stats-cell">Forum: <b>' + sourceCats.length + "</b> · Konu: <b>" + allTopics.length + "</b></div>" +
        '<div class="stats-cell">Çevrimiçi <span class="online-dot"></span> <b>' + UI.escapeHtml(user.name) + "</b></div></div></section>";
    }
  }

  function initial(name) {
    return String(name || "?").trim().charAt(0).toUpperCase();
  }
  function avatarColor(name) {
    const colors = ["#3aa66b", "#4b5563", "#2563eb", "#0f766e", "#b45309", "#7c3aed", "#be123c"];
    var n = 0;
    String(name || "").split("").forEach(function (ch) { n += ch.charCodeAt(0); });
    return colors[n % colors.length];
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
    var threads = [];
    try { threads = await DB.categoryThreads(cat.id); } catch (e) { UI.toast(e.message, "err"); }
    function paint(filter) {
      var rows = threads;
      if (filter) {
        const q = filter.toLowerCase();
        rows = threads.filter(function (x) { return x.title.toLowerCase().indexOf(q) !== -1; });
      }
      if (!rows.length) {
        list.innerHTML = UI.emptyBox("Konu yok", "", '<a class="btn btn-primary" href="new-topic.html?category=' + encodeURIComponent(cat.id) + '">Yeni konu</a>');
        return;
      }
      var html = '<div class="pager"><span class="page-btn on">1</span></div>';
      html += '<section class="topic-card">';
      html += '<div class="topic-tools"><input id="topic-filter" type="search" placeholder="Konu başlığı" /><span class="muted">Filtreler</span></div>';
      rows.forEach(function (x) {
        html += '<article class="topic-row">' +
          '<div class="topic-ava" style="background:' + avatarColor(x.authorName) + '">' + UI.escapeHtml(initial(x.authorName)) + "</div>" +
          '<div class="topic-main">' +
          '<a class="topic-title" href="thread.html?id=' + encodeURIComponent(x.id) + '">' +
          (x.pinned ? '<span class="badge badge-guide">Rehber</span> ' : "") +
          UI.escapeHtml(x.title) + "</a>" +
          '<div class="topic-sub">' + UI.escapeHtml(x.authorName) + " · " + UI.fmtTime(x.createdAt) + "</div>" +
          "</div>" +
          '<div class="topic-nums"><div><span>Mesaj:</span> <b>' + x.replyCount + "</b></div>" +
          "<div><span>Görüntüleme:</span> <b>" + (x.views || 0) + "</b></div></div>" +
          '<div class="topic-last"><div class="last-time">' + UI.fmtTime(x.lastAt) + "</div>" +
          '<div class="last-user">' + UI.escapeHtml(x.lastName) + "</div></div></article>";
      });
      html += "</section>";
      list.innerHTML = html;
      const input = document.getElementById("topic-filter");
      if (input) {
        input.value = filter || "";
        input.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") paint(input.value.trim());
        });
      }
    }
    paint("");
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
