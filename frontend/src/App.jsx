import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from "react-router-dom";

const API_BASE_URL = "/api";
const AUTH_STORAGE_KEY = "med_calls_auth";

const defaultFormState = {
  fullName: "",
  address: "",
  age: "",
  diagnosis: "",
  assignedWorkerId: "",
};

const formatTimeUtcPlus3 = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = 3 * 60 * 60 * 1000;
  const adjusted = new Date(date.getTime() + offsetMs);
  const hours = String(adjusted.getUTCHours()).padStart(2, "0");
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

const statusLabels = {
  NEW: "Новый",
  COMPLETED: "Выполнен",
  CANCELLED: "Отменён",
};

const actionLabels = {
  CREATE: "Создание вызова",
  UPDATE_FIELDS: "Редактирование данных",
  STATUS_CHANGE: "Изменение статуса",
};

const fieldLabels = {
  fullName: "ФИО",
  address: "Адрес",
  age: "Возраст",
  diagnosis: "Диагноз",
  assignedWorkerId: "Работник",
};

const readStoredAuth = () => {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const saveStoredAuth = (value) => {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(value));
};

const clearStoredAuth = () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const apiFetch = async (path, { token, ...options } = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  return response;
};

const ProtectedRoute = ({ auth, children }) => {
  if (!auth?.token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AuthRedirect = ({ auth, children }) => {
  if (auth?.token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

const LoginPage = ({ onAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось войти");
      }
      onAuth(payload);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Вход</h1>
        <p>Введите данные учетной записи.</p>
      </header>
      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Вход..." : "Войти"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="helper">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </section>
    </div>
  );
};

const RegisterPage = ({ onAuth }) => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "ADMIN",
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось зарегистрироваться");
      }
      onAuth(payload);
      navigate("/dashboard", { replace: true });
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page">
      <header className="header">
        <h1>Регистрация</h1>
        <p>Создайте учетную запись с нужной ролью.</p>
      </header>
      <section className="card">
        <form className="form" onSubmit={handleSubmit}>
          <label>
            ФИО
            <input
              name="fullName"
              value={form.fullName}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Пароль
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
            />
          </label>
          <label>
            Роль
            <select name="role" value={form.role} onChange={handleChange}>
              <option value="ADMIN">Администратор</option>
              <option value="WORKER">Работник</option>
            </select>
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Создание..." : "Зарегистрироваться"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        <p className="helper">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </section>
    </div>
  );
};

const Dashboard = ({ auth, onLogout }) => {
  const [workers, setWorkers] = useState([]);
  const [calls, setCalls] = useState([]);
  const [formState, setFormState] = useState(defaultFormState);
  const [selectedCall, setSelectedCall] = useState(null);
  const [isCallLoading, setIsCallLoading] = useState(false);
  const [callEditState, setCallEditState] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
    fullName: "",
    address: "",
    diagnosis: "",
    workerId: "",
    status: "",
    ageMin: "",
    ageMax: "",
    createdAt: "",
    statusUpdatedAt: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = auth.user.role === "ADMIN";
  const isWorker = auth.user.role === "WORKER";

  const isFormValid = useMemo(() => {
    if (!isAdmin) return false;
    return (
      formState.fullName.trim() &&
      formState.address.trim() &&
      formState.diagnosis.trim() &&
      Number(formState.age) > 0 &&
      Number(formState.assignedWorkerId) > 0
    );
  }, [formState, isAdmin]);

  const visibleCalls = useMemo(() => {
    const normalized = calls.filter((call) =>
      showOnlyNew ? call.status === "NEW" : true
    );

    return normalized.filter((call) => {
      if (
        filters.fullName &&
        !call.fullName.toLowerCase().includes(filters.fullName.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.address &&
        !call.address.toLowerCase().includes(filters.address.toLowerCase())
      ) {
        return false;
      }
      if (
        filters.diagnosis &&
        !call.diagnosis.toLowerCase().includes(filters.diagnosis.toLowerCase())
      ) {
        return false;
      }
      if (filters.workerId && Number(filters.workerId) !== call.assignedWorkerId) {
        return false;
      }
      if (filters.status && filters.status !== call.status) {
        return false;
      }
      if (filters.ageMin && call.age < Number(filters.ageMin)) {
        return false;
      }
      if (filters.ageMax && call.age > Number(filters.ageMax)) {
        return false;
      }
      if (
        filters.createdAt &&
        !formatTimeUtcPlus3(call.createdAt).includes(filters.createdAt)
      ) {
        return false;
      }
      if (
        filters.statusUpdatedAt &&
        !formatTimeUtcPlus3(call.statusUpdatedAt).includes(
          filters.statusUpdatedAt
        )
      ) {
        return false;
      }
      return true;
    });
  }, [calls, filters, showOnlyNew]);

  const loadWorkers = async () => {
    const response = await apiFetch("/workers", { token: auth.token });
    if (!response.ok) {
      throw new Error("Не удалось загрузить список работников");
    }
    return response.json();
  };

  const loadCalls = async () => {
    const endpoint = isAdmin ? "/calls" : "/calls/my";
    const response = await apiFetch(endpoint, { token: auth.token });
    if (!response.ok) {
      throw new Error("Не удалось загрузить список вызовов");
    }
    return response.json();
  };

  const refreshData = async () => {
    try {
      const [workersData, callsData] = await Promise.all([
        isAdmin ? loadWorkers() : Promise.resolve([]),
        loadCalls(),
      ]);
      setWorkers(workersData);
      setCalls(callsData);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters({
      fullName: "",
      address: "",
      diagnosis: "",
      workerId: "",
      status: "",
      ageMin: "",
      ageMax: "",
      createdAt: "",
      statusUpdatedAt: "",
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) {
      setError("Заполните все поля корректно");
      return;
    }

    setIsSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/calls", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          fullName: formState.fullName,
          address: formState.address,
          age: Number(formState.age),
          diagnosis: formState.diagnosis,
          assignedWorkerId: Number(formState.assignedWorkerId),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось создать вызов");
      }

      setFormState(defaultFormState);
      await refreshData();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (callId, status) => {
    try {
      const response = await apiFetch(`/calls/${callId}/status`, {
        method: "PATCH",
        token: auth.token,
        body: JSON.stringify({ status }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось обновить статус");
      }

      setCalls((prev) =>
        prev.map((call) => (call.id === payload.id ? payload : call))
      );
      setSelectedCall((prev) => (prev?.id === payload.id ? payload : prev));
      if (selectedCall?.id === callId) {
        await loadHistory(callId);
      }
      setError("");
    } catch (updateError) {
      setError(updateError.message);
    }
  };

  const loadHistory = async (callId) => {
    try {
      const response = await apiFetch(`/calls/${callId}/history`, {
        token: auth.token,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить историю");
      }
      setCallHistory(payload);
      setHistoryError("");
    } catch (loadError) {
      setHistoryError(loadError.message);
    }
  };

  const openCall = async (callId) => {
    // Fetch full call details for the modal card
    setIsCallLoading(true);
    try {
      const response = await apiFetch(`/calls/${callId}`, {
        token: auth.token,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось загрузить вызов");
      }
      setSelectedCall(payload);
      setCallEditState({
        fullName: payload.fullName,
        address: payload.address,
        age: payload.age,
        diagnosis: payload.diagnosis,
        assignedWorkerId: payload.assignedWorkerId,
      });
      await loadHistory(callId);
      setIsHistoryOpen(false);
      setError("");
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setIsCallLoading(false);
    }
  };

  const closeCall = () => {
    setSelectedCall(null);
    setCallEditState(null);
    setCallHistory([]);
    setHistoryError("");
    setIsHistoryOpen(false);
  };

  const handleCallEditChange = (event) => {
    const { name, value } = event.target;
    setCallEditState((prev) => ({ ...prev, [name]: value }));
  };

  const saveCallEdits = async () => {
    if (!selectedCall) return;
    if (
      !callEditState.fullName.trim() ||
      !callEditState.address.trim() ||
      !callEditState.diagnosis.trim() ||
      Number(callEditState.age) <= 0 ||
      Number(callEditState.assignedWorkerId) <= 0
    ) {
      setError("Заполните все поля корректно");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await apiFetch(`/calls/${selectedCall.id}`, {
        method: "PATCH",
        token: auth.token,
        body: JSON.stringify({
          fullName: callEditState.fullName,
          address: callEditState.address,
          age: Number(callEditState.age),
          diagnosis: callEditState.diagnosis,
          assignedWorkerId: Number(callEditState.assignedWorkerId),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Не удалось сохранить изменения");
      }

      setCalls((prev) =>
        prev.map((call) => (call.id === payload.id ? payload : call))
      );
      setSelectedCall(payload);
      await loadHistory(payload.id);
      setError("");
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const describeHistoryEntry = (entry) => {
    if (entry.actionType === "STATUS_CHANGE") {
      const oldStatus = entry.oldValue?.status;
      const newStatus = entry.newValue?.status;
      return `Статус: ${statusLabels[oldStatus] || oldStatus} → ${
        statusLabels[newStatus] || newStatus
      }`;
    }

    if (entry.actionType === "UPDATE_FIELDS") {
      const changedFields = Object.keys(entry.newValue || {});
      if (changedFields.length === 0) return "Изменены данные вызова";
      return changedFields
        .map((field) => {
          if (field === "assignedWorkerId") {
            const newWorker = workers.find(
              (worker) => worker.id === entry.newValue.assignedWorkerId
            );
            return newWorker
              ? `Назначен работник: ${newWorker.fullName}`
              : "Назначен другой работник";
          }
          return `${fieldLabels[field] || field} изменён`;
        })
        .join(", ");
    }

    return "Создание вызова";
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header-row">
          <div>
            <h1>Личный кабинет</h1>
            <p>
              {auth.user.fullName} • {auth.user.role}
            </p>
          </div>
          <button type="button" onClick={onLogout}>
            Выйти
          </button>
        </div>
        <p>
          {isAdmin
            ? "Управление всеми вызовами и назначениями."
            : "Ваши назначенные вызовы."}
        </p>
      </header>

      {isAdmin && (
        <section className="card">
          <div className="section-header">
            <h2>Создать вызов</h2>
            <button
              type="button"
              onClick={() => setIsCreateFormOpen((prev) => !prev)}
            >
              {isCreateFormOpen ? "Скрыть" : "Показать"}
            </button>
          </div>
          {isCreateFormOpen && (
            <form className="form" onSubmit={handleSubmit}>
            <label>
              ФИО пациента
              <input
                name="fullName"
                value={formState.fullName}
                onChange={handleChange}
                placeholder="Иванов Иван Иванович"
                required
              />
            </label>
            <label>
              Адрес
              <input
                name="address"
                value={formState.address}
                onChange={handleChange}
                placeholder="г. Москва, ул. Пример, 10"
                required
              />
            </label>
            <label>
              Возраст
              <input
                name="age"
                type="number"
                min="1"
                value={formState.age}
                onChange={handleChange}
                placeholder="45"
                required
              />
            </label>
            <label>
              Диагноз
              <input
                name="diagnosis"
                value={formState.diagnosis}
                onChange={handleChange}
                placeholder="Гипертонический криз"
                required
              />
            </label>
            <label>
              Работник
              <select
                name="assignedWorkerId"
                value={formState.assignedWorkerId}
                onChange={handleChange}
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
            <button type="submit" disabled={!isFormValid || isSubmitting}>
              {isSubmitting ? "Создание..." : "Создать вызов"}
            </button>
            </form>
          )}
          {error && <p className="error">{error}</p>}
        </section>
      )}

      <section className="card">
        <div className="section-header">
          <h2>{isAdmin ? "Все вызовы" : "Мои вызовы"}</h2>
          <div className="section-actions">
            <button
              type="button"
              onClick={() => setShowOnlyNew((prev) => !prev)}
            >
              {showOnlyNew ? "Показать все" : "Только новые"}
            </button>
            <button
              type="button"
              onClick={() => setIsFiltersOpen((prev) => !prev)}
            >
              {isFiltersOpen ? "Скрыть фильтры" : "Показать фильтры"}
            </button>
            <button type="button" onClick={resetFilters}>
              Сбросить фильтры
            </button>
          </div>
        </div>
        {isFiltersOpen && (
          <div className="filters">
            <input
              name="fullName"
              placeholder="ФИО"
              value={filters.fullName}
              onChange={handleFilterChange}
            />
            <input
              name="address"
              placeholder="Адрес"
              value={filters.address}
              onChange={handleFilterChange}
            />
            <input
              name="diagnosis"
              placeholder="Диагноз"
              value={filters.diagnosis}
              onChange={handleFilterChange}
            />
            <select
              name="workerId"
              value={filters.workerId}
              onChange={handleFilterChange}
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
              onChange={handleFilterChange}
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
              onChange={handleFilterChange}
            />
            <input
              name="ageMax"
              type="number"
              min="0"
              placeholder="Возраст до"
              value={filters.ageMax}
              onChange={handleFilterChange}
            />
            <input
              name="createdAt"
              placeholder="Создан (HH:MM)"
              value={filters.createdAt}
              onChange={handleFilterChange}
            />
            <input
              name="statusUpdatedAt"
              placeholder="Статус изменён (HH:MM)"
              value={filters.statusUpdatedAt}
              onChange={handleFilterChange}
            />
          </div>
        )}
        <div className="table">
          <div className="table-row table-head">
            <span>ФИО</span>
            <span>Адрес</span>
            <span>Возраст</span>
            <span>Диагноз</span>
            <span>Работник</span>
            <span>Создан</span>
            <span>Статус изменён</span>
            <span>Статус</span>
          </div>
          {visibleCalls.length === 0 && (
            <div className="table-row empty">Вызовов пока нет</div>
          )}
          {visibleCalls.map((call) => (
            <div
              key={call.id}
              className={`table-row clickable status-border-${call.status.toLowerCase()}`}
              onClick={() => openCall(call.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  openCall(call.id);
                }
              }}
            >
              <span>{call.fullName}</span>
              <span>{call.address}</span>
              <span>{call.age}</span>
              <span>{call.diagnosis}</span>
              <span>{call.assignedWorker?.fullName || "—"}</span>
              <span>{formatTimeUtcPlus3(call.createdAt)}</span>
              <span>{formatTimeUtcPlus3(call.statusUpdatedAt)}</span>
              <span className={`status status-${call.status.toLowerCase()}`}>
                {statusLabels[call.status] || call.status}
              </span>
            </div>
          ))}
        </div>
        {error && !isAdmin && <p className="error">{error}</p>}
      </section>

      {selectedCall && (
        <div className="modal-backdrop" onClick={closeCall}>
          <div
            className="modal"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="modal-header">
              <h2>Карточка вызова</h2>
              <button type="button" onClick={closeCall}>
                Закрыть
              </button>
            </header>
            {isCallLoading ? (
              <p>Загрузка...</p>
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
                    <strong>Диагноз:</strong> {selectedCall.diagnosis}
                  </div>
                  <div>
                    <strong>Работник:</strong>{" "}
                    {selectedCall.assignedWorker?.fullName || "—"}
                  </div>
                  <div>
                    <strong>Статус:</strong>{" "}
                    {statusLabels[selectedCall.status] ||
                      selectedCall.status}
                  </div>
                  <div>
                    <strong>Создан:</strong>{" "}
                    {formatTimeUtcPlus3(selectedCall.createdAt)}
                  </div>
                  <div>
                    <strong>Статус изменён:</strong>{" "}
                    {formatTimeUtcPlus3(selectedCall.statusUpdatedAt)}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedCall.id, "COMPLETED")}
                  >
                    Выполнен
                  </button>
                  <button
                    type="button"
                    onClick={() => updateStatus(selectedCall.id, "CANCELLED")}
                  >
                    Отменён
                  </button>
                </div>

                {isAdmin && callEditState && (
                  <>
                    <h3>Редактирование</h3>
                    <form
                      className="form"
                      onSubmit={(event) => {
                        event.preventDefault();
                        saveCallEdits();
                      }}
                    >
                      <label>
                        ФИО пациента
                        <input
                          name="fullName"
                          value={callEditState.fullName}
                          onChange={handleCallEditChange}
                          required
                        />
                      </label>
                      <label>
                        Адрес
                        <input
                          name="address"
                          value={callEditState.address}
                          onChange={handleCallEditChange}
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
                          onChange={handleCallEditChange}
                          required
                        />
                      </label>
                      <label>
                        Диагноз
                        <input
                          name="diagnosis"
                          value={callEditState.diagnosis}
                          onChange={handleCallEditChange}
                          required
                        />
                      </label>
                      <label>
                        Работник
                        <select
                          name="assignedWorkerId"
                          value={callEditState.assignedWorkerId}
                          onChange={handleCallEditChange}
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
                      <button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Сохранение..." : "Сохранить"}
                      </button>
                    </form>
                  </>
                )}

                <div className="history-header">
                  <h3>История изменений</h3>
                  <button
                    type="button"
                    onClick={() => setIsHistoryOpen((prev) => !prev)}
                  >
                    {isHistoryOpen ? "Скрыть" : "Показать"}
                  </button>
                </div>
                {isHistoryOpen && (
                  <>
                    {historyError && <p className="error">{historyError}</p>}
                    {callHistory.length === 0 ? (
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
                            <div className="history-desc">
                              {describeHistoryEntry(entry)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {error && <p className="error">{error}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState(() => readStoredAuth());

  const handleAuth = (payload) => {
    const authPayload = { token: payload.token, user: payload.user };
    saveStoredAuth(authPayload);
    setAuth(authPayload);
  };

  const handleLogout = () => {
    clearStoredAuth();
    setAuth(null);
  };

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={auth?.token ? "/dashboard" : "/login"} replace />}
      />
      <Route
        path="/login"
        element={
          <AuthRedirect auth={auth}>
            <LoginPage onAuth={handleAuth} />
          </AuthRedirect>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirect auth={auth}>
            <RegisterPage onAuth={handleAuth} />
          </AuthRedirect>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute auth={auth}>
            <Dashboard auth={auth} onLogout={handleLogout} />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
