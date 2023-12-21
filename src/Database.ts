import sqlite3 from 'sqlite3'

export interface ColumnModel {
  name: string;
  type: "boolean" | "string" | "int" | "real" | "date" | "object" | "array";
  required?: boolean;
}

export interface TableModel {
  name: string;
  columns: Array<ColumnModel>;
}

export class Database {
  public db: sqlite3.Database;
  public tables: Array<TableModel> = [];

  constructor(filename: string) {
    this.db = new sqlite3.Database(filename);
  }

  public async columnTypeToSqlType(type: ColumnModel['type']): Promise<string> {
    switch (type) {
      case 'boolean':
        return 'BOOLEAN';
      case 'string':
        return 'TEXT';
      case 'int':
        return 'INTEGER';
      case 'real':
        return 'REAL';
      case 'date':
        return 'DATE';
      case 'object':
        return 'TEXT';
      case 'array':
        return 'TEXT';
      default:
        return 'TEXT';
    }
  }

  public async CreateTables(tables: TableModel[]): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      tables.forEach(async (table) => {
        await this.CreateTable(table);
      });
      resolve(true);
    });
  }

  public async CreateTable(table: TableModel): Promise<boolean> {
    return await new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const columns: string = table.columns.map((column) => { return `${column.name} ${column.type}`; }).join(', ')
        const query = `CREATE TABLE IF NOT EXISTS ${table.name} (id INTEGER PRIMARY KEY${columns ? `, ${columns}` : ''})`;
        this.db.run(query, ((err) => {
          if (err) {
            console.trace(err);
            reject(false)
          }
          this.tables.push(table);
          resolve(true);
        }));
      });
    });
  }
}