import Database from 'better-sqlite3';
import type { LogMessage } from './types.js';

function Get_db(path: string = 'database.db'): Database.Database {
    const db = new Database(path);
    console.log('Connected to the SQLite database with better-sqlite3.');
    return db;
}

/**
 * See if a Table exists in the DB
 * @param table_name name of table to see if exists
 * @param db instance of the DB
 * @returns bool of if the table exists
 */
function table_exists(table_name: string, db: Database.Database): boolean {
    try {
        const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name = ?`);
        const result = stmt.get(table_name);
        return result !== undefined;
    } catch (error) {
        console.error(`Failed to check if table '${table_name}' exists:`, error);
        return false;
    }
}

/**
 * Creates a new table in the database to store topic-specific logs.
 * @param table_name The name of the table to be created.
 * @param db An existing database connection instance.
 * @returns `true` if the table is created successfully, or `false` if an error occurs.
 */
function create_topic_table(table_name: string, db: Database.Database): boolean {
    try {
        // Important: Use db.exec for statements that don't return data and don't need parameters.
        // For safety against SQL injection, table names should be validated/sanitized before this call.
        db.exec(`CREATE TABLE ${table_name} (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            from_source TEXT NOT NULL,
            payload     TEXT NOT NULL,
            level       TEXT NOT NULL,
            timestamp   TEXT NOT NULL, 
            caller_data TEXT,
            extra_data  TEXT
        );`);
        console.log(`Table '${table_name}' created successfully.`);
        return true;
    } catch (err) {
        console.error(`Failed to create table '${table_name}':`, err);
        return false;
    }
}

function Put_log_in_db(table: string, logMessage: LogMessage, db: Database.Database): number | null {
    if (logMessage.save == false){return 404;}
    if (!table_exists(table, db)) {
        create_topic_table(table, db);
    }

    try {
        // Use a prepared statement for safety and performance
        const stmt = db.prepare(`
            INSERT INTO ${table} (from_source, payload, level, timestamp, caller_data) 
            VALUES (@from, @payload, @level, @timestamp, @caller)
        `);


        const info = stmt.run({
            from: logMessage.from,
            payload: logMessage.payload,
            level: logMessage.level,
            timestamp: logMessage.timestamp,
            caller: logMessage.caller ? JSON.stringify(logMessage.caller) : null,
        });
        return info.lastInsertRowid as number;
    } catch (error) {
        console.error(`Failed to insert log into table '${table}':`, error);
        return null;
    }
}

function get_all_table_names(db: Database.Database): string[] {
    try {
        const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKe 'settings'`);
        const result = stmt.all();
        return result.map((row: any) => row.name);
    } catch (error) {
        console.error(`Failed to get all table names:`, error);
        return [];
    }
}

function get_logs(table_name: string, db: Database.Database): any[] {
    try {
        const stmt = db.prepare(`SELECT id, from_source, payload, timestamp, level, caller_data FROM ${table_name} ORDER BY id DESC LIMIT 300`);
        const result = stmt.all();
        // Sort by timestamp in descending order (newest first)
        
        let tr = result.sort((a: any, b: any) => {
            // Assuming timestamps are in a format that can be lexicographically compared (like ISO 8601)
            if (a.timestamp < b.timestamp) {
            return 1;
            }
            if (a.timestamp > b.timestamp) {
            return -1;
            }
            return 0;
        });
        // console.log(tr)
        return tr;
    } catch (error) {
        console.error(`Failed to get logs from table '${table_name}':`, error);
        return [];
    }
}

function Get_single_log(table_name: string, db: Database.Database, logID:number): any {
    try{
        const stmt = db.prepare(`SELECT * FROM ${table_name} where id = ${logID}`);
        const result = stmt.all();
        return result;
    } catch (error){
        console.error(error);
        return null;
    }
}

function create_settings_table(db: Database.Database): boolean {
    try {
        db.exec(`CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT
        );`);
        return true;
    } catch (err) {
        console.error(`Failed to create settings table:`, err);
        return false;
    }
}

/**
 * Retrieves a setting from the database.
 * @param key The key of the setting to retrieve.
 * @param defaultValue The default value to return if the setting is not found.
 * @param db An existing database connection instance.
 * @returns The setting's value, or the defaultValue if not found.
 */
function getSetting<T>(key: string, defaultValue: T, db: Database.Database): T {
    create_settings_table(db); // Ensure table exists
    try {
        const stmt = db.prepare(`SELECT value FROM settings WHERE key = ?`);
        const result = stmt.get(key) as { value: string } | undefined;
        if (result && result.value !== undefined) {
            return JSON.parse(result.value) as T;
        }
    } catch (error) {
        console.error(`Failed to get setting '${key}':`, error);
    }
    return defaultValue;
}

/**
 * Sets a setting in the database.
 * @param key The key of the setting to set.
 * @param value The value of the setting to set.
 * @param db An existing database connection instance.
 * @returns `true` if the setting was successfully saved, `false` otherwise.
 */
function setSetting(key: string, value: any, db: Database.Database): boolean {
    create_settings_table(db); // Ensure table exists
    try {
        const stmt = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
        stmt.run(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error(`Failed to set setting '${key}':`, error);
        return false;
    }
}

export { Get_db, Put_log_in_db, table_exists, create_topic_table, get_all_table_names, get_logs, Get_single_log, getSetting, setSetting };