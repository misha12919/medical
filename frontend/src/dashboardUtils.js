export const defaultFormState = {
  fullName: "",
  address: "",
  age: "",
  birthYear: "",
  diagnosis: "",
  assignedWorkerId: "",
};

export const defaultFilters = {
  fullName: "",
  address: "",
  diagnosis: "",
  workerId: "",
  status: "",
  ageMin: "",
  ageMax: "",
  createdAt: "",
  statusUpdatedAt: "",
};

export const formatTimeUtcPlus3 = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offsetMs = 3 * 60 * 60 * 1000;
  const adjusted = new Date(date.getTime() + offsetMs);
  const hours = String(adjusted.getUTCHours()).padStart(2, "0");
  const minutes = String(adjusted.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
};

export const statusLabels = {
  NEW: "Новый",
  COMPLETED: "Выполнен",
  CANCELLED: "Отменён",
};

export const actionLabels = {
  CREATE: "Создание вызова",
  UPDATE_FIELDS: "Редактирование данных",
  STATUS_CHANGE: "Изменение статуса",
  DELETE: "Удаление вызова",
};

export const fieldLabels = {
  fullName: "ФИО",
  address: "Адрес",
  age: "Возраст",
  createdAt: "Время создания",
  statusUpdatedAt: "Время изменения статуса",
  diagnosis: "Симптомы",
  assignedWorkerId: "Работник",
};

export class ApiRequestError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}

export const buildResponseMessage = (response, payload, messages = {}) => {
  if (response.status === 401) {
    return messages.unauthorized || "Сессия истекла. Войдите снова.";
  }

  if (response.status === 403) {
    return messages.forbidden || "Недостаточно прав для этого действия.";
  }

  if (response.status === 404) {
    return messages.notFound || "Запись не найдена или уже недоступна.";
  }

  return payload?.error || messages.default || "Не удалось выполнить запрос.";
};

export const parseJsonResponse = async (response, messages = {}) => {
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiRequestError(
      buildResponseMessage(response, payload, messages),
      response.status
    );
  }

  return payload;
};

export const getActiveFilterEntries = ({ filters, showOnlyNew, workers }) => {
  const items = [];

  if (showOnlyNew) {
    items.push({ key: "onlyNew", label: "Только новые" });
  }

  if (filters.fullName) {
    items.push({ key: "fullName", label: `ФИО: ${filters.fullName}` });
  }
  if (filters.address) {
    items.push({ key: "address", label: `Адрес: ${filters.address}` });
  }
  if (filters.diagnosis) {
    items.push({ key: "diagnosis", label: `Симптомы: ${filters.diagnosis}` });
  }
  if (filters.workerId) {
    const workerName =
      workers.find((worker) => worker.id === Number(filters.workerId))?.fullName ||
      filters.workerId;
    items.push({ key: "workerId", label: `Работник: ${workerName}` });
  }
  if (filters.status) {
    items.push({
      key: "status",
      label: `Статус: ${statusLabels[filters.status] || filters.status}`,
    });
  }
  if (filters.ageMin) {
    items.push({ key: "ageMin", label: `Возраст от ${filters.ageMin}` });
  }
  if (filters.ageMax) {
    items.push({ key: "ageMax", label: `Возраст до ${filters.ageMax}` });
  }
  if (filters.createdAt) {
    items.push({ key: "createdAt", label: `Создан: ${filters.createdAt}` });
  }
  if (filters.statusUpdatedAt) {
    items.push({
      key: "statusUpdatedAt",
      label: `Статус изменён: ${filters.statusUpdatedAt}`,
    });
  }

  return items;
};

export const getAgeFromFormState = (formState) => {
  const ageRaw = String(formState.age || "").trim();
  const birthYearRaw = String(formState.birthYear || "").trim();

  if (!ageRaw && !birthYearRaw) {
    return 0;
  }

  if (ageRaw && birthYearRaw) {
    return 0;
  }

  if (birthYearRaw) {
    const currentYear = new Date().getFullYear();
    const birthYear = Number(birthYearRaw);

    if (!Number.isInteger(birthYear)) {
      return 0;
    }

    const age = currentYear - birthYear;
    if (birthYear < 1900 || birthYear > currentYear || age <= 0) {
      return 0;
    }

    return age;
  }

  const age = Number(ageRaw);
  return Number.isInteger(age) && age > 0 ? age : 0;
};

export const formatDateTimeLocalValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
};

export const toIsoDateTime = (value) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};
