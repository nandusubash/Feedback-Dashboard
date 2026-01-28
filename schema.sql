-- Feedback entries table
CREATE TABLE feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    content TEXT NOT NULL,
    author TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sentiment TEXT,
    sentiment_score REAL,
    urgency TEXT,
    themes TEXT,
    processed BOOLEAN DEFAULT 0
);

-- Aggregated themes table
CREATE TABLE themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    theme_name TEXT UNIQUE NOT NULL,
    count INTEGER DEFAULT 1,
    first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily metrics cache
CREATE TABLE daily_metrics (
    date TEXT PRIMARY KEY,
    total_feedback INTEGER,
    positive_count INTEGER,
    neutral_count INTEGER,
    negative_count INTEGER,
    top_themes TEXT,
    avg_sentiment REAL
);