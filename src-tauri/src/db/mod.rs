pub mod artifacts;

use rusqlite::Connection;
use std::sync::Mutex;

pub struct DbState(pub Mutex<Connection>);

pub fn init_db(app_data_dir: &std::path::Path) -> Result<DbState, Box<dyn std::error::Error>> {
    std::fs::create_dir_all(app_data_dir)?;
    let db_path = app_data_dir.join("bitclaw.db");
    let conn = Connection::open(&db_path)?;
    run_migrations(&conn)?;
    Ok(DbState(Mutex::new(conn)))
}

fn run_migrations(conn: &Connection) -> Result<(), Box<dyn std::error::Error>> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version INTEGER PRIMARY KEY
        );
        INSERT OR IGNORE INTO schema_version (version, rowid) VALUES (0, 1);"
    )?;

    let version: i32 = conn.query_row(
        "SELECT version FROM schema_version WHERE rowid = 1",
        [],
        |row| row.get(0),
    )?;

    if version < 1 {
        conn.execute_batch(include_str!("migrations/001_init.sql"))?;
        conn.execute("UPDATE schema_version SET version = 1 WHERE rowid = 1", [])?;
    }

    if version < 2 {
        conn.execute_batch(include_str!("migrations/002_settings.sql"))?;
        conn.execute("UPDATE schema_version SET version = 2 WHERE rowid = 1", [])?;
    }

    Ok(())
}

/// Get a setting value from bitclaw_settings table.
pub fn get_setting(conn: &Connection, key: &str) -> Result<Option<String>, rusqlite::Error> {
    let mut stmt = conn.prepare("SELECT value FROM bitclaw_settings WHERE key = ?1")?;
    let mut rows = stmt.query(rusqlite::params![key])?;
    match rows.next()? {
        Some(row) => Ok(Some(row.get(0)?)),
        None => Ok(None),
    }
}

/// Set a setting value in bitclaw_settings table (upsert).
pub fn set_setting(conn: &Connection, key: &str, value: &str) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT INTO bitclaw_settings (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        rusqlite::params![key, value],
    )?;
    Ok(())
}
