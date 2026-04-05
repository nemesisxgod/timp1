import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import "./common.css";
import "./Form.css";

function Form() {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const entityType = searchParams.get("entity") === "cameras" ? "cameras" : "events";
  const isCamera = entityType === "cameras";
  const [type, setType] = useState(isCamera ? "FIXED" : "DOOR_OPEN");
  const [zone, setZone] = useState("");
  const [responsible, setResponsible] = useState("");
  const [severity, setSeverity] = useState("LOW");
  const [cameraState, setCameraState] = useState("ONLINE");
  const [comment, setComment] = useState("");

  const handleAdd = async () => {
    const payload = isCamera
      ? {
          name: zone.trim() || "Новая камера",
          state: cameraState,
          location: responsible.trim() || "Не указано",
          type,
          lastCheck: new Date().toLocaleString("ru-RU"),
          comment: comment.trim(),
        }
      : {
          type,
          zone: zone.trim() || "Не указано",
          responsible: responsible.trim() || "Не указан",
          severity,
          time: new Date().toLocaleString("ru-RU"),
          comment: comment.trim(),
        };

    await axios.post(`http://localhost:5000/${entityType}`, payload);
    navigate("/");
  };

  const handleClear = () => {
    setType(isCamera ? "FIXED" : "DOOR_OPEN");
    setZone("");
    setResponsible("");
    setSeverity("LOW");
    setCameraState("ONLINE");
    setComment("");
  };

  return (
    <main className="form-page">
      <header className="form-page__header">
        <div className="form-page__headline">
          <h1 className="form-page__title">
            {isCamera ? "Новая камера" : "Новая запись журнала"}
          </h1>
          <NavLink className="btn btn--primary btn--link" to="/">
            На главную
          </NavLink>
        </div>
      </header>

      <section className="form-page__grid">
        <div className="card card--wide">
          <div className="form-page__layout">
            <div className="form-page__column">
              <label className="field">
                <span className="field__label">{isCamera ? "Тип камеры" : "Тип события"}</span>
                <select
                  className="field__control"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                >
                  {isCamera ? (
                    <>
                      <option value="FIXED">Фиксированная</option>
                      <option value="PTZ">Поворотная</option>
                      <option value="THERMAL">Тепловизионная</option>
                    </>
                  ) : (
                    <>
                      <option value="DOOR_OPEN">Открытие двери</option>
                      <option value="ACCESS_ATTEMPT">Попытка доступа</option>
                      <option value="ALARM">Срабатывание датчика</option>
                    </>
                  )}
                </select>
              </label>

              <label className="field">
                <span className="field__label">
                  {isCamera ? "Название камеры" : "Зона/объект"}
                </span>
                <input
                  className="field__control"
                  type="text"
                  value={zone}
                  onChange={(event) => setZone(event.target.value)}
                />
              </label>

              <label className="field">
                <span className="field__label">
                  {isCamera ? "Местоположение" : "Ответственный"}
                </span>
                <input
                  className="field__control"
                  type="text"
                  value={responsible}
                  onChange={(event) => setResponsible(event.target.value)}
                />
              </label>
            </div>

            <div className="form-page__column">
              {isCamera ? (
                <label className="field">
                  <span className="field__label">Состояние</span>
                  <select
                    className="field__control"
                    value={cameraState}
                    onChange={(event) => setCameraState(event.target.value)}
                  >
                    <option value="ONLINE">ONLINE</option>
                    <option value="OFFLINE">OFFLINE</option>
                  </select>
                </label>
              ) : (
                <label className="field">
                  <span className="field__label">Критичность</span>
                  <select
                    className="field__control"
                    value={severity}
                    onChange={(event) => setSeverity(event.target.value)}
                  >
                    <option value="LOW">Низкая</option>
                    <option value="MEDIUM">Средняя</option>
                    <option value="CRITICAL">Высокая</option>
                  </select>
                </label>
              )}

              <label className="field">
                <span className="field__label">Комментарий</span>
                <textarea
                  className="field__control field__control--textarea"
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                />
              </label>

              <div className="card__actions">
                <button className="btn btn--primary" onClick={handleAdd}>
                  {isCamera ? "Добавить камеру" : "Добавить событие"}
                </button>
                <button className="btn btn--ghost" onClick={handleClear}>
                  Очистить
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Form;
