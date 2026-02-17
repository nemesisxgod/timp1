import { Link, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

import { operatorApi, publicApi } from "./api";

function parseError(error, fallback) {
  return error?.response?.data?.error || fallback;
}

function toRussianStatus(status) {
  return (
    {
      pending: "На проверке",
      approved: "Одобрено",
      rejected: "Отклонено",
    }[status] || status
  );
}

function toRussianAction(action) {
  return (
    {
      submitted: "Заявка отправлена",
      decision_set: "Решение оператора",
    }[action] || action
  );
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function cleanDocumentName(name) {
  if (!name) return "документ";
  const parts = name.split("_");
  return parts.length > 1 ? parts.slice(1).join("_") : name;
}

function TopHeader({ rightNode }) {
  return (
    <header className="header">
      <h1>Панель физической безопасности</h1>
      <div className="header-right">{rightNode}</div>
    </header>
  );
}

function HomePage() {
  const [form, setForm] = useState({ full_name: "", about_info: "" });
  const [documentFile, setDocumentFile] = useState(null);
  const [requestResult, setRequestResult] = useState(null);
  const [statusNumber, setStatusNumber] = useState("");
  const [statusResult, setStatusResult] = useState(null);
  const [error, setError] = useState("");

  const submitRequest = async (event) => {
    event.preventDefault();
    setError("");
    setRequestResult(null);

    if (!form.full_name.trim() || !form.about_info.trim()) {
      setError("Укажите ФИО и краткую информацию о себе");
      return;
    }
    if (!documentFile) {
      setError("Прикрепите документ");
      return;
    }

    const payload = new FormData();
    payload.append("full_name", form.full_name.trim());
    payload.append("about_info", form.about_info.trim());
    payload.append("document", documentFile);

    try {
      const response = await publicApi.post("/verification-requests", payload);
      setRequestResult(response.data);
      setStatusNumber(response.data.request_number || "");
    } catch (e) {
      setError(parseError(e, "Не удалось отправить заявку"));
    }
  };

  const checkStatus = async () => {
    setError("");
    setStatusResult(null);
    if (!statusNumber.trim()) {
      setError("Введите номер заявки");
      return;
    }
    try {
      const response = await publicApi.get(`/verification-requests/status/${statusNumber.trim()}`);
      setStatusResult(response.data);
    } catch (e) {
      setError(parseError(e, "Не удалось проверить статус"));
    }
  };

  return (
    <div className="container">
      <TopHeader
        rightNode={
          <Link className="link-button" to="/operator/login">
            Оператор
          </Link>
        }
      />

      <section className="card">
        <h2>Подтверждение личности</h2>
        {error && <div className="alert">{error}</div>}
        <form className="inline-form" onSubmit={submitRequest}>
          <input
            placeholder="ФИО"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
          <input
            placeholder="Краткая информация о себе"
            value={form.about_info}
            onChange={(e) => setForm({ ...form, about_info: e.target.value })}
          />
          <input
            type="file"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
          />
          <button type="submit">Отправить на проверку</button>
        </form>

        {requestResult && (
          <div className="info-box">
            Уведомление: заявка принята. Номер заявки: <strong>{requestResult.request_number}</strong>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Проверка статуса заявки</h2>
        <div className="inline-form">
          <input
            placeholder="Введите номер заявки"
            value={statusNumber}
            onChange={(e) => setStatusNumber(e.target.value)}
          />
          <button type="button" onClick={checkStatus}>
            Проверить статус
          </button>
        </div>

        {statusResult && (
          <div className="info-box">
            <p>Номер заявки: {statusResult.request_number}</p>
            <p>Статус: {toRussianStatus(statusResult.status)}</p>
            <p>{statusResult.message}</p>
            {statusResult.reason && <p>Причина: {statusResult.reason}</p>}
          </div>
        )}
      </section>
    </div>
  );
}

function OperatorLoginPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const login = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const response = await publicApi.post("/auth/login", form);
      const user = response.data.user;
      if (!["operator", "admin"].includes(user.role)) {
        setError("Доступ только для оператора");
        return;
      }
      localStorage.setItem("operator_access_token", response.data.access_token);
      localStorage.setItem("operator_refresh_token", response.data.refresh_token);
      localStorage.setItem("operator_user", JSON.stringify(user));
      navigate("/operator/dashboard");
    } catch (e) {
      setError(parseError(e, "Не удалось войти"));
    }
  };

  return (
    <div className="container">
      <TopHeader
        rightNode={
          <Link className="link-button" to="/">
            На главную
          </Link>
        }
      />
      <section className="auth-card">
        <h2>Вход оператора</h2>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={login}>
          <input
            placeholder="Логин"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit">Войти</button>
        </form>
        <p>
          Нет аккаунта? <Link to="/operator/register">Регистрация оператора</Link>
        </p>
      </section>
    </div>
  );
}

function OperatorRegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const register = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await publicApi.post("/auth/register-operator", form);
      navigate("/operator/login");
    } catch (e) {
      setError(parseError(e, "Не удалось зарегистрировать оператора"));
    }
  };

  return (
    <div className="container">
      <TopHeader
        rightNode={
          <Link className="link-button" to="/operator/login">
            К входу
          </Link>
        }
      />
      <section className="auth-card">
        <h2>Регистрация оператора</h2>
        {error && <div className="alert">{error}</div>}
        <form onSubmit={register}>
          <input
            placeholder="Логин"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button type="submit">Зарегистрироваться</button>
        </form>
      </section>
    </div>
  );
}

function OperatorDashboardPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [logs, setLogs] = useState([]);
  const [decisionForm, setDecisionForm] = useState({ request_number: "", decision: "approved", comment: "" });
  const [error, setError] = useState("");

  const user = JSON.parse(localStorage.getItem("operator_user") || "null");

  const loadRequests = async () => {
    try {
      const response = await operatorApi.get("/operator/requests?status=pending");
      setRequests(response.data.items || []);
    } catch (e) {
      setError(parseError(e, "Не удалось загрузить заявки"));
    }
  };

  const loadLogs = async () => {
    try {
      const response = await operatorApi.get("/operator/logs");
      setLogs(response.data.items || []);
    } catch (e) {
      setError(parseError(e, "Не удалось загрузить журнал"));
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("operator_access_token");
    if (!token) {
      navigate("/operator/login");
      return;
    }
    loadRequests();
    loadLogs();
  }, [navigate]);

  const submitDecision = async (event) => {
    event.preventDefault();
    setError("");
    if (!decisionForm.request_number.trim() || !decisionForm.comment.trim()) {
      setError("Укажите номер заявки и комментарий");
      return;
    }
    try {
      await operatorApi.post(`/operator/requests/${decisionForm.request_number.trim()}/decision`, {
        decision: decisionForm.decision,
        comment: decisionForm.comment,
      });
      setDecisionForm({ ...decisionForm, comment: "" });
      loadRequests();
      loadLogs();
    } catch (e) {
      setError(parseError(e, "Не удалось сохранить решение"));
    }
  };

  const pickRequest = (requestNumber) => {
    setDecisionForm((prev) => ({ ...prev, request_number: requestNumber }));
  };

  const downloadDocument = async (requestNumber, documentPath) => {
    try {
      const response = await operatorApi.get(`/operator/requests/${requestNumber}/document`, {
        responseType: "blob",
      });
      const blobUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = documentPath?.split("_").slice(1).join("_") || documentPath || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
      setError(parseError(e, "Не удалось скачать документ"));
    }
  };

  const logout = () => {
    localStorage.removeItem("operator_access_token");
    localStorage.removeItem("operator_refresh_token");
    localStorage.removeItem("operator_user");
    navigate("/operator/login");
  };

  return (
    <div className="container">
      <TopHeader
        rightNode={
          <>
            <span>{user?.username || "operator"}</span>
            <button onClick={logout}>Выйти</button>
          </>
        }
      />

      {error && <div className="alert">{error}</div>}

      <section className="card">
        <h2>Заявки на проверку</h2>
        <button onClick={loadRequests}>Обновить</button>
        <ul className="list">
          {requests.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.request_number}</strong>
                <div>{item.full_name}</div>
                <div>{item.about_info}</div>
                <div>
                  Документ:{" "}
                  <a
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      downloadDocument(item.request_number, item.document_path);
                    }}
                  >
                    {cleanDocumentName(item.document_path)}
                  </a>
                </div>
                <div>Статус: {toRussianStatus(item.status)}</div>
                <div>Создано: {formatDateTime(item.created_at)}</div>
              </div>
              <button onClick={() => pickRequest(item.request_number)}>Выбрать</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2>Решение оператора</h2>
        <form className="inline-form" onSubmit={submitDecision}>
          <input
            placeholder="Номер заявки"
            value={decisionForm.request_number}
            onChange={(e) => setDecisionForm({ ...decisionForm, request_number: e.target.value })}
          />
          <select
            value={decisionForm.decision}
            onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
          >
            <option value="approved">Одобрено</option>
            <option value="rejected">Отклонено</option>
          </select>
          <input
            placeholder="Комментарий"
            value={decisionForm.comment}
            onChange={(e) => setDecisionForm({ ...decisionForm, comment: e.target.value })}
          />
          <button type="submit">Сохранить решение</button>
        </form>
      </section>

      <section className="card">
        <h2>Журнал подтверждений</h2>
        <button onClick={loadLogs}>Обновить журнал</button>
        <ul className="list">
          {logs.map((log) => (
            <li key={log.id}>
              <div>
                <strong>{toRussianAction(log.action)}</strong>
                <div>ID заявки: {log.request_id}</div>
                <div>{log.comment}</div>
                <div>{formatDateTime(log.created_at)}</div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/operator/login" element={<OperatorLoginPage />} />
      <Route path="/operator/register" element={<OperatorRegisterPage />} />
      <Route path="/operator/dashboard" element={<OperatorDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
