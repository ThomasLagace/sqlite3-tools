import sqlite3 from 'sqlite3'

export interface Error {
  error: boolean,
  message?: string
}

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

  public async CreateTables(tables: TableModel[]): Promise<Error> {
    return await new Promise((resolve, reject) => {
      tables.forEach(async (table) => {
        const errorStatus = await this.CreateTable(table);
        if (errorStatus.error) {
          reject({ error: true, message: errorStatus.message })
        }
      });
      resolve({ error: false })
    });
  }

  public async CreateTable(table: TableModel): Promise<Error> {
    return await new Promise((resolve, reject) => {
      this.db.serialize(() => {
        const columns = table.columns.map((column) => { return `${column.name} ${this.columnTypeToSqlType(column.type)}${column.required ? ' NOT NULL' : ''}`; }).join(', ')
        const query = `CREATE TABLE IF NOT EXISTS ${table.name} (id INTEGER PRIMARY KEY${columns ? `, ${columns}` : ''})`;
        this.db.run(query, ((err) => {
          if (err) reject({ error: true, message: err })
          this.tables.push(table);
          resolve({ error: false });
        }));
      });
    });
  }

  public async IsDataTypesValid(column: ColumnModel, data: any): Promise<boolean> {
    const dataType = typeof data;
    if (dataType === "undefined" && !column.required) return true;
    switch (column.type) {
      case 'array':
        return !!Array.isArray(data);
      case 'object':
        return dataType === 'object';
      case 'date':
        return data instanceof Date;
      case 'boolean':
        return dataType === 'boolean';
      case 'int':
        return dataType === 'number' && data % 1 === 0;
      case 'real':
        return dataType === 'number'
      case 'string':
        return dataType === 'string'
      default:
        return false;
    }
  }

  public async InsertRow(tableName: string, data: object): Promise<Error> {
    const tableIndex = this.tables.findIndex((t) => t.name === tableName);
    if (tableIndex === -1) return { error: true, message: `Table ${tableName} does not exist` };
    const table = this.tables[tableIndex];

    for (const column of table.columns) {
      if (!(column.name in data) && column.required) {
        return { error: true, message: `Column ${column.name} is required` };
      }

      const dataColumn = (data as { [key: string]: any })[column.name];
      if (!await this.IsDataTypesValid(column, dataColumn)) {
        return { error: true, message: `Invalid data type: ${column.name} is ${column.type} but got ${column.type === 'int' && dataColumn % 1 !== 0 ? 'real' : typeof dataColumn}`};
      }
    }

    const columns = table.columns.map((column) => column.name).join(', ');
    const values = table.columns.map((column) => {
      const dataColumn = (data as { [key: string]: any })[column.name];
      if (dataColumn === undefined) return 'NULL';
      switch (column.type) {
        case 'array':
        case 'object':
          return `'${JSON.stringify(dataColumn)}'`;
        case 'date':
          return `"${dataColumn.toISOString()}"`;
        case 'string':
          return `"${dataColumn}"`;
        default:
          return dataColumn;
      }
    }).join(', ');
    
    const query = `INSERT INTO ${tableName} (${columns}) VALUES (${values})`;
    console.log(query)
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(query, (err) => {
          if (err) reject({ error: true, message: err});
          resolve({ error: false });
        });
      });
    });
  }
}