CREATE OR REPLACE FUNCTION avg_response_time_interval(p_employee_id INT)
RETURNS INTERVAL
LANGUAGE sql
AS $$
    SELECT AVG(i.closed_at - e.event_at)
    FROM incidents i
    JOIN events e ON e.event_id = i.event_id
    WHERE i.responsible_employee_id = p_employee_id
      AND i.closed_at IS NOT NULL
      AND i.status_ = 'closed';
$$;

CREATE OR REPLACE FUNCTION is_threat_level_valid(p_incident_id INT)
RETURNS BOOLEAN
LANGUAGE sql
AS $$
    SELECT (i.threat_level BETWEEN 1 AND 5)
    FROM incidents i
    WHERE i.incident_id = p_incident_id;
$$;

CREATE OR REPLACE FUNCTION count_incidents_in_period(p_start DATE, p_end DATE)
RETURNS INT
LANGUAGE sql
AS $$
    SELECT COUNT(*)::INT
    FROM incidents i
    JOIN events e ON e.event_id = i.event_id
    WHERE e.event_at >= p_start::timestamptz
      AND e.event_at < (p_end::timestamptz + INTERVAL '1 day');
$$;

CREATE OR REPLACE FUNCTION top_events_by_quarter(p_year INT, p_quarter INT)
RETURNS TABLE(event_id INT, event_type VARCHAR(80), incident_count INT)
LANGUAGE plpgsql
AS $$
DECLARE
    q_start DATE;
    q_end DATE;
BEGIN
    IF p_quarter NOT BETWEEN 1 AND 4 THEN
        RAISE EXCEPTION 'Quarter must be 1..4';
    END IF;

    q_start := make_date(p_year, ((p_quarter - 1) * 3) + 1, 1);
    q_end := (q_start + INTERVAL '3 months')::DATE;

    RETURN QUERY
    SELECT e.event_id, e.event_type, COUNT(*)::INT
    FROM incidents i
    JOIN events e ON e.event_id = i.event_id
    WHERE e.event_at >= q_start::timestamptz
      AND e.event_at < q_end::timestamptz
    GROUP BY e.event_id, e.event_type
    ORDER BY COUNT(*) DESC, e.event_id ASC;
END;
$$;
