import { useEffect } from "react";
import {
  actionLabels,
  formatTimeUtcPlus3,
  statusLabels,
} from "../dashboardUtils";

const CallDetailsModal = ({
  callEditState,
  callHistory,
  describeHistoryEntry,
  hasUnsavedChanges,
  historyError,
  isAdmin,
  isBusy,
  isHistoryLoading,
  isHistoryOpen,
  isEditValid,
  isLoading,
  modalError,
  onCallEditChange,
  onClose,
  onDelete,
  onSave,
  onStatusChange,
  onToggleHistory,
  selectedCall,
  workers,
}) => {
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!selectedCall) {
    return null;
  }

  const isCompleted = selectedCall.status === "COMPLETED";
  const isCancelled = selectedCall.status === "CANCELLED";
  const isNew = selectedCall.status === "NEW";
  const closeIcon = (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M5 5L15 15M15 5L5 15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="call-modal-title"
        aria-busy={isLoading || isBusy}
      >
        <header className="modal-header">
          <div>
            <h2 id="call-modal-title">Карточка вызова</h2>
            <p className="section-caption">
              {hasUnsavedChanges
                ? "Есть несохранённые изменения."
                : "Esc и клик по фону закрывают карточку."}
            </p>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            disabled={isBusy}
            aria-label="Закрыть окно"
            title="Закрыть"
          >
            {closeIcon}
          </button>
        </header>

        {isLoading ? (
          <p className="inline-status">Загружаем карточку вызова...</p>
        ) : (
          <>
            <div className="modal-grid">
              <div>
                <strong>ФИО:</strong> {selectedCall.fullName}
              </div>
              <div>
                <strong>Адрес:</strong> {selectedCall.address}
              </div>
              <div>
                <strong>Возраст:</strong> {selectedCall.age}
              </div>
              <div>
                <strong>Симптомы:</strong> {selectedCall.diagnosis}
              </div>
              <div>
                <strong>Работник:</strong> {selectedCall.assignedWorker?.fullName || "—"}
              </div>
              <div>
                <strong>Статус:</strong> {statusLabels[selectedCall.status] || selectedCall.status}
              </div>
              <div>
                <strong>Создан:</strong> {formatTimeUtcPlus3(selectedCall.createdAt)}
              </div>
              <div>
                <strong>Статус изменён:</strong>{" "}
                {formatTimeUtcPlus3(selectedCall.statusUpdatedAt)}
              </div>
            </div>

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => onStatusChange(selectedCall.id, "NEW")}
                disabled={isBusy || isNew}
              >
                {isNew ? "Уже новый" : "Сделать новым"}
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(selectedCall.id, "COMPLETED")}
                disabled={isBusy || isCompleted}
              >
                {isCompleted ? "Уже выполнен" : "Выполнен"}
              </button>
              <button
                type="button"
                onClick={() => onStatusChange(selectedCall.id, "CANCELLED")}
                disabled={isBusy || isCancelled}
              >
                {isCancelled ? "Уже отменён" : "Отменён"}
              </button>
              {isAdmin && (
                <button
                  type="button"
                  className="button-danger"
                  onClick={onDelete}
                  disabled={isBusy}
                >
                  {isBusy ? "Подождите..." : "Удалить"}
                </button>
              )}
            </div>

            {modalError && (
              <p className="error" role="alert">
                {modalError}
              </p>
            )}

            {isAdmin && callEditState && (
              <>
                <div className="subsection-header">
                  <h3>Редактирование</h3>
                  {hasUnsavedChanges && (
                    <span className="inline-status">Изменения не сохранены</span>
                  )}
                </div>
                <form
                  className="form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSave();
                  }}
                >
                  <label>
                    ФИО пациента
                    <input
                      name="fullName"
                      value={callEditState.fullName}
                      onChange={onCallEditChange}
                      required
                    />
                  </label>
                  <label>
                    Адрес
                    <input
                      name="address"
                      value={callEditState.address}
                      onChange={onCallEditChange}
                      required
                    />
                  </label>
                  <label>
                    Возраст
                    <input
                      name="age"
                      type="number"
                      min="1"
                      value={callEditState.age}
                      onChange={onCallEditChange}
                      required
                    />
                  </label>
                  <label>
                    Работник
                    <select
                      name="assignedWorkerId"
                      value={callEditState.assignedWorkerId}
                      onChange={onCallEditChange}
                      required
                    >
                      <option value="">Выберите работника</option>
                      {workers.map((worker) => (
                        <option key={worker.id} value={worker.id}>
                          {worker.fullName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="form-field-wide diagnosis-field">
                    Симптомы
                    <textarea
                      className="resizable-textarea"
                      name="diagnosis"
                      value={callEditState.diagnosis}
                      onChange={onCallEditChange}
                      rows={1}
                      required
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={isBusy || !hasUnsavedChanges || !isEditValid}
                  >
                    {isBusy ? "Сохранение..." : "Сохранить"}
                  </button>
                </form>
              </>
            )}

            <div className="history-header">
              <h3>История изменений</h3>
              <button type="button" onClick={onToggleHistory} aria-expanded={isHistoryOpen}>
                {isHistoryOpen ? "Скрыть" : "Показать"}
              </button>
            </div>

            {isHistoryOpen && (
              <>
                {isHistoryLoading ? (
                  <p className="inline-status">Загружаем историю...</p>
                ) : historyError ? (
                  <p className="error" role="alert">
                    {historyError}
                  </p>
                ) : callHistory.length === 0 ? (
                  <p>История пока отсутствует.</p>
                ) : (
                  <div className="history-list scrollable">
                    {callHistory.map((entry) => (
                      <div key={entry.id} className="history-item">
                        <div className="history-meta">
                          <span>{formatTimeUtcPlus3(entry.createdAt)}</span>
                          <span>
                            {entry.changedByUser?.fullName || "Неизвестно"} •{" "}
                            {entry.changedByUser?.role || "—"}
                          </span>
                        </div>
                        <div className="history-action">
                          {actionLabels[entry.actionType] || entry.actionType}
                        </div>
                        <div className="history-desc">{describeHistoryEntry(entry)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CallDetailsModal;
