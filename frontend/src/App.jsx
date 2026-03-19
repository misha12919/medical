import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import CallDetailsModal from "./components/CallDetailsModal";
import CallsSection from "./components/CallsSection";
import CreateCallSection from "./components/CreateCallSection";
import {
  ApiRequestError,
  defaultFilters,
  defaultFormState,
  fieldLabels,
  formatTimeUtcPlus3,
  getAgeFromFormState,
  getActiveFilterEntries,
  parseJsonResponse,
  statusLabels,
} from "./dashboardUtils";

const API_BASE_URL = "/api";
const AUTH_STORAGE_KEY = "med_calls_auth";

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

const LoginPage = ({ authMessage, onAuth }) => {
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
        {authMessage && <p className="notice">{authMessage}</p>}
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

const RegisterPage = ({ authMessage, onAuth }) => {
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
        {authMessage && <p className="notice">{authMessage}</p>}
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
  const [isDashboardLoading, setIsDashboardLoading] = useState(true);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);
  const [isListRefreshing, setIsListRefreshing] = useState(false);
  const [isModalLoading, setIsModalLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [callEditState, setCallEditState] = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [listError, setListError] = useState("");
  const [createError, setCreateError] = useState("");
  const [modalError, setModalError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(true);
  const [showOnlyNew, setShowOnlyNew] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);
  const [sortConfig, setSortConfig] = useState({
    key: "createdAt",
    direction: "desc",
  });
  const [isLastCompletedOpen, setIsLastCompletedOpen] = useState(
    auth.user.role === "ADMIN"
  );
  const [showAllCalls, setShowAllCalls] = useState(
    auth.user.role === "ADMIN"
  );
  const [filters, setFilters] = useState(defaultFilters);
  const [isCreateSubmitting, setIsCreateSubmitting] = useState(false);
  const [isModalSubmitting, setIsModalSubmitting] = useState(false);

  const isAdmin = auth.user.role === "ADMIN";
  const isWorker = auth.user.role === "WORKER";
  const derivedCreateAge = useMemo(
    () => getAgeFromFormState(formState),
    [formState]
  );

  const buildCallEditState = (call) => ({
    fullName: call.fullName,
    address: call.address,
    age: call.age,
    diagnosis: call.diagnosis,
    assignedWorkerId: call.assignedWorkerId,
  });

  const isFormValid = useMemo(() => {
    if (!isAdmin) return false;
    return Boolean(
      formState.fullName.trim() &&
      formState.address.trim() &&
      formState.diagnosis.trim() &&
      derivedCreateAge > 0 &&
      Number(formState.assignedWorkerId) > 0
    );
  }, [derivedCreateAge, formState, isAdmin]);

  const isCallEditValid = useMemo(() => {
    if (!callEditState) return false;
    return Boolean(
      callEditState.fullName.trim() &&
      callEditState.address.trim() &&
      callEditState.diagnosis.trim() &&
      Number(callEditState.age) > 0 &&
      Number(callEditState.assignedWorkerId) > 0
    );
  }, [callEditState]);

  const hasUnsavedCallChanges = useMemo(() => {
    if (!selectedCall || !callEditState || !isAdmin) {
      return false;
    }

    return (
      selectedCall.fullName !== callEditState.fullName ||
      selectedCall.address !== callEditState.address ||
      selectedCall.diagnosis !== callEditState.diagnosis ||
      Number(selectedCall.age) !== Number(callEditState.age) ||
      Number(selectedCall.assignedWorkerId) !==
        Number(callEditState.assignedWorkerId)
    );
  }, [callEditState, isAdmin, selectedCall]);

  const visibleCalls = useMemo(() => {
    const normalized = calls.filter((call) =>
      showOnlyNew ? call.status === "NEW" : true
    );

    const filtered = normalized.filter((call) => {
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

    const sorted = [...filtered].sort((a, b) => {
      const { key, direction } = sortConfig;
      const dir = direction === "asc" ? 1 : -1;

      if (key === "age") {
        return (a.age - b.age) * dir;
      }
      if (key === "createdAt") {
        return (new Date(a.createdAt) - new Date(b.createdAt)) * dir;
      }
      if (key === "statusUpdatedAt") {
        return (
          (new Date(a.statusUpdatedAt || 0) -
            new Date(b.statusUpdatedAt || 0)) *
          dir
        );
      }
      if (key === "worker") {
        const aName = a.assignedWorker?.fullName || "";
        const bName = b.assignedWorker?.fullName || "";
        return aName.localeCompare(bName, "ru") * dir;
      }
      if (key === "status") {
        return a.status.localeCompare(b.status, "en") * dir;
      }
      const aValue = (a[key] || "").toString().toLowerCase();
      const bValue = (b[key] || "").toString().toLowerCase();
      return aValue.localeCompare(bValue, "ru") * dir;
    });

    return sorted;
  }, [calls, filters, showOnlyNew, sortConfig]);

  const activeFilterEntries = useMemo(
    () => getActiveFilterEntries({ filters, showOnlyNew, workers }),
    [filters, showOnlyNew, workers]
  );

  const lastCompletedByWorker = useMemo(() => {
    if (!isAdmin) return [];
    return workers.map((worker) => {
      const completedCalls = calls
        .filter(
          (call) =>
            call.assignedWorkerId === worker.id && call.status === "COMPLETED"
        )
        .sort((a, b) => {
          const aTime = new Date(a.statusUpdatedAt || 0).getTime();
          const bTime = new Date(b.statusUpdatedAt || 0).getTime();
          return bTime - aTime;
        });

      const lastCall = completedCalls[0] || null;
      return {
        worker,
        lastCall,
      };
    });
  }, [calls, isAdmin, workers]);

  const dashboardSummary = useMemo(() => {
    const total = calls.length;
    const newCount = calls.filter((call) => call.status === "NEW").length;
    const completedCount = calls.filter(
      (call) => call.status === "COMPLETED"
    ).length;
    const cancelledCount = calls.filter(
      (call) => call.status === "CANCELLED"
    ).length;

    return {
      total,
      newCount,
      completedCount,
      cancelledCount,
      workersCount: workers.length,
      visibleCount: visibleCalls.length,
      activeFilterCount: activeFilterEntries.length,
    };
  }, [activeFilterEntries.length, calls, visibleCalls.length, workers.length]);

  const visibleCallHistory = useMemo(
    () =>
      callHistory.filter((entry) => {
        if (entry.actionType !== "UPDATE_FIELDS") {
          return true;
        }

        const changedFields = Object.keys(entry.newValue || {}).filter(
          (field) => field !== "createdAt" && field !== "statusUpdatedAt"
        );

        return changedFields.length > 0;
      }),
    [callHistory]
  );

  const toggleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === "asc" ? "desc" : "asc",
        };
      }
      return { key, direction: "asc" };
    });
  };

  const loadWorkers = async () => {
    const response = await apiFetch("/workers", { token: auth.token });
    return parseJsonResponse(response, {
      default: "Не удалось загрузить список работников.",
    });
  };

  const loadCalls = async () => {
    const endpoint = showAllCalls ? "/calls" : "/calls/my";
    const response = await apiFetch(endpoint, { token: auth.token });
    return parseJsonResponse(response, {
      default: "Не удалось загрузить список вызовов.",
      forbidden:
        isWorker && showAllCalls
          ? "Полный список вызовов недоступен для вашей роли. Переключитесь на режим \"Мои вызовы\"."
          : "Недостаточно прав для просмотра списка вызовов.",
    });
  };

  const handleRequestFailure = (requestError, setErrorState) => {
    const message =
      requestError?.message || "Не удалось выполнить запрос. Попробуйте снова.";

    if (requestError instanceof ApiRequestError && requestError.status === 401) {
      onLogout(message);
      return true;
    }

    setErrorState(message);
    return false;
  };

  const closeCall = () => {
    setSelectedCall(null);
    setCallEditState(null);
    setCallHistory([]);
    setHistoryError("");
    setModalError("");
    setIsHistoryOpen(false);
  };

  const handleMissingCall = (callId, message) => {
    setCalls((prev) => prev.filter((call) => call.id !== callId));
    if (selectedCall?.id === callId) {
      closeCall();
    }
    setListError(message);
  };

  const refreshData = async ({ initial = false } = {}) => {
    if (initial) {
      setIsDashboardLoading(true);
    } else {
      setIsListRefreshing(true);
    }

    setListError("");

    const callsPromise = loadCalls()
      .then((callsData) => {
        setCalls(callsData);
      })
      .catch((loadError) => {
        handleRequestFailure(loadError, setListError);
      });

    if (isAdmin) {
      setIsWorkersLoading(true);
      setCreateError("");

      await Promise.all([
        callsPromise,
        loadWorkers()
          .then((workersData) => {
            setWorkers(workersData);
          })
          .catch((loadError) => {
            handleRequestFailure(loadError, setCreateError);
          })
          .finally(() => {
            setIsWorkersLoading(false);
          }),
      ]);
    } else {
      await callsPromise;
    }

    setIsDashboardLoading(false);
    setIsListRefreshing(false);
  };

  useEffect(() => {
    refreshData({ initial: true });
  }, [showAllCalls]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setCreateError("");
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!isFormValid) {
      setCreateError(
        "Заполните все поля корректно и укажите только возраст или только год рождения."
      );
      return;
    }

    setIsCreateSubmitting(true);
    setCreateError("");
    try {
      const response = await apiFetch("/calls", {
        method: "POST",
        token: auth.token,
        body: JSON.stringify({
          fullName: formState.fullName,
          address: formState.address,
          age: derivedCreateAge,
          diagnosis: formState.diagnosis,
          assignedWorkerId: Number(formState.assignedWorkerId),
        }),
      });

      await parseJsonResponse(response, {
        default: "Не удалось создать вызов.",
        forbidden: "Создавать вызовы может только администратор.",
      });

      setFormState(defaultFormState);
      await refreshData();
    } catch (submitError) {
      handleRequestFailure(submitError, setCreateError);
    } finally {
      setIsCreateSubmitting(false);
    }
  };

  const updateStatus = async (callId, status) => {
    setIsModalSubmitting(true);
    setModalError("");
    try {
      const response = await apiFetch(`/calls/${callId}/status`, {
        method: "PATCH",
        token: auth.token,
        body: JSON.stringify({ status }),
      });
      const payload = await parseJsonResponse(response, {
        default: "Не удалось обновить статус вызова.",
        forbidden: "У вас нет доступа к изменению статуса этого вызова.",
        notFound: "Вызов не найден: возможно, он уже был удалён.",
      });

      setCalls((prev) =>
        prev.map((call) => (call.id === payload.id ? payload : call))
      );
      setSelectedCall((prev) => (prev?.id === payload.id ? payload : prev));
      if (selectedCall?.id === callId) {
        await loadHistory(callId);
      }
    } catch (updateError) {
      if (updateError instanceof ApiRequestError && updateError.status === 404) {
        handleMissingCall(callId, updateError.message);
      } else {
        handleRequestFailure(updateError, setModalError);
      }
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const loadHistory = async (callId) => {
    setIsHistoryLoading(true);
    setHistoryError("");
    try {
      const response = await apiFetch(`/calls/${callId}/history`, {
        token: auth.token,
      });
      const payload = await parseJsonResponse(response, {
        default: "Не удалось загрузить историю изменений.",
        forbidden: "История этого вызова недоступна для вашей роли.",
        notFound: "История недоступна: вызов уже удалён.",
      });
      setCallHistory(payload);
      return payload;
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        handleMissingCall(callId, loadError.message);
      } else {
        handleRequestFailure(loadError, setHistoryError);
      }
      setCallHistory([]);
      return [];
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const openCall = async (callId) => {
    const previewCall = calls.find((call) => call.id === callId) || null;
    setSelectedCall(previewCall);
    setCallEditState(null);
    setCallHistory([]);
    setHistoryError("");
    setModalError("");
    setIsHistoryOpen(false);
    setIsModalLoading(true);
    try {
      const response = await apiFetch(`/calls/${callId}`, {
        token: auth.token,
      });
      const payload = await parseJsonResponse(response, {
        default: "Не удалось загрузить карточку вызова.",
        forbidden: "У вас нет доступа к этой карточке вызова.",
        notFound: "Вызов не найден: возможно, он уже был удалён.",
      });
      setSelectedCall(payload);
      setCallEditState(buildCallEditState(payload));
      await loadHistory(callId);
      setIsHistoryOpen(false);
    } catch (loadError) {
      if (loadError instanceof ApiRequestError && loadError.status === 404) {
        handleMissingCall(callId, loadError.message);
      } else if (
        loadError instanceof ApiRequestError &&
        loadError.status === 403
      ) {
        closeCall();
        setListError(loadError.message);
      } else {
        closeCall();
        handleRequestFailure(loadError, setListError);
      }
    } finally {
      setIsModalLoading(false);
    }
  };

  const requestCloseCall = () => {
    if (isModalSubmitting) {
      setModalError("Дождитесь завершения текущего действия, чтобы закрыть карточку.");
      return;
    }

    if (hasUnsavedCallChanges) {
      const confirmed = window.confirm(
        "Закрыть карточку и потерять несохранённые изменения?"
      );

      if (!confirmed) {
        return;
      }
    }

    closeCall();
  };

  const handleCallEditChange = (event) => {
    const { name, value } = event.target;
    setModalError("");
    setCallEditState((prev) => ({ ...prev, [name]: value }));
  };

  const saveCallEdits = async () => {
    if (!selectedCall) return;
    if (!isCallEditValid) {
      setModalError("Заполните все поля корректно.");
      return;
    }
    if (!hasUnsavedCallChanges) {
      setModalError("Изменений для сохранения нет.");
      return;
    }

    setIsModalSubmitting(true);
    setModalError("");
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
      const payload = await parseJsonResponse(response, {
        default: "Не удалось сохранить изменения вызова.",
        forbidden: "Редактирование вызова недоступно для вашей роли.",
        notFound: "Вызов не найден: возможно, он уже был удалён.",
      });

      setCalls((prev) =>
        prev.map((call) => (call.id === payload.id ? payload : call))
      );
      setSelectedCall(payload);
      setCallEditState(buildCallEditState(payload));
      await loadHistory(payload.id);
    } catch (saveError) {
      if (saveError instanceof ApiRequestError && saveError.status === 404) {
        handleMissingCall(selectedCall.id, saveError.message);
      } else {
        handleRequestFailure(saveError, setModalError);
      }
    } finally {
      setIsModalSubmitting(false);
    }
  };

  const deleteCall = async () => {
    if (!selectedCall) return;
    const confirmed = window.confirm("Удалить вызов без возможности восстановления?");
    if (!confirmed) return;

    setIsModalSubmitting(true);
    setModalError("");
    try {
      const response = await apiFetch(`/calls/${selectedCall.id}`, {
        method: "DELETE",
        token: auth.token,
      });
      await parseJsonResponse(response, {
        default: "Не удалось удалить вызов.",
        forbidden: "Удалять вызовы может только администратор.",
        notFound: "Вызов уже удалён или больше не существует.",
      });

      setCalls((prev) => prev.filter((call) => call.id !== selectedCall.id));
      closeCall();
    } catch (deleteError) {
      if (deleteError instanceof ApiRequestError && deleteError.status === 404) {
        handleMissingCall(selectedCall.id, deleteError.message);
      } else {
        handleRequestFailure(deleteError, setModalError);
      }
    } finally {
      setIsModalSubmitting(false);
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
      const changedFields = Object.keys(entry.newValue || {}).filter(
        (field) => field !== "createdAt" && field !== "statusUpdatedAt"
      );
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
          <button type="button" onClick={() => onLogout()}>
            Выйти
          </button>
        </div>
        <p>
          {isAdmin
            ? "Управление всеми вызовами и назначениями."
            : "Ваши назначенные вызовы."}
        </p>
      </header>

      <section className="card card-hero">
        <div className="hero-layout">
          <div className="hero-copy">
            <span className="eyebrow">
              {isAdmin ? "Оперативный центр" : "Рабочая панель"}
            </span>
            <h2 className="hero-title">
              {isAdmin
                ? "Контроль обращений, статусов и назначений"
                : "Фокус на назначенных вам вызовах"}
            </h2>
            <p className="hero-text">
              {isAdmin
                ? "Сводка помогает быстро оценить текущую нагрузку и состояние потока обращений."
                : "Панель собрана так, чтобы быстрее ориентироваться в актуальных задачах и истории изменений."}
            </p>
            <div className="hero-badges">
              <span className="hero-badge">Роль: {auth.user.role}</span>
              <span className="hero-badge">
                Видимость: {showAllCalls ? "Все вызовы" : "Мои вызовы"}
              </span>
              <span className="hero-badge">
                Активных фильтров: {dashboardSummary.activeFilterCount}
              </span>
            </div>
          </div>

          <div className="summary-grid" aria-label="Оперативная сводка">
            <article className="summary-card summary-card-primary">
              <span className="summary-label">Всего записей</span>
              <strong>{dashboardSummary.total}</strong>
              <span className="summary-meta">
                Сейчас видно: {dashboardSummary.visibleCount}
              </span>
            </article>
            <article className="summary-card summary-card-new">
              <span className="summary-label">Новые</span>
              <strong>{dashboardSummary.newCount}</strong>
              <span className="summary-meta">Приоритет обработки</span>
            </article>
            <article className="summary-card summary-card-completed">
              <span className="summary-label">Выполненные</span>
              <strong>{dashboardSummary.completedCount}</strong>
              <span className="summary-meta">Закрытые обращения</span>
            </article>
            <article className="summary-card summary-card-cancelled">
              <span className="summary-label">Отменённые</span>
              <strong>{dashboardSummary.cancelledCount}</strong>
              <span className="summary-meta">Неактуальные записи</span>
            </article>
            {isAdmin && (
              <article className="summary-card">
                <span className="summary-label">Работники</span>
                <strong>{dashboardSummary.workersCount}</strong>
                <span className="summary-meta">Доступно для назначения</span>
              </article>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-band">
        <div className="dashboard-band-card">
          <span className="dashboard-band-title">Статус-палитра</span>
          <div className="status-legend">
            <span className="status-pill status-pill-new">Новые</span>
            <span className="status-pill status-pill-completed">Выполненные</span>
            <span className="status-pill status-pill-cancelled">Отменённые</span>
          </div>
        </div>
        <div className="dashboard-band-card">
          <span className="dashboard-band-title">Текущий режим</span>
          <p className="dashboard-band-text">
            {showOnlyNew
              ? "Включён упор на новые обращения."
              : "Показан полный поток доступных обращений."}
          </p>
        </div>
      </section>

      {isAdmin && (
        <CreateCallSection
          error={createError}
          formState={formState}
          isFormOpen={isCreateFormOpen}
          isFormValid={isFormValid}
          isSubmitting={isCreateSubmitting}
          isWorkersLoading={isWorkersLoading}
          onChange={handleChange}
          onSubmit={handleSubmit}
          onToggle={() => setIsCreateFormOpen((prev) => !prev)}
          workers={workers}
        />
      )}

      {isAdmin && (
        <section className="card">
          <div className="section-header">
            <h2>Последние выполненные вызовы</h2>
            <button
              type="button"
              onClick={() => setIsLastCompletedOpen((prev) => !prev)}
            >
              {isLastCompletedOpen ? "Скрыть" : "Показать"}
            </button>
          </div>
          {isLastCompletedOpen && (
            <div
              className="table table-compact"
              role="table"
              aria-label="Последние выполненные вызовы"
            >
              <div className="table-row table-head" role="row">
                <span>Работник</span>
                <span>Время выполнения</span>
                <span>Адрес</span>
              </div>
              {lastCompletedByWorker.length === 0 && (
                <div className="table-row empty">Данных пока нет</div>
              )}
              {lastCompletedByWorker.map(({ worker, lastCall }) => (
                <div key={worker.id} className="table-row">
                  <span data-label="Работник">{worker.fullName}</span>
                  <span data-label="Время выполнения">
                    {lastCall?.statusUpdatedAt
                      ? formatTimeUtcPlus3(lastCall.statusUpdatedAt)
                      : "—"}
                  </span>
                  <span data-label="Адрес">{lastCall?.address || "—"}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <CallsSection
        activeFilterEntries={activeFilterEntries}
        calls={visibleCalls}
        error={listError}
        filters={filters}
        isFiltersOpen={isFiltersOpen}
        isInitialLoading={isDashboardLoading}
        isRefreshing={isListRefreshing}
        isWorker={isWorker}
        onFilterChange={handleFilterChange}
        onOpenCall={openCall}
        onResetFilters={resetFilters}
        onToggleFilters={() => setIsFiltersOpen((prev) => !prev)}
        onToggleOnlyNew={() => setShowOnlyNew((prev) => !prev)}
        onToggleShowAllCalls={() => setShowAllCalls((prev) => !prev)}
        onToggleSort={toggleSort}
        showAllCalls={showAllCalls}
        showOnlyNew={showOnlyNew}
        sortConfig={sortConfig}
        workers={workers}
      />

      {selectedCall && (
        <CallDetailsModal
          callEditState={callEditState}
          callHistory={visibleCallHistory}
          describeHistoryEntry={describeHistoryEntry}
          hasUnsavedChanges={hasUnsavedCallChanges}
          historyError={historyError}
          isAdmin={isAdmin}
          isBusy={isModalSubmitting}
          isEditValid={isCallEditValid}
          isHistoryLoading={isHistoryLoading}
          isHistoryOpen={isHistoryOpen}
          isLoading={isModalLoading}
          modalError={modalError}
          onCallEditChange={handleCallEditChange}
          onClose={requestCloseCall}
          onDelete={deleteCall}
          onSave={saveCallEdits}
          onStatusChange={updateStatus}
          onToggleHistory={() => setIsHistoryOpen((prev) => !prev)}
          selectedCall={selectedCall}
          workers={workers}
        />
      )}
    </div>
  );
};

export default function App() {
  const [auth, setAuth] = useState(() => readStoredAuth());
  const [authMessage, setAuthMessage] = useState("");

  const handleAuth = (payload) => {
    const authPayload = { token: payload.token, user: payload.user };
    saveStoredAuth(authPayload);
    setAuthMessage("");
    setAuth(authPayload);
  };

  const handleLogout = (message = "") => {
    clearStoredAuth();
    setAuthMessage(message);
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
            <LoginPage authMessage={authMessage} onAuth={handleAuth} />
          </AuthRedirect>
        }
      />
      <Route
        path="/register"
        element={
          <AuthRedirect auth={auth}>
            <RegisterPage authMessage={authMessage} onAuth={handleAuth} />
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
