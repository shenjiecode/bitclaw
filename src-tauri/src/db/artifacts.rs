use rusqlite::{params, Connection};

use crate::commands::artifacts::Artifact;

pub fn list(conn: &Connection) -> Result<Vec<Artifact>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT id, name, file_path, tags, created_at FROM artifacts ORDER BY created_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Artifact {
            id: row.get(0)?,
            name: row.get(1)?,
            file_path: row.get(2)?,
            tags: row.get(3)?,
            created_at: row.get(4)?,
        })
    })?;
    rows.collect()
}

pub fn create(
    conn: &Connection,
    name: &str,
    file_path: &str,
    tags: &str,
) -> Result<Artifact, rusqlite::Error> {
    conn.execute(
        "INSERT INTO artifacts (name, file_path, tags) VALUES (?1, ?2, ?3)",
        params![name, file_path, tags],
    )?;
    let id = conn.last_insert_rowid();
    Ok(Artifact {
        id,
        name: name.to_string(),
        file_path: file_path.to_string(),
        tags: tags.to_string(),
        created_at: String::new(), // DB default
    })
}

pub fn delete(conn: &Connection, id: i64) -> Result<(), rusqlite::Error> {
    conn.execute("DELETE FROM artifacts WHERE id = ?1", params![id])?;
    Ok(())
}
