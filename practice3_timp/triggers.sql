
CREATE OR REPLACE FUNCTION trg_incident_audit_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO incident_log (incident_id, action_)
    VALUES (NEW.incident_id, 'INSERT');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_incident_audit_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO incident_log (incident_id, action_)
    VALUES (NEW.incident_id, 'UPDATE');
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_incident_validate_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_criticality INT;
BEGIN
    IF NEW.threat_level NOT BETWEEN 1 AND 5 THEN
        NEW.threat_level := 3;
    END IF;

    IF NEW.event_id IS NOT NULL THEN
        SELECT criticality INTO v_criticality
        FROM events
        WHERE event_id = NEW.event_id
        FOR UPDATE;

        IF v_criticality IS NOT NULL AND v_criticality < NEW.threat_level THEN
            UPDATE events
            SET criticality = NEW.threat_level,
                last_modified = now()
            WHERE event_id = NEW.event_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_incident_prevent_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.status_ <> 'closed' THEN
        RAISE EXCEPTION 'Cannot delete incident % unless status is closed', OLD.incident_id;
    END IF;
    RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION trg_event_set_last_modified()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.last_modified := now();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION trg_event_validate_before()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.criticality NOT BETWEEN 1 AND 5 THEN
        NEW.criticality := 3;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS incident_audit_insert ON incidents;
DROP TRIGGER IF EXISTS incident_audit_update ON incidents;
DROP TRIGGER IF EXISTS incident_validate_before ON incidents;
DROP TRIGGER IF EXISTS incident_prevent_delete ON incidents;
DROP TRIGGER IF EXISTS incident_set_last_modified ON incidents;
DROP TRIGGER IF EXISTS event_set_last_modified ON events;
DROP TRIGGER IF EXISTS event_validate_before ON events;

CREATE TRIGGER incident_audit_insert
AFTER INSERT ON incidents
FOR EACH ROW
EXECUTE FUNCTION trg_incident_audit_insert();

CREATE TRIGGER incident_audit_update
AFTER UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION trg_incident_audit_update();

CREATE TRIGGER incident_validate_before
BEFORE INSERT OR UPDATE ON incidents
FOR EACH ROW
EXECUTE FUNCTION trg_incident_validate_before();

CREATE TRIGGER incident_prevent_delete
BEFORE DELETE ON incidents
FOR EACH ROW
EXECUTE FUNCTION trg_incident_prevent_delete();

CREATE TRIGGER event_set_last_modified
BEFORE UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trg_event_set_last_modified();

CREATE TRIGGER event_validate_before
BEFORE INSERT OR UPDATE ON events
FOR EACH ROW
EXECUTE FUNCTION trg_event_validate_before();
