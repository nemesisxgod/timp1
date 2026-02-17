def user_to_dict(user):
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def verification_request_to_dict(item):
    return {
        "id": item.id,
        "request_number": item.request_number,
        "full_name": item.full_name,
        "about_info": item.about_info,
        "document_path": item.document_path,
        "status": item.status,
        "operator_comment": item.operator_comment,
        "operator_id": item.operator_id,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def verification_log_to_dict(log):
    return {
        "id": log.id,
        "request_id": log.request_id,
        "actor_id": log.actor_id,
        "action": log.action,
        "comment": log.comment,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }
