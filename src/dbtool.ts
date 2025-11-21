import Database from 'better-sqlite3';
import type { LogMessage } from './types.ts';

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

function Put_log_in_db(table: string, logMessage: LogMessage, db: Database.Database): boolean {
    if (!table_exists(table, db)) {
        create_topic_table(table, db);
    }

    try {
        // Use a prepared statement for safety and performance
        const stmt = db.prepare(`
            INSERT INTO ${table} (from_source, payload, level, timestamp, caller_data) 
            VALUES (@from, @payload, @level, @timestamp, @caller)
        `);


        stmt.run({
            from: logMessage.from,
            payload: logMessage.payload,
            level: logMessage.level,
            timestamp: logMessage.timestamp,
            caller: logMessage.caller ? JSON.stringify(logMessage.caller) : null,
        });
        return true;
    } catch (error) {
        console.error(`Failed to insert log into table '${table}':`, error);
        return false;
    }
}

function get_all_table_names(db: Database.Database): string[] {
    try {
        const stmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`);
        const result = stmt.all();
        return result.map((row: any) => row.name);
    } catch (error) {
        console.error(`Failed to get all table names:`, error);
        return [];
    }
}

function get_logs(table_name: string, db: Database.Database): any[] {
    try {
        const stmt = db.prepare(`SELECT from_source,payload,timestamp,level, caller_data FROM ${table_name}`);
        const result = stmt.all();
        return result;
    } catch (error) {
        console.error(`Failed to get logs from table '${table_name}':`, error);
        return [];
    }
}

export { Get_db, Put_log_in_db, table_exists, create_topic_table, get_all_table_names, get_logs };