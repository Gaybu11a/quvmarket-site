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
    opt.dataset.price = c.dataset.price || "";
    select.add(opt);
  });

  // ---------- order message (Telegram) ----------
  const dots = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const today = () => {
    const d = new Date();
    return [d.getDate(), d.getMonth() + 1].map(x => String(x).padStart(2, "0")).join(".") + "." + d.getFullYear();
  };
  const buildMessage = ({ name, phone, address, product, price, note }) =>
    `📅 ${today()}\n👤 ${name}\n📞 ${phone}\n📍 ${address}\n🛒 ${product}\n💰 ${price ? dots(price) : "narxini so'rang"}` +
    (note ? `\n📝 ${note}` : "");
  const validPhone = v => v.replace(/\D/g, "").length >= 9;

  // Telegram chatni tayyor matn bilan ochadi; foydalanuvchi faqat "Yuborish"ni bosadi
  const sendToTelegram = text => {
    const url = `${TG}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener");
    return copy(text);
  };

  const wireOrderForm = (formEl, msgEl, getOrder) => {
    const f = n => formEl.elements.namedItem(n);
    formEl.addEventListener("submit", e => {
      e.preventDefault();
      const name = f("name").value.trim();
      const phone = f("phone").value.trim();
      const address = f("address").value.trim();
      f("name").classList.toggle("is-invalid", !name);
      f("phone").classList.toggle("is-invalid", !validPhone(phone));
      f("address").classList.toggle("is-invalid", !address);
      if (!name || !validPhone(phone) || !address) {
        msgEl.textContent = "Iltimos, ism, telefon raqami va manzilni to'ldiring.";
        msgEl.classList.add("is-error");
        return;
      }
      const order = getOrder();
      const text = buildMessage({ name, phone, address, ...order });
      msgEl.classList.remove("is-error");
      msgEl.textContent = "Telegram ochilmoqda — xabar tayyor, faqat \"Yuborish\" tugmasini bosing. (Xabar nusxalandi ham.)";
      sendToTelegram(text);
    });
  };

  // ---------- order modal ----------
  const modal = $("#modal");
  const modalForm = $("#modalForm");
  const modalMsg = $("#modalMsg");
  let lastFocus = null;
  let current = { product: "", price: "" };
  const openModal = card => {
    current = { product: $("h3", card).textContent.trim(), price: card.dataset.price || "" };
    $("#modalTitle").textContent = current.product;
    $("#modalPrice").textContent = fmt(current.price);
    modalMsg.textContent = "";
    modalMsg.classList.remove("is-error");
    lastFocus = document.activeElement;
    modal.hidden = false;
    $("input[name=name]", modalForm).focus();
  };
  const closeModal = () => { modal.hidden = true; lastFocus && lastFocus.focus(); };
  $$(".order").forEach(btn => btn.addEventListener("click", () => openModal(btn.closest(".card"))));
  $("#modalClose").addEventListener("click", closeModal);
  modal.addEventListener("click", e => { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeModal(); });
  wireOrderForm(modalForm, modalMsg, () => ({ product: current.product, price: current.price }));

  // ---------- quick form (contact section) ----------
  const form = $("#orderForm");
  wireOrderForm(form, $("#formMsg"), () => {
    const opt = select.selectedOptions[0];
    const note = form.elements.namedItem("note").value.trim();
    return {
      product: select.value || "Maslahat kerak",
      price: opt && opt.dataset.price ? opt.dataset.price : "",
      note
    };
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
