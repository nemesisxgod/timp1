import { Link, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./AuthContext";
import ProtectedRoute from "./ProtectedRoute";
import api from "./api";
import { useEffect, useState } from "react";

function AppShell() {
  return (
    <AuthProvider>
      <GlobalErrorBanner />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Layout>
                <ProfilePage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/facilities"
          element={
            <ProtectedRoute>
              <Layout>
                <FacilitiesPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/incidents"
          element={
            <ProtectedRoute>
              <Layout>
                <IncidentsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/checkpoints"
          element={
            <ProtectedRoute>
              <Layout>
                <CheckpointsPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/security-plans"
          element={
            <ProtectedRoute>
              <Layout>
                <SecurityPlansPage />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

function GlobalErrorBanner() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    const syncMessage = () => {
      const msg = sessionStorage.getItem("global_error_message") || "";
      setMessage(msg);
    };
    syncMessage();
    window.addEventListener("global-error", syncMessage);
    return () => window.removeEventListener("global-error", syncMessage);
  }, []);

  if (!message) {
    return null;
  }

  return (
    <div className="container">
      <div className="alert global-alert">
        {message}
        <button
          className="alert-close"
          onClick={() => {
            sessionStorage.removeItem("global_error_message");
            setMessage("");
          }}
        >
          Закрыть
        </button>
      </div>
    </div>
  );
}

function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="container">
      <header className="header">
        <h1>Панель физической безопасности</h1>
        <nav>
          <Link to="/dashboard">Главная</Link>
          <Link to="/facilities">Объекты</Link>
          <Link to="/checkpoints">Посты</Link>
          <Link to="/incidents">Инциденты</Link>
          <Link to="/security-plans">Планы</Link>
          <Link to="/profile">Профиль</Link>
        </nav>
        <div className="header-right">
          <span>{user?.username}</span>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Выйти
          </button>
        </div>
      </header>
      {children}
    </div>
  );
}

function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("auth") === "required") {
      setError("Сессия истекла или доступ запрещен. Выполните вход снова.");
      window.history.replaceState({}, "", "/login");
      return;
    }
    const authErrorMessage = sessionStorage.getItem("auth_error_message");
    if (authErrorMessage) {
      setError(authErrorMessage);
      sessionStorage.removeItem("auth_error_message");
    }
  }, [location.search]);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await login(form.username, form.password);
      navigate("/dashboard");
    } catch (e) {
      setError(e.response?.data?.error || "Не удалось выполнить вход");
    }
  };

  return (
    <div className="auth-card">
      <h2>Вход</h2>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Логин" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input
          placeholder="Пароль"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit">Войти</button>
      </form>
      <p>
        Нет аккаунта? <Link to="/register">Регистрация</Link>
      </p>
    </div>
  );
}

function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    try {
      await register(form);
      navigate("/login");
    } catch (e) {
      setError(e.response?.data?.error || "Не удалось зарегистрироваться");
    }
  };

  return (
    <div className="auth-card">
      <h2>Регистрация</h2>
      {error && <div className="alert">{error}</div>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Логин" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input
          placeholder="Пароль"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <button type="submit">Создать аккаунт</button>
      </form>
      <p>
        Назад к <Link to="/login">входу</Link>
      </p>
    </div>
  );
}

function DashboardPage() {
  const [stats, setStats] = useState({ facilities: 0, checkpoints: 0, incidents: 0, securityPlans: 0 });

  useEffect(() => {
    Promise.all([
      api.get("/facilities?per_page=1"),
      api.get("/checkpoints?per_page=1"),
      api.get("/incidents?per_page=1"),
      api.get("/security-plans?per_page=1")
    ])
      .then(([fRes, cRes, iRes, pRes]) => {
        setStats({
          facilities: fRes.data.total,
          checkpoints: cRes.data.total,
          incidents: iRes.data.total,
          securityPlans: pRes.data.total
        });
      })
      .catch(() => {});
  }, []);

  return (
    <section className="grid">
      <article className="card">
        <h3>Объекты</h3>
        <p>{stats.facilities}</p>
      </article>
      <article className="card">
        <h3>Инциденты</h3>
        <p>{stats.incidents}</p>
      </article>
      <article className="card">
        <h3>Посты</h3>
        <p>{stats.checkpoints}</p>
      </article>
      <article className="card">
        <h3>Планы безопасности</h3>
        <p>{stats.securityPlans}</p>
      </article>
    </section>
  );
}

function ProfilePage() {
  const { user } = useAuth();
  return (
    <section className="card">
      <h2>Профиль</h2>
      <p>Логин: {user?.username}</p>
      <p>Email: {user?.email}</p>
      <p>Роль: {user?.role}</p>
    </section>
  );
}

function FacilitiesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", address: "", security_level: "medium" });
  const securityLevelLabel = (level) =>
    ({
      low: "Низкий",
      medium: "Средний",
      high: "Высокий",
      critical: "Критический"
    }[level] || level);

  const loadFacilities = async () => {
    try {
      const response = await api.get("/facilities?page=1&per_page=20");
      setItems(response.data.items);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  const createFacility = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/facilities", form);
      setForm({ name: "", address: "", security_level: "medium" });
      loadFacilities();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  const removeFacility = async (id) => {
    setError("");
    try {
      await api.delete(`/facilities/${id}`);
      loadFacilities();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  return (
    <section>
      <h2>Объекты</h2>
      {error && <div className="alert">{error}</div>}
      <form className="inline-form" onSubmit={createFacility}>
        <input value={form.name} placeholder="Название" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input value={form.address} placeholder="Адрес" onChange={(e) => setForm({ ...form, address: e.target.value })} />
        <select value={form.security_level} onChange={(e) => setForm({ ...form, security_level: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <button type="submit">Добавить</button>
      </form>
      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="facility-info">
              <strong>{item.name}</strong>
              <div className="facility-meta">
                <span className="facility-badge">Уровень: {securityLevelLabel(item.security_level)}</span>
                <span>{item.address}</span>
              </div>
            </div>
            {user?.role === "admin" && <button onClick={() => removeFacility(item.id)}>Удалить</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function IncidentsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  const [form, setForm] = useState({
    facility_id: "",
    title: "",
    description: "",
    severity: "low"
  });
  const facilityNameById = (id) => facilities.find((f) => f.id === id)?.name || `Объект #${id}`;

  const loadIncidents = async (status = "") => {
    try {
      const query = status ? `?status=${status}` : "";
      const response = await api.get(`/incidents${query}`);
      setItems(response.data.items);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  useEffect(() => {
    api
      .get("/facilities?per_page=100")
      .then((res) => setFacilities(res.data.items))
      .catch(() => {});
    loadIncidents();
  }, []);

  const createIncident = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/incidents", { ...form, facility_id: Number(form.facility_id) });
      setForm({ facility_id: "", title: "", description: "", severity: "low" });
      loadIncidents(filter);
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  const markResolved = async (id) => {
    setError("");
    try {
      await api.put(`/incidents/${id}`, { status: "resolved" });
      loadIncidents(filter);
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  const removeIncident = async (id) => {
    setError("");
    try {
      await api.delete(`/incidents/${id}`);
      loadIncidents(filter);
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  return (
    <section>
      <h2>Инциденты</h2>
      {error && <div className="alert">{error}</div>}
      <div className="filter-row">
        <select
          className={filter === "" ? "is-placeholder" : ""}
          value={filter}
          onChange={(e) => {
            const value = e.target.value;
            setFilter(value);
            loadIncidents(value);
          }}
        >
          <option value="">все статусы</option>
          <option value="open">открыт</option>
          <option value="resolved">решен</option>
        </select>
      </div>
      <form className="inline-form" onSubmit={createIncident}>
        <select
          className={form.facility_id === "" ? "is-placeholder" : ""}
          value={form.facility_id}
          onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
        >
          <option value="">Объект</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input value={form.title} placeholder="Заголовок" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input
          value={form.description}
          placeholder="Описание"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="critical">critical</option>
        </select>
        <button type="submit">Добавить</button>
      </form>
      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="incident-info">
              <strong>{item.title}</strong> [{item.severity}] ({item.status})
              <div className="incident-facility">Объект: {facilityNameById(item.facility_id)}</div>
              <div className="incident-description">{item.description}</div>
            </div>
            <div className="incident-actions">
              <button onClick={() => markResolved(item.id)}>Закрыть</button>
              {user?.role === "admin" && <button onClick={() => removeIncident(item.id)}>Удалить</button>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CheckpointsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    facility_id: "",
    name: "",
    zone: "",
    status: "active"
  });
  const facilityNameById = (id) => facilities.find((f) => f.id === id)?.name || `Объект #${id}`;

  const loadCheckpoints = async () => {
    try {
      const response = await api.get("/checkpoints?page=1&per_page=50");
      setItems(response.data.items);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  useEffect(() => {
    api
      .get("/facilities?per_page=100")
      .then((res) => setFacilities(res.data.items))
      .catch(() => {});
    loadCheckpoints();
  }, []);

  const createCheckpoint = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/checkpoints", {
        ...form,
        facility_id: Number(form.facility_id)
      });
      setForm({ facility_id: "", name: "", zone: "", status: "active" });
      loadCheckpoints();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  const removeCheckpoint = async (id) => {
    setError("");
    try {
      await api.delete(`/checkpoints/${id}`);
      loadCheckpoints();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  return (
    <section>
      <h2>Контрольные посты</h2>
      {error && <div className="alert">{error}</div>}
      <form className="inline-form" onSubmit={createCheckpoint}>
        <select
          className={form.facility_id === "" ? "is-placeholder" : ""}
          value={form.facility_id}
          onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
        >
          <option value="">Объект</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input value={form.name} placeholder="Название поста" onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input value={form.zone} placeholder="Зона" onChange={(e) => setForm({ ...form, zone: e.target.value })} />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">active</option>
          <option value="maintenance">maintenance</option>
          <option value="blocked">blocked</option>
        </select>
        <button type="submit">Добавить</button>
      </form>
      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="incident-info">
              <strong>{item.name}</strong> ({item.status})
              <div className="incident-facility">Объект: {facilityNameById(item.facility_id)}</div>
              <div className="incident-description">Зона: {item.zone}</div>
            </div>
            {user?.role === "admin" && <button onClick={() => removeCheckpoint(item.id)}>Удалить</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

function SecurityPlansPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    facility_id: "",
    title: "",
    description: "",
    effective_from: "",
    effective_to: "",
    status: "draft"
  });
  const facilityNameById = (id) => facilities.find((f) => f.id === id)?.name || `Объект #${id}`;

  const loadPlans = async () => {
    try {
      const response = await api.get("/security-plans?page=1&per_page=50");
      setItems(response.data.items);
      setError("");
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  useEffect(() => {
    api
      .get("/facilities?per_page=100")
      .then((res) => setFacilities(res.data.items))
      .catch(() => {});
    loadPlans();
  }, []);

  const createPlan = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await api.post("/security-plans", {
        ...form,
        facility_id: Number(form.facility_id)
      });
      setForm({
        facility_id: "",
        title: "",
        description: "",
        effective_from: "",
        effective_to: "",
        status: "draft"
      });
      loadPlans();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  const removePlan = async (id) => {
    setError("");
    try {
      await api.delete(`/security-plans/${id}`);
      loadPlans();
    } catch (e) {
      setError(e.response?.data?.error || "");
    }
  };

  return (
    <section>
      <h2>Планы безопасности</h2>
      {error && <div className="alert">{error}</div>}
      <form className="inline-form" onSubmit={createPlan}>
        <select
          className={form.facility_id === "" ? "is-placeholder" : ""}
          value={form.facility_id}
          onChange={(e) => setForm({ ...form, facility_id: e.target.value })}
        >
          <option value="">Объект</option>
          {facilities.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input value={form.title} placeholder="Заголовок плана" onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input
          value={form.description}
          placeholder="Описание плана"
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
        <input
          type="date"
          value={form.effective_from}
          onChange={(e) => setForm({ ...form, effective_from: e.target.value })}
        />
        <input
          type="date"
          value={form.effective_to}
          onChange={(e) => setForm({ ...form, effective_to: e.target.value })}
        />
        <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="draft">черновик</option>
          <option value="active">активен</option>
          <option value="archived">архив</option>
        </select>
        <button type="submit">Добавить</button>
      </form>
      <ul className="list">
        {items.map((item) => (
          <li key={item.id}>
            <div className="incident-info">
              <strong>{item.title}</strong> ({item.status})
              <div className="incident-facility">Объект: {facilityNameById(item.facility_id)}</div>
              <div className="incident-description">{item.description}</div>
              <div className="incident-description">
                Срок: {item.effective_from} - {item.effective_to}
              </div>
            </div>
            {user?.role === "admin" && <button onClick={() => removePlan(item.id)}>Удалить</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export default AppShell;
