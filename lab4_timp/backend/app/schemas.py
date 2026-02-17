def user_to_dict(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def facility_to_dict(facility):
    return {
        "id": facility.id,
        "name": facility.name,
        "address": facility.address,
        "security_level": facility.security_level,
        "created_at": facility.created_at.isoformat() if facility.created_at else None,
    }


def checkpoint_to_dict(checkpoint):
    return {
        "id": checkpoint.id,
        "facility_id": checkpoint.facility_id,
        "name": checkpoint.name,
        "status": checkpoint.status,
        "zone": checkpoint.zone,
        "last_check_at": checkpoint.last_check_at.isoformat() if checkpoint.last_check_at else None,
        "created_at": checkpoint.created_at.isoformat() if checkpoint.created_at else None,
    }


def incident_to_dict(incident):
    return {
        "id": incident.id,
        "facility_id": incident.facility_id,
        "author_id": incident.author_id,
        "title": incident.title,
        "description": incident.description,
        "severity": incident.severity,
        "status": incident.status,
        "happened_at": incident.happened_at.isoformat() if incident.happened_at else None,
        "created_at": incident.created_at.isoformat() if incident.created_at else None,
    }


def security_plan_to_dict(plan):
    return {
        "id": plan.id,
        "facility_id": plan.facility_id,
        "author_id": plan.author_id,
        "title": plan.title,
        "description": plan.description,
        "effective_from": plan.effective_from.isoformat() if plan.effective_from else None,
        "effective_to": plan.effective_to.isoformat() if plan.effective_to else None,
        "status": plan.status,
        "created_at": plan.created_at.isoformat() if plan.created_at else None,
    }
