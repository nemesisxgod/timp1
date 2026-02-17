TRUNCATE TABLE security_plans, incidents, checkpoints, facilities, users RESTART IDENTITY CASCADE;

INSERT INTO users (username, email, password_hash, role) VALUES
  ('admin_ru', 'admin1@mailru', 'demo_hash_admin', 'admin'),
  ('operator_ru', 'operator1@mailru', 'demo_hash_operator', 'operator'),
  ('inspector_ru', 'inspector1@mailru', 'demo_hash_inspector', 'operator');

INSERT INTO facilities (name, address, security_level) VALUES
  ('Склад Север', 'ул. Промышленная, 10', 'high'),
  ('Офис Центр', 'пр-т Мира, 25', 'medium'),
  ('КПП Южный', 'Объездное шоссе, 3', 'critical');

INSERT INTO checkpoints (facility_id, name, status, zone, last_check_at)
SELECT f.id, v.name, v.status, v.zone, NOW()
FROM facilities f
JOIN (VALUES
  ('Склад Север', 'Пост 1', 'active', 'Въезд'),
  ('Склад Север', 'Пост 2', 'maintenance', 'Складская зона'),
  ('Офис Центр', 'Ресепшен', 'active', 'Главный вход'),
  ('КПП Южный', 'Турникет А', 'blocked', 'Периметр')
) AS v(facility_name, name, status, zone)
  ON f.name = v.facility_name;

INSERT INTO incidents (facility_id, author_id, title, description, severity, status, happened_at)
SELECT f.id, u.id, v.title, v.description, v.severity, v.status, NOW() - v.shift
FROM users u
JOIN facilities f ON TRUE
JOIN (VALUES
  ('admin_ru', 'Склад Север', 'Несанкционированный доступ', 'Попытка входа через служебную дверь', 'high', 'open', INTERVAL '2 hours'),
  ('operator_ru', 'Офис Центр', 'Сбой камеры', 'Камера на входе временно не отвечает', 'medium', 'open', INTERVAL '5 hours'),
  ('inspector_ru', 'КПП Южный', 'Подозрительный транспорт', 'Автомобиль без пропуска у шлагбаума', 'critical', 'resolved', INTERVAL '1 day')
) AS v(username, facility_name, title, description, severity, status, shift)
  ON u.username = v.username AND f.name = v.facility_name;

INSERT INTO security_plans (facility_id, author_id, title, description, effective_from, effective_to, status)
SELECT f.id, u.id, v.title, v.description, v.effective_from, v.effective_to, v.status
FROM users u
JOIN facilities f ON TRUE
JOIN (VALUES
  ('admin_ru', 'Склад Север', 'План усиления периметра', 'Усиленные проверки на въезде и обход каждые 30 минут', CURRENT_DATE, CURRENT_DATE + 30, 'active'),
  ('operator_ru', 'Офис Центр', 'План эвакуации', 'Актуализация маршрутов эвакуации и инструктаж персонала', CURRENT_DATE, CURRENT_DATE + 60, 'draft'),
  ('inspector_ru', 'КПП Южный', 'План контроля транспорта', 'Дополнительная проверка пропусков транспорта', CURRENT_DATE - 10, CURRENT_DATE + 20, 'active')
) AS v(username, facility_name, title, description, effective_from, effective_to, status)
  ON u.username = v.username AND f.name = v.facility_name;
