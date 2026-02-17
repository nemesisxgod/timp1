DROP TABLE IF EXISTS incident_log CASCADE;
DROP TABLE IF EXISTS response_actions CASCADE;
DROP TABLE IF EXISTS incidents CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS incident_sources CASCADE;

CREATE TABLE incident_sources (
    source_id SERIAL PRIMARY KEY,
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('system','device','person'))
);

CREATE TABLE employees (
    employee_id SERIAL PRIMARY KEY,
    last_name VARCHAR(80) NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    middle_name VARCHAR(80),
    position VARCHAR(120) NOT NULL,
    phone INT,
    email VARCHAR(100)
);

CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    event_type VARCHAR(80) NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    zone_ VARCHAR(100),
    criticality INT NOT NULL DEFAULT 3 CHECK (criticality BETWEEN 1 AND 5),
    description_ VARCHAR(500),
    reported_by INT REFERENCES employees(employee_id),
    last_modified TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE incidents (
    incident_id SERIAL PRIMARY KEY,
    incident_type VARCHAR(80) NOT NULL,
    threat_level INT NOT NULL DEFAULT 3 CHECK (threat_level BETWEEN 1 AND 5),
    status_ VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status_ IN ('open','in_progress','localized','closed')),
    short_desc VARCHAR(500),
    source_id INT REFERENCES incident_sources(source_id),
    responsible_employee_id INT REFERENCES employees(employee_id),
    event_id INT REFERENCES events(event_id),
    closed_at TIMESTAMPTZ
);

CREATE TABLE response_actions (
    action_id SERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE
);

CREATE TABLE incident_log (
    log_id BIGSERIAL PRIMARY KEY,
    incident_id INT NOT NULL REFERENCES incidents(incident_id) ON DELETE CASCADE,
    action_ VARCHAR(10) NOT NULL CHECK (action_ IN ('INSERT','UPDATE')),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incidents_status ON incidents(status_);
CREATE INDEX idx_response_actions_incident ON response_actions(incident_id);
CREATE INDEX idx_events_event_at ON events(event_at);
