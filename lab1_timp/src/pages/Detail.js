import React, { useEffect, useState } from "react";
import { NavLink, useParams } from "react-router-dom";
import axios from "axios";
import "./common.css";
import "./Detail.css";

function Detail() {
  const { entity, id } = useParams();
  const entityType = entity || "events";
  const [item, setItem] = useState(null);
  const [severity, setSeverity] = useState("MEDIUM");
  const [cameraState, setCameraState] = useState("ONLINE");
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const isEvent = entityType === "events";

  useEffect(() => {
    setItem(null);
    setError("");
    axios
      .get(`http://localhost:5000/${entityType}/${id}`)
      .then((res) => {
        setItem(res.data);
        setSeverity(res.data.severity || "MEDIUM");
        setCameraState(res.data.state || "ONLINE");
        setComment(res.data.comment || "");
      })
      .catch(() =>
        setError(isEvent ? "Событие не найдено." : "Камера не найдена.")
      );
  }, [entityType, id, isEvent]);

  const handleSave = async () => {
    if (!item) return;
    try {
      const payload = isEvent
        ? {
            severity,
            comment,
          }
        : {
            state: cameraState,
            comment,
            lastCheck: new Date().toLocaleString("ru-RU"),
          };
      const res = await axios.patch(
        `http://localhost:5000/${entityType}/${item.id}`,
        payload
      );
      setItem(res.data);
    } catch {
      setError(
        isEvent ? "Не удалось обновить событие." : "Не удалось обновить камеру."
      );
    }
  };

  const badgeValue = item ? (isEvent ? item.severity : item.state) : "UNKNOWN";
  const badgeClass =
    badgeValue === "CRITICAL" || badgeValue === "OFFLINE"
      ? "detail__badge--critical"
      : badgeValue === "LOW" || badgeValue === "ONLINE"
      ? "detail__badge--low"
      : "detail__badge--medium";

  return (
    <main className="detail">
      <header className="detail__header">
        <div>
          <h1 className="detail__title">
            {isEvent ? "Детализация события" : "Детализация камеры"}
          </h1>
          <NavLink className="btn btn--primary btn--link" to="/">
            На главную
          </NavLink>
        </div>
        {item ? (
          <div className={`detail__badge ${badgeClass}`}>
            {badgeValue}
          </div>
        ) : (
          <div className="detail__badge">UNKNOWN</div>
        )}
      </header>

      <section className="detail__grid">
        <div className="card">
          <h2 className="card__title">Основные параметры</h2>
          {item ? (
            <>
              {isEvent ? (
                <>
                  <div className="row">
                    <span className="row__label">Тип события</span>
                    <span className="row__value">{item.type}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Зона/объект</span>
                    <span className="row__value">{item.zone}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Время</span>
                    <span className="row__value">{item.time}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Ответственный</span>
                    <span className="row__value">{item.responsible}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="row">
                    <span className="row__label">Камера</span>
                    <span className="row__value">{item.name}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Состояние</span>
                    <span className="row__value">{item.state}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Местоположение</span>
                    <span className="row__value">{item.location}</span>
                  </div>
                  <div className="row">
                    <span className="row__label">Тип камеры</span>
                    <span className="row__value">{item.type}</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="detail__text">{error}</div>
          )}
        </div>

        <div className="card">
          <h2 className="card__title">{isEvent ? "Описание" : "Статус камеры"}</h2>
          {item ? (
            isEvent ? (
              <>
                <label className="field">
                  <span className="field__label">Критичность</span>
                  <select
                    className="field__control"
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value)}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Комментарий</span>
                  <textarea
                    className="field__control field__control--textarea"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>

                <div className="card__actions">
                  <button className="btn btn--primary" type="button" onClick={handleSave}>
                    Сохранить
                  </button>
                </div>
              </>
            ) : (
              <>
                <label className="field">
                  <span className="field__label">Состояние</span>
                  <select
                    className="field__control"
                    value={cameraState}
                    onChange={(e) => setCameraState(e.target.value)}
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </label>

                <label className="field">
                  <span className="field__label">Комментарий</span>
                  <textarea
                    className="field__control field__control--textarea"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                  />
                </label>

                <div className="row">
                  <span className="row__label">Последняя проверка</span>
                  <span className="row__value">{item.lastCheck}</span>
                </div>

                <div className="card__actions">
                  <button className="btn btn--primary" type="button" onClick={handleSave}>
                    Сохранить
                  </button>
                </div>
              </>
            )
          ) : (
            <p className="detail__text">
              {isEvent ? "Комментарий к событию отсутствует." : "Данные о камере отсутствуют."}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}

export default Detail;
