const CreateCallSection = ({
  error,
  formState,
  isFormOpen,
  isFormValid,
  isSubmitting,
  isWorkersLoading,
  onChange,
  onSubmit,
  onToggle,
  workers,
}) => (
  <section className="card card-elevated" aria-busy={isSubmitting || isWorkersLoading}>
    <div className="section-header">
      <div>
        <h2>Создать вызов</h2>
        <p className="section-caption">
          Быстрое оформление карточки с немедленным назначением работника.
        </p>
      </div>
      <button type="button" onClick={onToggle} aria-expanded={isFormOpen}>
        {isFormOpen ? "Скрыть" : "Показать"}
      </button>
    </div>

    {isFormOpen && (
      <form className="form" onSubmit={onSubmit}>
        <label>
          ФИО пациента
          <input
            name="fullName"
            value={formState.fullName}
            onChange={onChange}
            placeholder="Иванов Иван Иванович"
            required
          />
        </label>

        <label>
          Адрес
          <input
            name="address"
            value={formState.address}
            onChange={onChange}
            placeholder="г. Москва, ул. Пример, 10"
            required
          />
        </label>

        <div className="input-mode-field">
          <span className="field-title">Возраст пациента</span>
          <div className="age-inline-fields" aria-label="Возраст или год рождения">
            <input
              name="age"
              type="number"
              min="1"
              value={formState.age}
              onChange={onChange}
              placeholder="Возраст"
            />
            <span className="age-inline-divider">/</span>
            <input
              name="birthYear"
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formState.birthYear}
              onChange={onChange}
              placeholder="Год рождения"
            />
          </div>
          {formState.age && formState.birthYear && (
            <p className="helper helper-inline">
              Заполните только одно поле: возраст или год рождения.
            </p>
          )}
        </div>

        <label>
          Работник
          <select
            name="assignedWorkerId"
            value={formState.assignedWorkerId}
            onChange={onChange}
            required
            disabled={isWorkersLoading || workers.length === 0}
          >
            <option value="">
              {isWorkersLoading ? "Загрузка работников..." : "Выберите работника"}
            </option>
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
            value={formState.diagnosis}
            onChange={onChange}
            placeholder="Гипертонический криз, жалобы, наблюдения"
            rows={1}
            required
          />
        </label>

        <button type="submit" disabled={!isFormValid || isSubmitting}>
          {isSubmitting ? "Создание..." : "Создать вызов"}
        </button>
      </form>
    )}

    {isWorkersLoading && <p className="helper">Обновляем список работников...</p>}
    {error && (
      <p className="error" role="alert">
        {error}
      </p>
    )}
  </section>
);

export default CreateCallSection;
