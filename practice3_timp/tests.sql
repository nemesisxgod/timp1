
INSERT INTO incident_sources (source_type)
VALUES ('system'), ('device'), ('person');

INSERT INTO employees (last_name, first_name, middle_name, position, phone, email)
VALUES
('Петров','Иван',NULL,'Аналитик безопасности',790000001,'ivan.petrov@example.com'),
('Сидорова','Ольга',NULL,'Дежурный офицер',790000002,'olga.sidorova@example.com');

INSERT INTO events (event_type, event_at, zone_, criticality, description_, reported_by)
VALUES
('Взлом двери', now() - INTERVAL '6 hours', 'Склад', 2, 'Дверь открыта без пропуска', 1),
('Проход хвостом', now() - INTERVAL '3 hours', 'Ворота А', 4, 'Посторонний прошел вслед за сотрудником', 2);

SELECT 'sources' AS table_name, * FROM incident_sources;
SELECT 'employees' AS table_name, * FROM employees;
SELECT 'events' AS table_name, * FROM events ORDER BY event_id;


-- Инцидент по событию с меньшей критичностью (2), но с угрозой 4
-- Триггер поднимет criticality события до 4
INSERT INTO incidents (
    incident_type, threat_level, status_, short_desc,
    source_id, responsible_employee_id, event_id
) VALUES (
    'Несанкционированный доступ',
    4,
    'open',
    'Попытка входа в складскую зону',
    2,
    1,
    1
);


INSERT INTO incidents (
    incident_type, threat_level, status_, short_desc,
    source_id, responsible_employee_id, event_id
) VALUES (
    'Проход хвостом',
    2,
    'in_progress',
    'Посторонний прошел вслед за сотрудником',
    1,
    2,
    2
);

-- закрытый инцидент для расчета среднего
INSERT INTO events (event_type, event_at, zone_, criticality, description_, reported_by)
VALUES ('Открытая дверь', now() - INTERVAL '12 hours', 'Склад', 3, 'Дверь осталась открыта', 1);

INSERT INTO incidents (
    incident_type, threat_level, status_, short_desc,
    source_id, responsible_employee_id, event_id, closed_at
) VALUES (
    'Нарушение режима доступа',
    3,
    'closed',
    'Дверь оставили открытой',
    2,
    1,
    3,
    now() - INTERVAL '8 hours'
);

INSERT INTO events (event_type, event_at, zone_, criticality, description_, reported_by)
VALUES ('Сработка датчика', now() - INTERVAL '9 hours', 'Ворота А', 1, 'Ложная тревога', 2);

INSERT INTO incidents (
    incident_type, threat_level, status_, short_desc,
    source_id, responsible_employee_id, event_id, closed_at
) VALUES (
    'Сработка датчика',
    1,
    'closed',
    'Проверка ложного срабатывания',
    1,
    1,
    4,
    now() - INTERVAL '7 hours'
);

SELECT 'incidents' AS table_name, * FROM incidents ORDER BY incident_id;
SELECT 'events after trigger' AS table_name, event_id, criticality FROM events ORDER BY event_id;

-- Меры реагирования
INSERT INTO response_actions (incident_id) VALUES (1), (1), (2);
SELECT 'response_actions' AS table_name, * FROM response_actions ORDER BY action_id;

-- Закрытие инцидента и аудит
UPDATE incidents
SET status_ = 'closed',
    closed_at = now()
WHERE incident_id = 1;

SELECT 'incidents after close' AS table_name, incident_id, status_, closed_at FROM incidents ORDER BY incident_id;
SELECT 'incident_log' AS table_name, * FROM incident_log ORDER BY log_id;


-- проверка функций
SELECT avg_response_time_interval(1) AS avg_resolution_time;
SELECT is_threat_level_valid(1) AS threat_ok_for_incident_1;
SELECT count_incidents_in_period(CURRENT_DATE - 7, CURRENT_DATE) AS last_7_days;
SELECT * FROM top_events_by_quarter(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 1);


INSERT INTO incidents (incident_type, threat_level, status_, short_desc, source_id, responsible_employee_id, event_id)
VALUES ('Тестовый инцидент', 3, 'open', 'Проверка аудита', 1, 1, 1);
SELECT * FROM incident_log ORDER BY log_id DESC LIMIT 1;


UPDATE incidents
SET short_desc = 'Обновили описание'
WHERE incident_id = 1;
SELECT * FROM incident_log ORDER BY log_id DESC LIMIT 1;


INSERT INTO incidents (incident_type, threat_level, status_, short_desc, source_id, responsible_employee_id, event_id)
VALUES ('Тест угрозы', 10, 'open', 'Должно стать 3', 1, 1, 1);
SELECT incident_id, threat_level FROM incidents ORDER BY incident_id DESC LIMIT 1;


INSERT INTO events (event_type, event_at, zone_, criticality, description_, reported_by)
VALUES ('Тест события', now(), 'Зона Тест', 1, 'Критичность низкая', 1);
INSERT INTO incidents (incident_type, threat_level, status_, short_desc, source_id, responsible_employee_id, event_id)
VALUES ('Тест повыш.', 4, 'open', 'Критичность события должна подняться', 1, 1, currval('events_event_id_seq'));
SELECT event_id, criticality FROM events ORDER BY event_id DESC LIMIT 1;
