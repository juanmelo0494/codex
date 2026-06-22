(() => {
  const dataScript = document.querySelector("#dashboard-data");
  const dashboard = dataScript ? JSON.parse(dataScript.value || dataScript.textContent) : null;
  const liveStatus = document.querySelector("[data-live-status]");
  const rows = [...document.querySelectorAll("[data-row]")];
  const countLabel = document.querySelector("[data-count-label]");
  const searchInput = document.querySelector("[data-search-input]");
  const sourceFilter = document.querySelector("[data-source-filter]");
  const topicFilter = document.querySelector("[data-topic-filter]");
  const categoryFilter = document.querySelector("[data-category-filter]");
  const confidenceFilter = document.querySelector("[data-confidence-filter]");
  const impactFilter = document.querySelector("[data-impact-filter]");
  const duplicatesFilter = document.querySelector("[data-duplicates-filter]");
  const resetButton = document.querySelector("[data-reset-filters]");
  const snapshotButton = document.querySelector("[data-snapshot-button]");
  const alertButton = document.querySelector("[data-alert-button]");
  const dialog = document.querySelector("[data-evidence-dialog]");

  if (!dashboard || rows.length === 0) {
    return;
  }

  const tableBody = document.querySelector("[data-table-body]");
  const noResultsRow = document.querySelector("[data-no-results-row]");

  function normalize(value) {
    return value.trim().toLowerCase();
  }

  function updateStatus(message) {
    if (liveStatus) {
      liveStatus.textContent = message;
    }
  }

  function applyFilters() {
    const query = normalize(searchInput.value);
    const source = sourceFilter.value;
    const topic = topicFilter.value;
    const category = categoryFilter.value;
    const confidence = Number(confidenceFilter.value);
    const impact = Number(impactFilter.value);
    const onlyDuplicates = duplicatesFilter.checked;
    let visible = 0;

    for (const row of rows) {
      const matchesQuery =
        !query ||
        row.dataset.title.includes(query) ||
        row.dataset.topic.includes(query) ||
        row.dataset.sources.includes(query);
      const matchesSource = source === "all" || row.dataset.sources.includes(source);
      const matchesTopic = topic === "all" || row.dataset.topic === topic;
      const matchesCategory = category === "all" || row.dataset.category === category;
      const matchesConfidence = Number(row.dataset.confidence) >= confidence;
      const matchesImpact = Number(row.dataset.impact) >= impact;
      const matchesDuplicate = !onlyDuplicates || row.dataset.duplicate === "possible";
      const isVisible =
        matchesQuery &&
        matchesSource &&
        matchesTopic &&
        matchesCategory &&
        matchesConfidence &&
        matchesImpact &&
        matchesDuplicate;

      row.hidden = !isVisible;
      if (isVisible) {
        visible += 1;
      }
    }

    noResultsRow.classList.toggle("is-visible", visible === 0);
    countLabel.textContent =
      visible === 0
        ? `0 de ${dashboard.total_signals} senales`
        : `1-${visible} de ${dashboard.total_signals} senales`;
    updateStatus(
      visible === 0
        ? "No hay resultados para los filtros activos"
        : `${visible} senales visibles con los filtros activos`,
    );
  }

  function resetFilters() {
    searchInput.value = "";
    sourceFilter.value = "all";
    topicFilter.value = "all";
    categoryFilter.value = "all";
    confidenceFilter.value = "0";
    impactFilter.value = "0";
    duplicatesFilter.checked = false;
    applyFilters();
    searchInput.focus();
  }

  function signalBySlug(slug) {
    return dashboard.signals.find((signal) => signal.slug === slug);
  }

  function openEvidence(slug) {
    const signal = signalBySlug(slug);
    if (!signal || !dialog) {
      return;
    }

    dialog.querySelector("[data-dialog-title]").textContent = signal.title;
    dialog.querySelector("[data-dialog-evidence]").textContent = signal.evidence;
    dialog.querySelector("[data-dialog-action]").textContent = signal.action;
    dialog.showModal();
  }

  function downloadSnapshot() {
    const payload = {
      contract: dashboard.contract,
      generated_at: new Date().toISOString(),
      source: dashboard.source,
      visible_signals: rows
        .filter((row) => !row.hidden)
        .map((row) => signalBySlug(row.querySelector("[data-evidence-button]").dataset.slug)),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "ai-radar-dashboard-snapshot.json";
    link.click();
    URL.revokeObjectURL(link.href);
    updateStatus("Snapshot descargado con las senales visibles");
  }

  for (const control of [
    searchInput,
    sourceFilter,
    topicFilter,
    categoryFilter,
    confidenceFilter,
    impactFilter,
    duplicatesFilter,
  ]) {
    control.addEventListener("input", applyFilters);
    control.addEventListener("change", applyFilters);
  }

  resetButton.addEventListener("click", resetFilters);
  snapshotButton.addEventListener("click", downloadSnapshot);
  alertButton.addEventListener("click", () => {
    updateStatus("Hay 12 alertas pendientes de revision operativa");
  });

  for (const button of document.querySelectorAll("[data-evidence-button]")) {
    button.addEventListener("click", () => openEvidence(button.dataset.slug));
  }

  for (const button of document.querySelectorAll("[data-mode-button]")) {
    button.addEventListener("click", () => {
      for (const peer of document.querySelectorAll("[data-mode-button]")) {
        peer.classList.toggle("is-active", peer === button);
        peer.setAttribute("aria-pressed", String(peer === button));
      }
      updateStatus(`Vista cambiada a ${button.textContent.trim()}`);
    });
  }

  document.documentElement.dataset.dashboardReady = "true";
})();
