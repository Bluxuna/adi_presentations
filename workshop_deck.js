(() => {
  const pathParts = location.pathname.replace(/\/+$/, "").split("/");
  const folder = pathParts.at(-1) === "index.html" ? pathParts.at(-2) : pathParts.at(-1);
  const deck = window.WORKSHOPS?.[folder];
  if (!deck) throw new Error(`Workshop content not found for "${folder}".`);

  document.title = deck.title;
  document.querySelector('meta[name="description"]').content = deck.title;
  document.querySelector("main").setAttribute("aria-label", `${deck.title} პრეზენტაცია`);

  const stage = document.querySelector("#stage");
  const notes = document.querySelector("#notes");
  const counter = document.querySelector("#counter");
  const progress = document.querySelector("#progressBar");
  const overview = document.querySelector("#overview");
  const overviewGrid = document.querySelector("#overviewGrid");
  const escapeHtml = (value) =>
    String(value).replace(/[&<>'"]/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char]);
  const params = new URLSearchParams(location.search);
  const requestedSlide = Number(params.get("slide"));
  let index = Number.isInteger(requestedSlide) && requestedSlide > 0
    ? Math.min(deck.slides.length - 1, requestedSlide - 1)
    : 0;
  if (params.has("export")) document.body.classList.add("export-mode");

  function renderVisual(visual) {
    if (!visual) return "";
    if (visual.type === "prompt") {
      return `<div class="workshop-prompt"><span>მაგალითი</span><p>${escapeHtml(visual.text)}</p></div>`;
    }
    if (visual.type === "flow") {
      return `<div class="workshop-flow">${visual.items.map((item, i) =>
        `<article><b>${String(i + 1).padStart(2, "0")}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`
      ).join("")}</div>`;
    }
    if (visual.type === "matrix") {
      return `<div class="workshop-matrix">${visual.items.map((item) =>
        `<article><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`
      ).join("")}</div>`;
    }
    return `<div class="workshop-visual-grid">${visual.items.map((item, i) =>
      `<article><b>${String(i + 1).padStart(2, "0")}</b><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.text)}</p></article>`
    ).join("")}</div>`;
  }

  function renderSlide(slide, slideIndex, total) {
    if (slide.type === "image") {
      return `<article class="slide image-slide"><img src="${escapeHtml(slide.src)}" alt="${escapeHtml(slide.alt)}"><span class="number">${slideIndex + 1} / ${total}</span></article>`;
    }
    return `<article class="slide workshop-slide">
        <span class="number">${slideIndex + 1} / ${total}</span>
        <div class="eyebrow">${escapeHtml(slide.section)}</div>
        <h2>${escapeHtml(slide.title)}</h2>
        <div class="two">
          <div class="workshop-copy">
            <p class="lead">${escapeHtml(slide.lead)}</p>
            <ul class="bullets">${slide.bullets.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
          </div>
          <div class="visual">${renderVisual(slide.visual)}</div>
        </div>
      </article>`;
  }

  function render() {
    const slide = deck.slides[index];
    const total = deck.slides.length;
    stage.innerHTML = renderSlide(slide, index, total);
    counter.textContent = `${index + 1} / ${total}`;
    progress.style.width = `${((index + 1) / total) * 100}%`;
    notes.innerHTML = `<h2>${escapeHtml(slide.title || deck.title)}</h2>
      <h3>ხანგრძლივობა</h3><p>${escapeHtml(slide.duration || "—")}</p>
      <h3>სპიკერის ჩანაწერი</h3><p>${escapeHtml(slide.notes || "")}</p>
      <h3>აქტივობა</h3><p>${escapeHtml(slide.activity || "მოკლე განხილვა და შეკითხვები.")}</p>`;
  }

  let printIndex = 0;
  let printing = false;
  window.addEventListener("beforeprint", () => {
    if (printing) return;
    printing = true;
    printIndex = index;
    stage.innerHTML = deck.slides.map((slide, slideIndex) =>
      renderSlide(slide, slideIndex, deck.slides.length)
    ).join("");
  });
  window.addEventListener("afterprint", () => {
    if (!printing) return;
    printing = false;
    index = printIndex;
    render();
  });

  function goTo(next) {
    index = Math.max(0, Math.min(deck.slides.length - 1, next));
    render();
  }

  function closeOverview() {
    if (overview.open) overview.close();
  }

  deck.slides.forEach((slide, i) => {
    const button = document.createElement("button");
    button.className = "overview-item";
    button.type = "button";
    button.innerHTML = `<span>სლაიდი ${i + 1}</span>${escapeHtml(slide.title || deck.title)}`;
    button.addEventListener("click", () => {
      goTo(i);
      closeOverview();
    });
    overviewGrid.append(button);
  });

  document.querySelector("#prevButton").addEventListener("click", () => goTo(index - 1));
  document.querySelector("#nextButton").addEventListener("click", () => goTo(index + 1));
  document.querySelector("#overviewButton").addEventListener("click", () => overview.showModal());
  document.querySelector("#closeOverview").addEventListener("click", closeOverview);
  document.querySelector("#notesButton").addEventListener("click", () => {
    notes.hidden = !notes.hidden;
  });
  document.querySelector("#fullscreenButton").addEventListener("click", async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.querySelector(".deck-shell").requestFullscreen();
  });
  document.addEventListener("keydown", (event) => {
    if (overview.open || event.target.matches("input, textarea, select")) return;
    if (["ArrowRight", " ", "PageDown"].includes(event.key)) {
      event.preventDefault();
      goTo(index + 1);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "Home") goTo(0);
    else if (event.key === "End") goTo(deck.slides.length - 1);
    else if (event.key.toLowerCase() === "n") notes.hidden = !notes.hidden;
    else if (event.key.toLowerCase() === "f") document.querySelector("#fullscreenButton").click();
  });

  render();
})();
