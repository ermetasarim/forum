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

  function groupOf(name) {
    const map = {
      "Duyurular": "Topluluk", "Genel Sohbet": "Topluluk", "Tanışma": "Topluluk", "Yardım & Destek": "Topluluk",
      "Teknoloji": "Teknoloji", "Yazılım": "Teknoloji", "Donanım": "Teknoloji", "Mobil": "Teknoloji",
      "Oyun": "Kültür", "Spor": "Kültür", "Sinema & Dizi": "Kültür", "Müzik": "Kültür",
      "Eğitim": "Yaşam", "Ekonomi": "Yaşam", "Otomobil": "Yaşam"
    };
    return map[name] || "Forumlar";
  }

  async function renderCategory(user) {
    await mountPublic(user);
    const root = document.getElementById("cat-root") || document.getElementById("thread-list");
    const id = UI.param("id");
    const cat = await DB.categoryById(id);
    if (!cat) {
      root.innerHTML = UI.emptyBox("Forum yok", "", '<a class="btn btn-primary" href="index.html">Forumlar</a>');
      return;
    }
    document.title = cat.name;
    var threads = [];
    var latest = [];
    try { threads = await DB.categoryThreads(cat.id); } catch (e) { UI.toast(e.message, "err"); }
    try { latest = await DB.latestTopics(9); } catch (e) {}
    var pageSize = 12;
    var state = { q: "", prefix: "all", page: 1 };

    function filtered() {
      var rows = threads.slice();
      if (state.prefix === "rehber") rows = rows.filter(function (x) { return x.pinned; });
      if (state.prefix === "cozuldu") rows = rows.filter(function (x) { return x.locked; });
      if (state.prefix === "diger") rows = rows.filter(function (x) { return !x.pinned && !x.locked; });
      if (state.q) {
        const q = state.q.toLowerCase();
        rows = rows.filter(function (x) { return x.title.toLowerCase().indexOf(q) !== -1; });
      }
      return rows;
    }

    function pagerHtml(total) {
      const pages = Math.max(1, Math.ceil(total / pageSize));
      if (state.page > pages) state.page = pages;
      var html = '<div class="pager">';
      var show = [];
      if (pages <= 6) {
        for (var i = 1; i <= pages; i++) show.push(i);
      } else {
        show = [1, 2, 3, "...", pages];
      }
      show.forEach(function (p) {
        if (p === "...") html += '<span class="page-btn dots">…</span>';
        else html += '<button type="button" class="page-btn' + (p === state.page ? " on" : "") + '" data-page="' + p + '">' + p + "</button>";
      });
      if (state.page < pages) html += '<button type="button" class="page-btn" data-page="' + (state.page + 1) + '">Sonraki ▸</button>';
      html += "</div>";
      return html;
    }

    function paint() {
      const rowsAll = filtered();
      const pages = Math.max(1, Math.ceil(rowsAll.length / pageSize));
      const slice = rowsAll.slice((state.page - 1) * pageSize, state.page * pageSize);
      const rehber = threads.filter(function (x) { return x.pinned; }).length;
      const cozuldu = threads.filter(function (x) { return x.locked; }).length;
      const diger = threads.filter(function (x) { return !x.pinned && !x.locked; }).length;
      var html = "";
      html += '<nav class="crumbs">';
      html += '<a href="index.html">Ana sayfa</a> <span>›</span> ';
      html += '<a href="index.html">' + UI.escapeHtml(groupOf(cat.name)) + "</a> <span>›</span> ";
      html += "<span>" + UI.escapeHtml(cat.name) + "</span></nav>";
      html += '<div class="cat-hero">';
      html += "<div><h1 class=\"forum-title\">" + UI.escapeHtml(cat.name) + "</h1>";
      html += '<p class="forum-lead">' + UI.escapeHtml(cat.description || "") + "</p></div>";
      html += '<a class="btn btn-create" href="new-topic.html?category=' + encodeURIComponent(cat.id) + '">✎ Konu oluştur</a>';
      html += "</div>";
      html += '<div class="prefix-bar"><span>Belirli ön ek:</span>';
      html += '<button type="button" class="chip chip-all' + (state.prefix === "all" ? " on" : "") + '" data-prefix="all">Hepsini göster</button>';
      html += '<button type="button" class="chip chip-ok" data-prefix="cozuldu">Çözüldü (' + cozuldu + ")</button>";
      html += '<button type="button" class="chip chip-mid" data-prefix="cozuldu">Çözüm (0)</button>';
      html += '<button type="button" class="chip chip-guide' + (state.prefix === "rehber" ? " on" : "") + '" data-prefix="rehber">Rehber (' + rehber + ")</button>";
      html += '<button type="button" class="chip chip-other' + (state.prefix === "diger" ? " on" : "") + '" data-prefix="diger">Diğer (' + diger + ")</button>";
      html += "</div>";
      html += '<div class="cat-layout">';
      html += '<div class="cat-main">';
      html += pagerHtml(rowsAll.length);
      html += '<section class="topic-card">';
      html += '<div class="topic-tools"><span class="q-ico">?</span><input id="topic-filter" type="search" placeholder="Konu başlığı" /><button type="button" class="filter-link">Filtreler ▾</button></div>';
      if (!slice.length) {
        html += '<div class="empty"><h3>Konu yok</h3></div>';
      } else {
        slice.forEach(function (x) {
          html += '<article class="topic-row">';
          html += '<div class="topic-ava" style="background:' + avatarColor(x.authorName) + '">' + UI.escapeHtml(initial(x.authorName)) + "</div>";
          html += '<div class="topic-main">';
          html += '<a class="topic-title" href="thread.html?id=' + encodeURIComponent(x.id) + '">';
          if (x.pinned) html += '<span class="badge badge-guide">Rehber</span> ';
          html += UI.escapeHtml(x.title) + "</a>";
          html += '<div class="topic-sub">' + UI.escapeHtml(x.authorName) + " · " + UI.fmtTime(x.createdAt) + "</div></div>";
          html += '<div class="topic-nums"><div><span>Mesaj:</span> <b>' + x.replyCount + "</b></div>";
          html += "<div><span>Görüntüleme:</span> <b>" + (x.views || 0).toLocaleString("tr-TR") + "</b></div></div>";
          html += '<div class="topic-last"><div class="last-time">' + UI.fmtTime(x.lastAt) + "</div>";
          html += '<div class="last-user">' + UI.escapeHtml(x.lastName) + "</div></div></article>";
        });
      }
      html += "</section></div>";
      html += '<aside class="side-new"><h3>Yeni konular</h3>';
      latest.forEach(function (x) {
        html += '<a class="new-item" href="thread.html?id=' + encodeURIComponent(x.id) + '">';
        html += '<div class="topic-ava sm" style="background:' + avatarColor(x.authorName) + '">' + UI.escapeHtml(initial(x.authorName)) + "</div>";
        html += "<div><div class=\"new-title\">" + UI.escapeHtml(x.title) + "</div>";
        html += '<div class="new-meta">' + UI.escapeHtml(x.authorName) + " · " + UI.fmtTime(x.updatedAt) + " · Mesaj: " + x.replyCount + "</div>";
        html += '<div class="new-cat">' + UI.escapeHtml(x.categoryName) + "</div></div></a>";
      });
      html += "</aside></div>";
      root.innerHTML = html;
      const input = document.getElementById("topic-filter");
      if (input) {
        input.value = state.q;
        input.addEventListener("keydown", function (ev) {
          if (ev.key === "Enter") { state.q = input.value.trim(); state.page = 1; paint(); }
        });
      }
      root.querySelectorAll("[data-prefix]").forEach(function (btn) {
        btn.addEventListener("click", function () { state.prefix = btn.getAttribute("data-prefix"); state.page = 1; paint(); });
      });
      root.querySelectorAll("[data-page]").forEach(function (btn) {
        btn.addEventListener("click", function () { state.page = parseInt(btn.getAttribute("data-page"), 10); paint(); });
      });
    }
    paint();
  }

  function fmtClock(ts) {
    if (!ts) return "—";
    const d = new Date(ts);
    const now = new Date();
    const hh = String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    const same = d.toDateString() === now.toDateString();
    const yest = new Date(now); yest.setDate(now.getDate() - 1);
    if (same) return "Bugün " + hh;
    if (d.toDateString() === yest.toDateString()) return "Dün " + hh;
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" }) + " " + hh;
  }
  function fmtJoin(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  }
  function rankOf(user) {
    if (!user) return "Üye";
    if (user.role === "admin") return "Yönetici";
    const n = user.messages || 0;
    if (n > 800) return "Kilopat";
    if (n > 200) return "Usta";
    if (n > 40) return "Kıdemli";
    return "Üye";
  }
  function cityOf(name) {
    const list = ["İstanbul", "Ankara", "İzmir", "Bursa", "Antalya", "Eskişehir", "Konya", "Trabzon", "Erbaa", "Samsun"];
    var n = 0;
    String(name || "").split("").forEach(function (ch) { n += ch.charCodeAt(0); });
    return list[n % list.length];
  }
  function formatBody(raw) {
    var text = UI.escapeHtml(raw || "");
    var url = null;
    text = text.replace(/https?:\/\/[^\s<]+/g, function (u) {
      url = u;
      return "";
    });
    text = text.replace(/\n/g, "<br>").trim();
    var html = "<p>" + text + "</p>";
    if (url) {
      var host = url.replace(/^https?:\/\//, "").split("/")[0];
      html += '<a class="link-card" href="' + url + '" target="_blank" rel="noopener">' +
        "<b>" + url.slice(0, 88) + (url.length > 88 ? "…" : "") + "</b>" +
        "<span>" + UI.escapeHtml(host) + "</span></a>";
    }
    return html;
  }

  async function renderThread(user) {
    await mountPublic(user);
    const id = UI.param("id");
    const topic = await DB.topicById(id);
    const wrap = document.getElementById("thread-wrap");
    if (!topic) {
      wrap.innerHTML = UI.emptyBox("Konu yok", "Silinmiş olabilir.", '<a class="btn btn-primary" href="index.html">Ana sayfa</a>');
      return;
    }
    const cat = await DB.categoryById(topic.categoryId);
    document.title = topic.title;
    const crumbCat = document.getElementById("crumb-cat");
    if (crumbCat) {
      crumbCat.textContent = cat ? cat.name : "Forum";
      crumbCat.href = cat ? "category.html?id=" + cat.id : "index.html";
    }
    const titleEl = document.getElementById("thread-title");
    if (titleEl) titleEl.textContent = topic.title;
    const flags = document.getElementById("thread-flags");
    if (flags) flags.innerHTML = (topic.pinned ? '<span class="badge badge-guide">Rehber</span>' : "") + (topic.locked ? '<span class="badge badge-lock">Kilitli</span>' : "");
    const posts = await DB.posts(topic.id);
    const authors = await DB.usersByIds(posts.map(function (p) { return p.authorId; }));
    var html = "";
    for (var i = 0; i < posts.length; i++) {
      const p = posts[i];
      const a = authors[p.authorId] || { name: "Üye", messages: 0 };
      const isOp = p.authorId === topic.authorId;
      html += '<article class="postbit" id="p' + (i + 1) + '">';
      html += '<aside class="pb-user">';
      html += '<div class="pb-ava" style="background:' + avatarColor(a.name) + '">' + UI.escapeHtml(initial(a.name)) + "</div>";
      html += '<div class="pb-name">' + UI.escapeHtml(a.name) + "</div>";
      html += '<div class="pb-rank">' + rankOf(a) + "</div>";
      html += '<div class="pb-icons">⏳</div>';
      html += '<dl class="pb-stats">';
      html += "<div><dt>Katılım:</dt><dd>" + fmtJoin(a.createdAt) + "</dd></div>";
      html += "<div><dt>Mesajlar:</dt><dd>" + (a.messages || 0).toLocaleString("tr-TR") + "</dd></div>";
      html += "<div><dt>Yer:</dt><dd>" + cityOf(a.name) + "</dd></div>";
      html += "</dl></aside>";
      html += '<div class="pb-body">';
      html += '<div class="pb-top"><span>' + fmtClock(p.createdAt) + (isOp && i > 0 ? ' <span class="op-badge">Konu Sahibi</span>' : "") + "</span>";
      html += '<span class="pb-no">#' + (i + 1) + "</span></div>";
      if (i > 0) {
        const prev = posts[i - 1];
        const prevA = authors[prev.authorId] || { name: "Üye" };
        var q = String(prev.body || "");
        if (q.length > 180) q = q.slice(0, 180) + "…";
        html += '<blockquote class="pb-quote"><div class="q-head">' + UI.escapeHtml(prevA.name) + " dedi:</div><p>" + UI.escapeHtml(q) + "</p></blockquote>";
      }
      html += '<div class="pb-content">' + formatBody(p.body) + "</div>";
      html += '<div class="pb-actions"><a href="#reply-box">Cevapla</a></div>';
      html += "</div></article>";
    }
    document.getElementById("posts").innerHTML = html;
    const form = document.getElementById("reply-form");
    const box = document.getElementById("reply-box");
    if (topic.locked) {
      box.innerHTML = '<p class="muted" style="padding:12px">Bu konu kilitli.</p>';
    } else if (form) {
      form.addEventListener("submit", async function (e) {
        e.preventDefault();
        try {
          await DB.addPost({ topicId: topic.id, body: form.body.value, authorId: user.id });
          UI.toast("Yanıt eklendi");
          location.reload();
        } catch (err) {
          UI.toast(err.message, "err");
        }
      });
    }
    const pin = document.getElementById("pin-btn");
    const lock = document.getElementById("lock-btn");
    const del = document.getElementById("del-btn");
    if (pin) pin.addEventListener("click", async function () { await DB.updateTopic(topic.id, { pinned: !topic.pinned }); location.reload(); });
    if (lock) lock.addEventListener("click", async function () { await DB.updateTopic(topic.id, { locked: !topic.locked }); location.reload(); });
    if (del) del.addEventListener("click", async function () {
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
