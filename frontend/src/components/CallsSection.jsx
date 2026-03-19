import { formatTimeUtcPlus3, statusLabels } from "../dashboardUtils";

const columns = [
  { key: "fullName", label: "ФИО" },
  { key: "address", label: "Адрес" },
  { key: "age", label: "Возраст" },
  { key: "diagnosis", label: "Симптомы" },
  { key: "worker", label: "Работник" },
  { key: "createdAt", label: "Создан" },
  { key: "statusUpdatedAt", label: "Статус изменён" },
  { key: "status", label: "Статус" },
];

const CallsSection = ({
  activeFilterEntries,
  calls,
  error,
  filters,
  isFiltersOpen,
  isInitialLoading,
  isRefreshing,
  isWorker,
  onFilterChange,
  onOpenCall,
  onResetFilters,
  onToggleFilters,
  onToggleOnlyNew,
  onToggleShowAllCalls,
  onToggleSort,
  showAllCalls,
  showOnlyNew,
  sortConfig,
  workers,
}) => {
  const activeFilterCount = activeFilterEntries.length;
  const visibleCountLabel = `Найдено: ${calls.length}`;
  const filterIcon = (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M3 5h14l-5.2 5.8V16l-3.6-1.8v-3.4L3 5z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );

  const sortLabel = (key, label) => {
    if (sortConfig.key !== key) return label;
    return `${label} ${sortConfig.direction === "asc" ? "▲" : "▼"}`;
  };

  const emptyStateMessage =
    activeFilterCount > 0
      ? "По текущим фильтрам вызовы не найдены."
      : "Вызовов пока нет.";

  return (
    <section className="card card-elevated" aria-busy={isInitialLoading || isRefreshing}>
      <div className="section-header section-header-wrap">
        <div>
          <h2>{showAllCalls ? "Все вызовы" : "Мои вызовы"}</h2>
          <p className="section-caption">
            {isInitialLoading ? "Загружаем список..." : visibleCountLabel}
          </p>
        </div>

        <div className="section-actions section-actions-wrap">
          {isWorker && (
            <button
              type="button"
              onClick={onToggleShowAllCalls}
              aria-pressed={showAllCalls}
            >
              {showAllCalls ? "Показать мои" : "Показать все"}
            </button>
          )}

          <button
            type="button"
            onClick={onToggleOnlyNew}
            aria-pressed={showOnlyNew}
          >
            {showOnlyNew ? "Только новые: вкл" : "Только новые"}
          </button>

          <button
            type="button"
            className="icon-button"
            onClick={onToggleFilters}
            aria-expanded={isFiltersOpen}
            aria-label={isFiltersOpen ? "Скрыть фильтры" : "Показать фильтры"}
            title={isFiltersOpen ? "Скрыть фильтры" : "Показать фильтры"}
          >
            {filterIcon}
            {activeFilterCount > 0 && (
              <span className="icon-button-badge">{activeFilterCount}</span>
            )}
          </button>
        </div>
      </div>

      <div className="control-deck">
        <div className="control-deck-item">
          <span className="control-deck-label">Срез</span>
          <strong>{showAllCalls ? "Полный список" : "Назначенная выборка"}</strong>
        </div>
        <div className="control-deck-item">
          <span className="control-deck-label">Фильтры</span>
          <strong>{activeFilterCount > 0 ? `${activeFilterCount} активн.` : "Не заданы"}</strong>
        </div>
        <div className="control-deck-item">
          <span className="control-deck-label">Сортировка</span>
          <strong>{columns.find((column) => column.key === sortConfig.key)?.label || "По умолчанию"}</strong>
        </div>
      </div>

      {(activeFilterCount > 0 || isRefreshing) && (
        <div className="filters-summary" aria-live="polite">
          {isRefreshing && (
            <span className="inline-status">Список обновляется...</span>
          )}
          {activeFilterEntries.map((entry) => (
            <span key={entry.key} className="filter-chip">
              {entry.label}
            </span>
          ))}
        </div>
      )}

      {isFiltersOpen && (
        <div className="filters-panel">
          <div className="filters-panel-header">
            <div>
              <h3>Расширенный поиск</h3>
              <p className="section-caption">
                Используйте сочетание текстовых, статусных и временных критериев.
              </p>
            </div>
          </div>

          <div className="filters">
            <input
              name="fullName"
              placeholder="ФИО"
              value={filters.fullName}
              onChange={onFilterChange}
            />
            <input
              name="address"
              placeholder="Адрес"
              value={filters.address}
              onChange={onFilterChange}
            />
            <input
              name="diagnosis"
              placeholder="Симптомы"
              value={filters.diagnosis}
              onChange={onFilterChange}
            />
            <select
              name="workerId"
              value={filters.workerId}
              onChange={onFilterChange}
            >
              <option value="">Работник</option>
              {workers.map((worker) => (
                <option key={worker.id} value={worker.id}>
                  {worker.fullName}
                </option>
              ))}
            </select>
            <select
              name="status"
              value={filters.status}
              onChange={onFilterChange}
            >
              <option value="">Статус</option>
              <option value="NEW">Новый</option>
              <option value="COMPLETED">Выполнен</option>
              <option value="CANCELLED">Отменён</option>
            </select>
            <input
              name="ageMin"
              type="number"
              min="0"
              placeholder="Возраст от"
              value={filters.ageMin}
              onChange={onFilterChange}
            />
            <input
              name="ageMax"
              type="number"
              min="0"
              placeholder="Возраст до"
              value={filters.ageMax}
              onChange={onFilterChange}
            />
            <input
              name="createdAt"
              placeholder="Создан (HH:MM)"
              value={filters.createdAt}
              onChange={onFilterChange}
            />
            <input
              name="statusUpdatedAt"
              placeholder="Статус изменён (HH:MM)"
              value={filters.statusUpdatedAt}
              onChange={onFilterChange}
            />
          </div>

          <div className="filters-footer">
            <button type="button" onClick={onResetFilters} disabled={activeFilterCount === 0}>
              Сбросить фильтры
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="table-shell">
        <div className="table-shell-header">
          <div>
            <h3>Реестр вызовов</h3>
            <p className="section-caption">
              Откройте карточку вызова кликом или с клавиатуры.
            </p>
          </div>
        </div>

      <div className="table table-scroll" role="table" aria-label="Список вызовов">
        <div className="table-row table-head" role="row">
          {columns.map((column) => (
            <button
              key={column.key}
              type="button"
              className="table-sort"
              onClick={() => onToggleSort(column.key)}
              role="columnheader"
              aria-sort={
                sortConfig.key !== column.key
                  ? "none"
                  : sortConfig.direction === "asc"
                    ? "ascending"
                    : "descending"
              }
            >
              {sortLabel(column.key, column.label)}
            </button>
          ))}
        </div>

        {isInitialLoading ? (
          <div className="table-row empty table-row-loading">Загружаем вызовы...</div>
        ) : calls.length === 0 ? (
          <div className="table-row empty">{emptyStateMessage}</div>
        ) : (
          calls.map((call) => (
            <div
              key={call.id}
              className={`table-row clickable status-border-${call.status.toLowerCase()}`}
              onClick={() => onOpenCall(call.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onOpenCall(call.id);
                }
              }}
            >
              <span data-label="ФИО">{call.fullName}</span>
              <span data-label="Адрес">{call.address}</span>
              <span data-label="Возраст">{call.age}</span>
              <span data-label="Симптомы">{call.diagnosis}</span>
              <span data-label="Работник">{call.assignedWorker?.fullName || "—"}</span>
              <span data-label="Создан">{formatTimeUtcPlus3(call.createdAt)}</span>
              <span data-label="Статус изменён">
                {formatTimeUtcPlus3(call.statusUpdatedAt)}
              </span>
              <span
                data-label="Статус"
                className={`status status-${call.status.toLowerCase()}`}
              >
                {statusLabels[call.status] || call.status}
              </span>
            </div>
          ))
        )}
      </div>
      </div>
    </section>
  );
};

export default CallsSection;
