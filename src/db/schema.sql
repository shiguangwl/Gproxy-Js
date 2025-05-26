-- Settings Table
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Proxied Targets Table
CREATE TABLE IF NOT EXISTS proxied_targets (
    id TEXT PRIMARY KEY,
    target_url_prefix TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    enable_js_injection INTEGER DEFAULT 0, -- 0 for false, 1 for true
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Replace Rules Table
CREATE TABLE IF NOT EXISTS replace_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    search_pattern TEXT NOT NULL,
    replace_with TEXT NOT NULL,
    match_type TEXT NOT NULL CHECK(match_type IN ('string', 'regex')),
    url_match_regex TEXT,
    url_exclude_regex TEXT,
    content_type_match TEXT,
    order_priority INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Async Request Policies Table
CREATE TABLE IF NOT EXISTS async_request_policies (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    target_url_pattern TEXT NOT NULL, -- Regex string
    action TEXT NOT NULL CHECK(action IN ('proxy', 'direct')),
    apply_to_target_prefix TEXT, -- Corresponds to proxied_targets.target_url_prefix
    order_priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Triggers to update 'updated_at' timestamp (SQLite compatible)
CREATE TRIGGER IF NOT EXISTS update_proxied_targets_updated_at
AFTER UPDATE ON proxied_targets
FOR EACH ROW
BEGIN
    UPDATE proxied_targets SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_replace_rules_updated_at
AFTER UPDATE ON replace_rules
FOR EACH ROW
BEGIN
    UPDATE replace_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_async_request_policies_updated_at
AFTER UPDATE ON async_request_policies
FOR EACH ROW
BEGIN
    UPDATE async_request_policies SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;