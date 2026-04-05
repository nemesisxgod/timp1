import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import "./common.css";
import "./Home.css";

function Home({
  events,
  setEvents,
  cameras,
  setCameras,
  isLoading,
  error,
  setError,
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    axios
      .delete(`http://localhost:5000/events/${id}`)
      .then(() => setEvents((prev) => prev.filter((item) => item.id !== id)))
      .catch(() => setError("Не удалось удалить событие."));
  };

  const handleCameraDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    axios
      .delete(`http://localhost:5000/cameras/${id}`)
      .then(() => setCameras((prev) => prev.filter((item) => item.id !== id)))
      .catch(() => setError("Не удалось удалить камеру."));
  };

  const getBadgeClass = (value) => {
    if (value === "CRITICAL" || value === "OFFLINE") {
      return "event__badge--critical";
    }
    if (value === "LOW" || value === "ONLINE") {
      return "event__badge--low";
    }
    return "event__badge--medium";
  };

  const severityPriority = {
    LOW: 1,
    MEDIUM: 2,
    CRITICAL: 3,
  };

  const severityColor = {
    LOW: "#3f95d1",
    MEDIUM: "#94b83d",
    CRITICAL: "#d05968",
  };

  const zonesStats = events.reduce((acc, event) => {
    const zoneName = event.zone || "Не указано";
    const current = acc[zoneName] || { zone: zoneName, count: 0, severity: "LOW" };
    const nextSeverity =
      severityPriority[event.severity] > severityPriority[current.severity]
        ? event.severity
        : current.severity;

    acc[zoneName] = {
      zone: zoneName,
      count: current.count + 1,
      severity: nextSeverity,
    };

    return acc;
  }, {});

  const zoneBars = Object.values(zonesStats)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const maxZoneCount = zoneBars.length ? Math.max(...zoneBars.map((item) => item.count)) : 1;
  const middleMark = Math.max(1, Math.ceil(maxZoneCount / 2));

  return (
    <main className="home">
      <header className="home__header">
        <div className="home__headline">
          <h1 className="home__title">Пульт физической безопасности</h1>
        </div>
        <div className="home__actions">
          <Link className="btn btn--primary btn--link" to="/add">
            Добавить событие
          </Link>
          <Link className="btn btn--ghost btn--link" to="/add?entity=cameras">
            Добавить камеру
          </Link>
          <div className="home__time">Время: {now.toLocaleString("ru-RU")}</div>
        </div>
      </header>

      <section className="home__grid">
        <div className="home__content">
          <div className="card card--wide">
            <h2 className="card__title">Журнал событий</h2>

            {isLoading ? (
              <div className="event event--empty">
                <div className="event__time">Загрузка...</div>
              </div>
            ) : error ? (
              <div className="event event--empty">
                <div className="event__time">{error}</div>
              </div>
            ) : events.length === 0 ? (
              <div className="event event--empty">
                <div className="event__time">Событий пока нет</div>
              </div>
            ) : (
              <div className="event-grid">
                {events.map((event) => (
                  <Link
                    className="event event--link"
                    to={`/detail/events/${event.id}`}
                    key={event.id}
                  >
                    <div className="event__meta">
                      <span className={`event__badge ${getBadgeClass(event.severity)}`}>
                        {event.severity}
                      </span>
                    </div>
                    <div className="event__title">{event.zone}</div>
                    <div className="event__time">{event.time}</div>
                    <button
                      className="btn btn--danger btn--small"
                      type="button"
                      onClick={(e) => handleDelete(e, event.id)}
                    >
                      Удалить
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="card card--wide">
            <h2 className="card__title">Камеры наблюдения</h2>

            {isLoading ? (
              <div className="event event--empty">
                <div className="event__time">Загрузка...</div>
              </div>
            ) : error ? (
              <div className="event event--empty">
                <div className="event__time">{error}</div>
              </div>
            ) : cameras.length === 0 ? (
              <div className="event event--empty">
                <div className="event__time">Камеры пока не добавлены</div>
              </div>
            ) : (
              <div className="event-grid">
                {cameras.map((camera) => (
                  <Link
                    className="event event--link"
                    to={`/detail/cameras/${camera.id}`}
                    key={camera.id}
                  >
                    <div className="event__meta">
                      <span className={`event__badge ${getBadgeClass(camera.state)}`}>
                        {camera.state}
                      </span>
                    </div>
                    <div className="event__title">{camera.name}</div>
                    <div className="event__time">{camera.location}</div>
                    <button
                      className="btn btn--danger btn--small"
                      type="button"
                      onClick={(e) => handleCameraDelete(e, camera.id)}
                    >
                      Удалить
                    </button>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="card home__analytics">
          <div className="home__analytics-header">
            <h2 className="card__title">Анализ событий по зонам</h2>
          </div>

          {isLoading ? (
            <div className="chart-empty">Загрузка аналитики...</div>
          ) : zoneBars.length === 0 ? (
            <div className="chart-empty">Недостаточно данных для построения диаграммы.</div>
          ) : (
            <div className="zone-chart">
              <div className="zone-chart__y-axis">
                <span>{maxZoneCount}</span>
                <span>{middleMark}</span>
                <span>0</span>
              </div>

              <div className="zone-chart__plot">
                {zoneBars.map((item) => (
                  <div className="zone-chart__column" key={item.zone}>
                    <div className="zone-chart__value">{item.count}</div>
                    <div className="zone-chart__bar-area">
                      <div
                        className="zone-chart__bar"
                        style={{
                          height: `${(item.count / maxZoneCount) * 100}%`,
                          background: severityColor[item.severity] || severityColor.MEDIUM,
                        }}
                      />
                    </div>
                    <span className={`event__badge ${getBadgeClass(item.severity)}`}>
                      {item.severity}
                    </span>
                    <div className="zone-chart__label" title={item.zone}>
                      {item.zone}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

export default Home;
