(() => {
  const TG = "https://t.me/quv_market";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // ---------- nav ----------
  const nav = $("#nav");
  const burger = $("#burger");
  const links = $("#navLinks");
  const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 10);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
  burger.addEventListener("click", () => {
    const open = links.classList.toggle("is-open");
    burger.setAttribute("aria-expanded", open);
  });
  $$("a", links).forEach(a => a.addEventListener("click", () => {
    links.classList.remove("is-open");
    burger.setAttribute("aria-expanded", "false");
  }));

  // ---------- catalog: filter & sort ----------
  const grid = $("#products");
  const cards = $$(".card", grid);
  cards.forEach((c, i) => (c.dataset.order = i));

  $$(".tab").forEach(tab => tab.addEventListener("click", () => {
    $$(".tab").forEach(t => { t.classList.remove("is-active"); t.setAttribute("aria-selected", "false"); });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    const f = tab.dataset.filter;
    cards.forEach(c => (c.hidden = f !== "all" && c.dataset.cat !== f));
  }));

  const pop = () => cards.forEach((c, i) => {
    if (c.hidden) return;
    c.classList.add("is-in");
    c.classList.remove("is-pop");
    void c.offsetWidth;
    c.style.animationDelay = `${Math.min(i, 8) * 45}ms`;
    c.classList.add("is-pop");
  });
  $$(".tab").forEach(t => t.addEventListener("click", pop));

  $$(".chip").forEach(chip => chip.addEventListener("click", () => {
    $$(".chip").forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    const mode = chip.dataset.sort;
    const key = c => mode === "default" ? +c.dataset.order : +c.dataset.price;
    const dir = mode === "desc" ? -1 : 1;
    // narxi yo'q mahsulotlar saralashda oxirida turadi
    const priced = c => mode === "default" || !!c.dataset.price;
    [...cards].sort((a, b) => (priced(b) - priced(a)) || (key(a) - key(b)) * dir).forEach(c => grid.appendChild(c));
    pop();
  }));

  // ---------- helpers ----------
  const fmt = n => n ? Number(n).toLocaleString("ru-RU").replace(/ /g, " ") + " so'm" : "narxini so'rang";
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
      return ok;
    }
  };

  // ---------- colour swatches ----------
  $$(".swatches").forEach(group => {
    const img = $(".card__img img", group.closest(".card"));
    $$(".swatch", group).forEach(sw => sw.addEventListener("click", () => {
      $$(".swatch", group).forEach(s => { s.classList.remove("is-active"); s.setAttribute("aria-pressed", "false"); });
      sw.classList.add("is-active");
      sw.setAttribute("aria-pressed", "true");
      img.src = sw.dataset.src;
    }));
  });


  // ---------- sale badges (old price -> % discount) ----------
  cards.forEach(c => {
    const old = $(".price__old", c);
    if (!old || !c.dataset.price) return;
    const was = +old.textContent.replace(/\D/g, "");
    const pct = Math.round((1 - +c.dataset.price / was) * 100);
    if (!was || pct < 1) return;
    const tags = document.createElement("div");
    tags.className = "card__tags";
    tags.innerHTML = `<span class="badge badge--sale">-${pct}%</span>`;
    $(".card__img", c).appendChild(tags);
  });

  // ---------- category tiles ----------
  $$(".cat-tile").forEach(tile => {
    const f = tile.dataset.filter;
    const inCat = cards.filter(c => c.dataset.cat === f);
    const min = Math.min(...inCat.map(c => +c.dataset.price).filter(Boolean));
    $(`[data-count="${f}"]`, tile).textContent = inCat.length;
    $(`[data-min="${f}"]`, tile).textContent = fmt(min).replace(/ so.m$/, " so'mdan");
    tile.addEventListener("click", () => {
      const tab = $(`.tab[data-filter="${f}"]`);
      if (tab) tab.click();
    });
  });

  // ---------- product select in form ----------
  const select = $("#productSelect");
  cards.forEach(c => {
    const name = $("h3", c).textContent.trim();
    const opt = new Option(`${name} — ${fmt(c.dataset.price)}`, name);
    select.add(opt);
  });

  // ---------- order modal ----------
  const modal = $("#modal");
  let lastFocus = null;
  let orderText = "";
  const openModal = card => {
    const name = $("h3", card).textContent.trim();
    const price = fmt(card.dataset.price);
    $("#modalTitle").textContent = name;
    $("#modalPrice").textContent = price;
    orderText = `Assalomu alaykum! Saytingizdan yozyapman.\nMen "${name}" (${price}) ga buyurtma bermoqchiman. Mavjudmi?`;
    lastFocus = document.activeElement;
    modal.hidden = false;
    $("#modalClose").focus();
  };
  const closeModal = () => { modal.hidden = true; lastFocus && lastFocus.focus(); };
  $$(".order").forEach(btn => btn.addEventListener("click", () => openModal(btn.closest(".card"))));
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  $("#modalTg").addEventListener("click", () => { copy(orderText); });

  // ---------- quick form -> Telegram ----------
  const form = $("#orderForm");
  const field = n => form.elements.namedItem(n);
  const msg = $("#formMsg");
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name = field("name").value.trim();
    const phone = field("phone").value.trim();
    field("name").classList.toggle("is-invalid", !name);
    field("phone").classList.toggle("is-invalid", phone.replace(/\D/g, "").length < 9);
    if (!name || phone.replace(/\D/g, "").length < 9) {
      msg.textContent = "Iltimos, ism va telefon raqamini to'g'ri kiriting.";
      msg.classList.add("is-error");
      return;
    }
    const product = field("product").value || "Maslahat kerak";
    const note = field("note").value.trim();
    const text = `Assalomu alaykum! Saytdan ariza.\nIsm: ${name}\nTelefon: ${phone}\nTrenajyor: ${product}` + (note ? `\nIzoh: ${note}` : "");
    const ok = await copy(text);
    msg.classList.remove("is-error");
    msg.textContent = ok
      ? "Xabar nusxalandi! Telegram ochilmoqda — chatga joylashtiring (Paste) va yuboring."
      : "Telegram ochilmoqda — ma'lumotlaringizni yozib yuboring.";
    window.open(TG, "_blank", "noopener");
  });

  // ---------- reveal on scroll ----------
  const targets = $$(".section__head, .feature, .choose__card, .steps li, .faq details, .ccard, .form, .card, .cat-tile, .trust__item, .cta__inner");
  targets.forEach((t, i) => { if (t.matches(".card, .feature, .cat-tile, .trust__item")) t.style.transitionDelay = `${(i % 4) * 70}ms`; });
  if ("IntersectionObserver" in window) {
    targets.forEach(t => t.classList.add("reveal"));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
    }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(t => io.observe(t));
  }


  // ---------- scroll progress ----------
  const bar = $("#progress");
  const onProgress = () => {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    bar.style.transform = `scaleX(${max > 0 ? Math.min(h.scrollTop / max, 1) : 0})`;
  };
  window.addEventListener("scroll", onProgress, { passive: true });
  onProgress();

  // ---------- count-up numbers ----------
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduce) {
    $$("[data-countup]").forEach(el => {
      const end = +el.dataset.countup;
      const t0 = performance.now() + 500;
      const step = now => {
        const p = Math.min(Math.max((now - t0) / 1400, 0), 1);
        el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(step);
      };
      el.textContent = "0";
      requestAnimationFrame(step);
    });
  }

  // ---------- hero parallax ----------
  const media = $(".hero__media");
  if (media && !reduce && window.matchMedia("(hover: hover)").matches) {
    window.addEventListener("mousemove", e => {
      const x = (e.clientX / innerWidth - .5) * 14;
      const y = (e.clientY / innerHeight - .5) * 10;
      media.style.translate = `${x}px ${y}px`;
    }, { passive: true });
  }

  $("#year").textContent = new Date().getFullYear();
})();
