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

-- Header Rules Table
CREATE TABLE IF NOT EXISTS header_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    rule_phase TEXT NOT NULL CHECK(rule_phase IN ('request', 'response')),
    header_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK(action IN ('add', 'set', 'remove', 'append')),
    value_pattern TEXT, -- For 'set' or 'append' if action involves matching
    replacement_value TEXT, -- For 'add', 'set', 'append'
    apply_to_target_prefix TEXT, -- Corresponds to proxied_targets.target_url_prefix
    order_priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Response Rules Table
CREATE TABLE IF NOT EXISTS response_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    match_status_code INTEGER, -- e.g., 200, 404. NULL means any.
    match_content_type TEXT, -- e.g., 'application/json'. Can use wildcards like 'image/*'. NULL means any.
    body_action TEXT NOT NULL CHECK(body_action IN ('replace_text', 'replace_json_field', 'append_html', 'prepend_html', 'replace_html_element', 'remove_html_element', 'none')),
    body_pattern TEXT, -- Regex for 'replace_text', JSONPath for 'replace_json_field', CSS selector for HTML actions
    body_replacement TEXT, -- Replacement text/JSON value/HTML content
    apply_to_target_prefix TEXT, -- Corresponds to proxied_targets.target_url_prefix
    order_priority INTEGER DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Cache Settings Table
CREATE TABLE IF NOT EXISTS cache_settings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    is_active INTEGER DEFAULT 1, -- 0 for false, 1 for true
    target_url_pattern TEXT NOT NULL, -- Regex to match original request URL
    cache_duration_seconds INTEGER NOT NULL,
    stale_while_revalidate_seconds INTEGER,
    apply_to_target_prefix TEXT, -- Link to proxied_targets.target_url_prefix
    order_priority INTEGER DEFAULT 0, -- Lower numbers have higher priority
    notes TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Cached Responses Table
CREATE TABLE IF NOT EXISTS cached_responses (
    cache_key TEXT PRIMARY KEY,
    target_url_prefix TEXT,
    status_code INTEGER NOT NULL,
    headers TEXT NOT NULL, -- JSON string of headers object
    body_hash TEXT NOT NULL, -- Hash of the response body
    body_storage_key TEXT, -- If body stored in R2/KV, this is the key
    body_inline TEXT, -- For small response bodies, stored directly
    expires_at TEXT NOT NULL, -- ISO 8601 datetime string
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Request Logs Table
CREATE TABLE IF NOT EXISTS request_logs (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL, -- ISO 8601 datetime string
    target_url_prefix TEXT,
    original_request_url TEXT NOT NULL,
    request_method TEXT NOT NULL,
    request_headers TEXT NOT NULL, -- JSON string
    request_body TEXT, -- Text or base64, potentially truncated
    proxied_request_url TEXT NOT NULL,
    response_status_code INTEGER,
    response_headers TEXT, -- JSON string
    response_body TEXT, -- Text or base64, potentially truncated
    duration_ms INTEGER NOT NULL, -- Request-response cycle duration
    cache_status TEXT, -- 'HIT', 'MISS', 'STALE', 'BYPASS', or NULL
    error_message TEXT,
    client_ip TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
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

CREATE TRIGGER IF NOT EXISTS update_header_rules_updated_at
AFTER UPDATE ON header_rules
FOR EACH ROW
BEGIN
    UPDATE header_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_response_rules_updated_at
AFTER UPDATE ON response_rules
FOR EACH ROW
BEGIN
    UPDATE response_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS update_cache_settings_updated_at
AFTER UPDATE ON cache_settings
FOR EACH ROW
BEGIN
    UPDATE cache_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = OLD.id;
END;