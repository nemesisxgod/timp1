CREATE TABLE IF NOT EXISTS users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_requests (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_number VARCHAR(40) NOT NULL UNIQUE,
    full_name VARCHAR(255) NOT NULL,
    about_info TEXT NOT NULL,
    document_path VARCHAR(500) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    operator_comment TEXT NULL,
    operator_id INTEGER NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification_logs (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    request_id INTEGER NOT NULL REFERENCES verification_requests(id) ON DELETE CASCADE,
    actor_id INTEGER NULL REFERENCES users(id),
    action VARCHAR(64) NOT NULL,
    comment TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_request_number ON verification_requests(request_number);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_verification_logs_request_id ON verification_logs(request_id);
