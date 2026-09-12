(function () {
  const cfg = window.MEYDAN_CONFIG;
  if (!window.supabase || !cfg.supabaseUrl || !cfg.supabaseAnonKey) {
    console.error("Supabase yuklenemedi.");
    return;
  }
  const sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  function fail(error) {
    if (!error) return;
    const err = new Error(error.message || "Supabase hatasi");
    err.code = error.code;
    throw err;
  }
  function isMissingTable(error) {
    if (!error) return false;
    const msg = String(error.message || "");
    return error.code === "PGRST205" || msg.includes("schema cache") || msg.includes("does not exist");
  }
  const api = {
    client: sb,
    async health() {
      const res = await sb.from("categories").select("id").limit(1);
      if (isMissingTable(res.error)) return { ok: false, reason: "missing_tables", error: res.error };
      if (res.error) return { ok: false, reason: "query", error: res.error };
      return { ok: true };
    },
    async settings() {
      const res = await sb.from("settings").select("*").eq("id", 1).maybeSingle();
      if (res.error || !res.data) {
        return { siteName: "Meydan", tagline: "Fikirlerin bulustugu yer", registration: "closed", maintenance: false, welcome: "Kayit kapali." };
      }
      return {
        siteName: res.data.site_name || "Meydan",
        tagline: res.data.tagline || "Fikirlerin bulustugu yer",
        registration: res.data.registration || "closed",
        maintenance: !!res.data.maintenance,
        welcome: res.data.welcome || ""
      };
    },
    async saveSettings(patch) {
      const row = { id: 1, site_name: patch.siteName, tagline: patch.tagline, registration: "closed", maintenance: !!patch.maintenance, welcome: patch.welcome };
      const res = await sb.from("settings").upsert(row);
      fail(res.error);
      return this.settings();
    },
    async users(limit) {
      var q = sb.from("profiles").select("*").order("created_at", { ascending: false });
      if (limit) q = q.limit(limit);
      const res = await q;
      if (res.error) return [];
      return (res.data || []).map(function (u) {
        return { id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, status: u.status, messages: u.messages || 0, createdAt: u.created_at ? Date.parse(u.created_at) : Date.now() };
      });
    },
    async boardIndex() {
      const cats = await sb.from("categories").select("*").order("sort_order", { ascending: true });
      fail(cats.error);
      return { categories: cats.data || [], topics: [], authors: {}, postCount: {} };
    },
    async usersByIds(ids) {
      var uniq = [];
      (ids || []).forEach(function (id) { if (id && uniq.indexOf(id) === -1) uniq.push(id); });
      if (!uniq.length) return {};
      const res = await sb.from("profiles").select("*").in("id", uniq);
      var map = {};
      (res.data || []).forEach(function (u) {
        map[u.id] = { id: u.id, name: u.name, username: u.username, email: u.email, role: u.role, status: u.status, messages: u.messages || 0, createdAt: u.created_at ? Date.parse(u.created_at) : 0 };
      });
      return map;
    },
    async userById(id) {
      if (!id) return null;
      const res = await sb.from("profiles").select("*").eq("id", id).maybeSingle();
      if (res.error || !res.data) return null;
      return { id: res.data.id, name: res.data.name, username: res.data.username, email: res.data.email, role: res.data.role, status: res.data.status, messages: res.data.messages || 0, createdAt: res.data.created_at ? Date.parse(res.data.created_at) : 0 };
    },
    async ensureProfile(user) {
      if (!user) return;
      const res = await sb.from("profiles").upsert({ id: user.id, name: user.name || "Erdem", username: "erdem", email: user.email, role: "admin", status: "active" });
      if (res.error && !isMissingTable(res.error)) console.warn("profile upsert", res.error);
    },
    async categories() {
      const res = await sb.from("categories").select("*").order("sort_order", { ascending: true });
      fail(res.error);
      return (res.data || []).map(function (c) {
        return { id: c.id, name: c.name, description: c.description || "", icon: c.icon || "📁", visibility: c.visibility, writePerm: c.write_perm, sortOrder: c.sort_order };
      });
    },
    async categoryById(id) {
      const res = await sb.from("categories").select("*").eq("id", id).maybeSingle();
      fail(res.error);
      if (!res.data) return null;
      return { id: res.data.id, name: res.data.name, description: res.data.description || "", icon: res.data.icon || "📁", visibility: res.data.visibility, writePerm: res.data.write_perm };
    },
    async addCategory(payload) {
      const res = await sb.from("categories").insert({
        name: String(payload.name || "").trim(),
        description: String(payload.description || "").trim(),
        icon: payload.icon || "📁",
        visibility: payload.visibility || "Herkes",
        write_perm: payload.writePerm || "Yöneticiler"
      }).select().single();
      fail(res.error);
      return res.data;
    },
    async deleteCategory(id) {
      const res = await sb.from("categories").delete().eq("id", id);
      fail(res.error);
    },
    async topics(categoryId) {
      var q = sb.from("topics").select("*");
      if (categoryId) q = q.eq("category_id", categoryId);
      const res = await q.order("pinned", { ascending: false }).order("updated_at", { ascending: false });
      fail(res.error);
      return (res.data || []).map(function (t) {
        return { id: t.id, categoryId: t.category_id, title: t.title, authorId: t.author_id, pinned: t.pinned, locked: t.locked, views: t.views || 0, replyCount: t.reply_count || 0, lastPoster: t.last_poster || "", createdAt: Date.parse(t.created_at), updatedAt: Date.parse(t.updated_at) };
      });
    },
    async topicById(id) {
      const res = await sb.from("topics").select("*").eq("id", id).maybeSingle();
      fail(res.error);
      if (!res.data) return null;
      return { id: res.data.id, categoryId: res.data.category_id, title: res.data.title, authorId: res.data.author_id, pinned: res.data.pinned, locked: res.data.locked, createdAt: Date.parse(res.data.created_at), updatedAt: Date.parse(res.data.updated_at) };
    },
    async latestTopics(limit) {
      const res = await sb.from("topics").select("id,title,category_id,author_id,updated_at,reply_count,last_poster").order("updated_at", { ascending: false }).limit(limit || 10);
      if (res.error) return [];
      const cats = await sb.from("categories").select("id,name");
      var cmap = {};
      (cats.data || []).forEach(function (c) { cmap[c.id] = c.name; });
      var ids = [];
      (res.data || []).forEach(function (x) { if (x.author_id && ids.indexOf(x.author_id) === -1) ids.push(x.author_id); });
      var names = {};
      if (ids.length) {
        const prof = await sb.from("profiles").select("id,name,username").in("id", ids);
        (prof.data || []).forEach(function (u) { names[u.id] = u.name || u.username; });
      }
      return (res.data || []).map(function (x) {
        return {
          id: x.id,
          title: x.title,
          categoryId: x.category_id,
          categoryName: cmap[x.category_id] || "",
          authorName: names[x.author_id] || x.last_poster || "—",
          updatedAt: Date.parse(x.updated_at),
          replyCount: x.reply_count || 0
        };
      });
    },
    async categoryThreads(categoryId, page, pageSize) {
      page = page || 1;
      pageSize = pageSize || 12;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const res = await sb.from("topics").select("*", { count: "exact" })
        .eq("category_id", categoryId)
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .range(from, to);
      fail(res.error);
      const rows = res.data || [];
      const authors = await this.usersByIds(rows.map(function (x) { return x.author_id; }));
      return {
        total: res.count || 0,
        rows: rows.map(function (x) {
          const a = authors[x.author_id];
          return {
            id: x.id,
            title: x.title,
            pinned: x.pinned,
            locked: x.locked,
            views: x.views || 0,
            createdAt: Date.parse(x.created_at),
            authorId: x.author_id,
            authorName: a ? a.name : (x.last_poster || "—"),
            replyCount: x.reply_count || 0,
            lastName: x.last_poster || (a ? a.name : "—"),
            lastAt: Date.parse(x.updated_at)
          };
        })
      };
    },
    async topicCounts(categoryId) {
      const list = await this.topics(categoryId);
      return list.length;
    },
    async lastTopicActivity(categoryId) {
      const list = await this.topics(categoryId);
      return list[0] || null;
    },
    async addTopic(opts) {
      if (!opts.title || !opts.title.trim()) throw new Error("Baslik gerekli.");
      if (!opts.body || !opts.body.trim()) throw new Error("Ilk mesaj gerekli.");
      const tres = await sb.from("topics").insert({ category_id: opts.categoryId, author_id: opts.authorId, title: opts.title.trim() }).select().single();
      fail(tres.error);
      const pres = await sb.from("posts").insert({ topic_id: tres.data.id, author_id: opts.authorId, body: opts.body.trim() });
      fail(pres.error);
      await this._bumpMessages(opts.authorId);
      return { id: tres.data.id };
    },
    async updateTopic(id, patch) {
      const row = { updated_at: new Date().toISOString() };
      if ("pinned" in patch) row.pinned = patch.pinned;
      if ("locked" in patch) row.locked = patch.locked;
      const res = await sb.from("topics").update(row).eq("id", id);
      fail(res.error);
    },
    async deleteTopic(id) {
      const res = await sb.from("topics").delete().eq("id", id);
      fail(res.error);
    },
    async posts(topicId, page, pageSize) {
      page = page || 1;
      pageSize = pageSize || 20;
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const res = await sb.from("posts").select("*", { count: "exact" }).eq("topic_id", topicId).order("created_at", { ascending: true }).range(from, to);
      fail(res.error);
      return {
        total: res.count || 0,
        rows: (res.data || []).map(function (p) {
          return { id: p.id, topicId: p.topic_id, authorId: p.author_id, body: p.body, createdAt: Date.parse(p.created_at) };
        })
      };
    },
    async addPost(opts) {
      const topic = await this.topicById(opts.topicId);
      if (!topic) throw new Error("Konu yok.");
      if (topic.locked) throw new Error("Konu kilitli.");
      if (!opts.body || !opts.body.trim()) throw new Error("Mesaj bos olamaz.");
      const res = await sb.from("posts").insert({ topic_id: opts.topicId, author_id: opts.authorId, body: opts.body.trim() });
      fail(res.error);
      await sb.from("topics").update({ updated_at: new Date().toISOString() }).eq("id", opts.topicId);
      await this._bumpMessages(opts.authorId);
    },
    async _bumpMessages(authorId) {
      if (!authorId) return;
      const res = await sb.from("profiles").select("messages").eq("id", authorId).maybeSingle();
      const next = ((res.data && res.data.messages) || 0) + 1;
      await sb.from("profiles").update({ messages: next }).eq("id", authorId);
    },
    async reports() {
      const res = await sb.from("reports").select("*").order("created_at", { ascending: false });
      if (res.error) return [];
      return (res.data || []).map(function (r) {
        return { id: r.id, targetType: r.target_type, targetId: r.target_id, reason: r.reason, priority: r.priority, status: r.status, createdAt: Date.parse(r.created_at) };
      });
    },
    async resolveReport(id, status) {
      const res = await sb.from("reports").update({ status: status }).eq("id", id);
      fail(res.error);
    },
    async stats() {
      const cats = await sb.from("categories").select("id,topic_count,post_count");
      var topicN = 0, postN = 0;
      (cats.data || []).forEach(function (c) {
        topicN += c.topic_count || 0;
        postN += c.post_count || 0;
      });
      var userCount = 1, lastMember = null;
      try {
        const users = await sb.from("profiles").select("id", { count: "exact", head: true }).limit(1);
        if (!users.error) userCount = users.count || 1;
        const last = await sb.from("profiles").select("name,username").order("created_at", { ascending: false }).limit(1);
        if (last.data && last.data[0]) lastMember = last.data[0].name || last.data[0].username;
      } catch (e) {}
      return { users: userCount, topics: topicN, posts: postN, categories: (cats.data || []).length, lastMember: lastMember, openReports: 0, online: 1 };
    },
    async search(q) {
      const query = String(q || "").trim();
      if (!query) return { topics: [], categories: [] };
      const cats = await sb.from("categories").select("*").ilike("name", "%" + query + "%");
      const topics = await sb.from("topics").select("*").ilike("title", "%" + query + "%");
      return {
        categories: (cats.data || []).map(function (c) { return { id: c.id, name: c.name, description: c.description || "", icon: c.icon || "📁" }; }),
        topics: (topics.data || []).map(function (t) { return { id: t.id, title: t.title, updatedAt: Date.parse(t.updated_at) }; })
      };
    },
    async resetContent() {
      await sb.from("reports").delete().neq("status", "__never__");
      await sb.from("posts").delete().neq("body", "__never__");
      await sb.from("topics").delete().neq("title", "__never__");
      await sb.from("categories").delete().neq("name", "__never__");
    }
  };
  window.MeydanDB = api;
})();
