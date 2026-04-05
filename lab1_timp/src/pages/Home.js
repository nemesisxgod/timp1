import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import "./common.css";
import "./Home.css";

function Home() {
  const [now, setNow] = useState(new Date());
  const [events, setEvents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const location = useLocation();

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [eventsResponse, camerasResponse] = await Promise.all([
          axios.get("http://localhost:5000/events"),
          axios.get("http://localhost:5000/cameras"),
        ]);
        setEvents(eventsResponse.data);
        setCameras(camerasResponse.data);
      } catch {
        setError("Не удалось загрузить данные.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [location.key]);

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
      </section>
    </main>
  );
}

export default Home;
