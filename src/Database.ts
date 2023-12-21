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
    this.db.serialize(async () => {
      tables.forEach((table) => {
        this.CreateTable(table);
      });
    });
    return true;
  }

  public async CreateTable(table: TableModel): Promise<boolean> {
    await this.db.serialize(async () => {
      const columns: string = table.columns.map((column) => { return `${column.name} ${column.type}`; }).join(', ')
      const query = `CREATE TABLE IF NOT EXISTS ${table.name} (id INTEGER PRIMARY KEY${columns ? `, ${columns}` : ''})`;
      await this.db.run(query, (async (err) => {
        console.log("here");
        if (err) {
          console.trace(err);
          return false;
        }
        this.tables.push(table);
      }));
      return true;
    });
  }
}