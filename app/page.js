import dashboard from "../fixtures/dashboard.json";
import Script from "next/script";

const stateLabels = {
  loading: "Cargando senales",
  empty: "No hay senales para la ventana seleccionada",
  error: "No se pudo cargar el ranking de senales",
  success: "Ranking de senales cargado",
};

function scoreTone(score) {
  if (score >= 80) {
    return "strong";
  }
  if (score >= 55) {
    return "medium";
  }
  return "low";
}

function duplicateLabel(status) {
  return status === "possible" ? "Posible" : "Unico";
}

function sourceTone(tone) {
  return `source-badge source-${tone}`;
}

function sparklinePoints(values) {
  const width = 118;
  const height = 28;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const spread = max - min || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / spread) * 18 - 5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function renderTableBody(viewState) {
  if (viewState === "loading") {
    return Array.from({ length: 5 }, (_, index) => (
      <tr className="skeleton-row" key={`loading-${index}`}>
        <td colSpan="8">
          <span className="skeleton-line" />
        </td>
      </tr>
    ));
  }

  if (viewState === "empty") {
    return (
      <tr>
        <td className="state-cell" colSpan="8">
          <strong>No hay senales todavia</strong>
          <span>Conecta una API real o cambia a un fixture con senales declaradas.</span>
        </td>
      </tr>
    );
  }

  if (viewState === "error") {
    return (
      <tr>
        <td className="state-cell state-cell-error" colSpan="8">
          <strong>Error al cargar el ranking</strong>
          <span>El estado de error esta declarado para QA visual. Reintenta o revisa la fuente de datos.</span>
        </td>
      </tr>
    );
  }

  return dashboard.signals.map((signal) => (
    <tr
      key={signal.slug}
      data-row
      data-title={signal.title.toLowerCase()}
      data-category={signal.category}
      data-topic={signal.topic}
      data-confidence={signal.confidence_score}
      data-impact={signal.impact_score}
      data-duplicate={signal.duplicate_status}
      data-sources={signal.sources.map((source) => source.name.toLowerCase()).join(" ")}
    >
      <td data-label="#" className="rank-cell">
        {signal.rank}
      </td>
      <td data-label="Senal" className="signal-cell">
        <strong>{signal.title}</strong>
        <span>{signal.category}</span>
      </td>
      <td data-label="Impacto" className="impact-cell">
        <strong className={`impact-score impact-${scoreTone(signal.impact_score)}`}>
          {signal.impact_score}
        </strong>
        <span>{signal.impact_label}</span>
      </td>
      <td data-label="Confianza" className="confidence-cell">
        <span className={`confidence-value confidence-${signal.confidence_level}`}>
          {signal.confidence_score}%
        </span>
        <span className="meter" aria-hidden="true">
          <span style={{ width: `${signal.confidence_score}%` }} />
        </span>
      </td>
      <td data-label="Recencia" className="recency-cell">
        <strong>{signal.recency_label}</strong>
        <span>{signal.observed_at}</span>
      </td>
      <td data-label="Fuentes" className="sources-cell">
        <span className="source-stack" aria-label={`Fuentes: ${signal.sources.map((source) => source.name).join(", ")}`}>
          {signal.sources.map((source) => (
            <span className={sourceTone(source.tone)} title={source.name} key={`${signal.slug}-${source.label}`}>
              {source.label}
            </span>
          ))}
          <span className="source-more">+{signal.additional_sources}</span>
        </span>
      </td>
      <td data-label="Duplicados" className="duplicate-cell">
        <span className={`duplicate duplicate-${signal.duplicate_status}`}>
          {duplicateLabel(signal.duplicate_status)}
        </span>
      </td>
      <td data-label="Acciones" className="actions-cell">
        <button
          className="secondary-button evidence-button"
          type="button"
          data-evidence-button
          data-slug={signal.slug}
        >
          <span className="button-icon evidence-icon" aria-hidden="true" />
          <span>Ver evidencia</span>
        </button>
        <button className="icon-button dots-button" type="button" aria-label={`Mas acciones para ${signal.title}`}>
          <span className="dots-icon" aria-hidden="true" />
        </button>
      </td>
    </tr>
  ));
}

export default async function DashboardPage({ searchParams }) {
  const params = await searchParams;
  const requestedState = typeof params?.state === "string" ? params.state : "success";
  const viewState = Object.hasOwn(stateLabels, requestedState) ? requestedState : "success";
  const isInteractive = viewState === "success";
  const serializedDashboard = JSON.stringify(dashboard).replaceAll("<", "\\u003c");

  return (
    <>
      <header className="app-header">
        <a className="brand" href="/" aria-label="AI Radar inicio">
          AI Radar
        </a>
        <div className="title-block">
          <h1>Ranking de senales</h1>
          <p>Senales detectadas y puntuadas por relevancia e impacto</p>
        </div>
        <nav className="mode-switch" aria-label="Modo de vista">
          <button className="mode-button" type="button" data-mode-button="reader">
            <span className="button-icon reader-icon" aria-hidden="true" />
            <span>Modo lector</span>
          </button>
          <button className="mode-button is-active" type="button" data-mode-button="operator" aria-pressed="true">
            <span className="button-icon operator-icon" aria-hidden="true" />
            <span>Modo operador</span>
          </button>
        </nav>
        <div className="header-actions">
          <p className="updated-at">Actualizado: {dashboard.updated_label}</p>
          <button className="secondary-button snapshot-button" type="button" data-snapshot-button>
            <span className="button-icon snapshot-icon" aria-hidden="true" />
            <span>Snapshot</span>
          </button>
          <button className="icon-button alert-button" type="button" data-alert-button aria-label="Ver 12 alertas">
            <span className="button-icon alert-icon" aria-hidden="true" />
            <span className="alert-count">12</span>
          </button>
          <button className="profile-button" type="button" aria-label="Abrir menu de usuario">
            OP
          </button>
        </div>
      </header>

      <main className="dashboard-shell" data-dashboard-state={viewState}>
        <section className="filters-panel" aria-label="Filtros del ranking">
          <label className="search-field">
            <span className="sr-only">Buscar senales</span>
            <input
              type="search"
              placeholder="Buscar senales..."
              data-search-input
              disabled={!isInteractive}
            />
          </label>
          <label className="select-field">
            <span className="control-icon calendar-icon" aria-hidden="true" />
            <span className="control-label">Fecha</span>
            <select data-window-filter disabled={!isInteractive} defaultValue="7d">
              <option value="7d">Ultimos 7 dias</option>
              <option value="24h">Ultimas 24 horas</option>
              <option value="30d">Ultimos 30 dias</option>
            </select>
          </label>
          <label className="select-field">
            <span className="control-icon source-icon" aria-hidden="true" />
            <span className="control-label">Fuente</span>
            <select data-source-filter disabled={!isInteractive} defaultValue="all">
              <option value="all">Todas las fuentes</option>
              {dashboard.source_health.map((source) => (
                <option value={source.name.toLowerCase()} key={source.name}>
                  {source.name}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field">
            <span className="control-icon topic-icon" aria-hidden="true" />
            <span className="control-label">Tema</span>
            <select data-topic-filter disabled={!isInteractive} defaultValue="all">
              <option value="all">Todos los temas</option>
              {[...new Set(dashboard.signals.map((signal) => signal.topic))].map((topic) => (
                <option value={topic} key={topic}>
                  {topic}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field compact-filter">
            <span className="control-icon type-icon" aria-hidden="true" />
            <span className="control-label">Tipo</span>
            <select data-category-filter disabled={!isInteractive} defaultValue="all">
              <option value="all">Todos los tipos</option>
              {[...new Set(dashboard.signals.map((signal) => signal.category))].map((category) => (
                <option value={category} key={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label className="select-field compact-filter">
            <span className="control-icon confidence-icon" aria-hidden="true" />
            <span className="control-label">Confianza min.</span>
            <select data-confidence-filter disabled={!isInteractive} defaultValue="0">
              <option value="0">Cualquiera</option>
              <option value="50">50%</option>
              <option value="70">70%</option>
              <option value="85">85%</option>
            </select>
          </label>
          <label className="select-field compact-filter">
            <span className="control-icon impact-icon" aria-hidden="true" />
            <span className="control-label">Impacto min.</span>
            <select data-impact-filter disabled={!isInteractive} defaultValue="0">
              <option value="0">Cualquiera</option>
              <option value="50">50</option>
              <option value="70">70</option>
              <option value="85">85</option>
            </select>
          </label>
          <label className="toggle-field">
            <span>Duplicados</span>
            <input type="checkbox" data-duplicates-filter disabled={!isInteractive} />
          </label>
          <button className="secondary-button filters-button" type="button" data-reset-filters disabled={!isInteractive}>
            <span className="button-icon filter-icon" aria-hidden="true" />
            <span>Limpiar</span>
          </button>
        </section>

        <section className="ranking-section" aria-labelledby="ranking-title">
          <div className="section-heading">
            <h2 id="ranking-title" className="sr-only">
              Ranking de senales
            </h2>
            <p role="status" aria-live="polite" data-live-status>
              {stateLabels[viewState]}
            </p>
          </div>

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">Senal</th>
                  <th scope="col">Impacto</th>
                  <th scope="col">Confianza</th>
                  <th scope="col">Recencia</th>
                  <th scope="col">Fuentes</th>
                  <th scope="col">Duplicados</th>
                  <th scope="col">Acciones</th>
                </tr>
              </thead>
              <tbody data-table-body>{renderTableBody(viewState)}</tbody>
            </table>
          </div>

          <div className="table-footer">
            <p data-count-label>
              1-{dashboard.page_size} de {dashboard.total_signals} senales
            </p>
            <nav className="pagination" aria-label="Paginacion">
              <button type="button" className="page-arrow" aria-label="Pagina anterior" disabled>
                {"<"}
              </button>
              {[1, 2, 3, 4, 5].map((page) => (
                <button
                  type="button"
                  className={page === 1 ? "page-button is-active" : "page-button"}
                  aria-current={page === 1 ? "page" : undefined}
                  key={page}
                >
                  {page}
                </button>
              ))}
              <span className="page-gap">...</span>
              <button type="button" className="page-button">
                13
              </button>
              <button type="button" className="page-arrow" aria-label="Pagina siguiente">
                {">"}
              </button>
            </nav>
            <label className="page-size">
              <span className="sr-only">Senales por pagina</span>
              <select defaultValue="10">
                <option value="10">10 por pagina</option>
                <option value="25">25 por pagina</option>
              </select>
            </label>
          </div>
        </section>

        <section className="sources-section" aria-labelledby="sources-title">
          <div className="sources-heading">
            <div>
              <h2 id="sources-title">Fuentes</h2>
              <p>Salud y cobertura en tiempo real</p>
            </div>
            <a href="#ranking-title">Ver todas las fuentes -&gt;</a>
          </div>
          <div className="sources-grid">
            {dashboard.source_health.map((source) => (
              <article className="source-card" key={source.name}>
                <div className="source-card-header">
                  <span className={sourceTone(source.tone)}>{source.label}</span>
                  <h3>{source.name}</h3>
                </div>
                <div className="source-metric">
                  <strong>{source.score}</strong>
                  <span>/ 100</span>
                </div>
                <svg className="sparkline" viewBox="0 0 118 28" role="img" aria-label={`Tendencia de ${source.name}`}>
                  <polyline points={sparklinePoints(source.trend)} />
                </svg>
                <span className="source-lag">{source.lag_label}</span>
              </article>
            ))}
            <article className="source-card source-card-summary">
              <h3>+{dashboard.summary.extra_sources} fuentes</h3>
              <p>Ver todas</p>
              <svg className="sparkline" viewBox="0 0 118 28" aria-hidden="true">
                <polyline points="0,19 12,17 24,18 36,16 48,17 60,15 72,16 84,17 96,16 108,18 118,17" />
              </svg>
              <strong>{dashboard.summary.extra_sources_score}/100</strong>
            </article>
          </div>
        </section>
      </main>

      <dialog className="evidence-dialog" data-evidence-dialog>
        <form method="dialog">
          <div className="dialog-heading">
            <h2 data-dialog-title>Evidencia</h2>
            <button className="icon-button" type="submit" aria-label="Cerrar evidencia">
              x
            </button>
          </div>
          <dl>
            <dt>Fuente de datos</dt>
            <dd>{dashboard.source.type}: {dashboard.source.description}</dd>
            <dt>Evidencia</dt>
            <dd data-dialog-evidence />
            <dt>Accion sugerida</dt>
            <dd data-dialog-action />
          </dl>
        </form>
      </dialog>

      <template
        id="dashboard-data"
        dangerouslySetInnerHTML={{ __html: serializedDashboard }}
      />
      <Script src="/dashboard.js" strategy="afterInteractive" />
    </>
  );
}
