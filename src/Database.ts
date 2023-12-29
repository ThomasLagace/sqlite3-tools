import sqlite3 from 'sqlite3'

export interface DatabaseError {
  error?: boolean,
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

  public getTableModel(tableName: string): Promise<TableModel | undefined> {
    return Promise.resolve(this.tables.find((t) => t.name === tableName));
  }

  public async createTables(tables: TableModel[]): Promise<DatabaseError> {
    return await new Promise((resolve, reject) => {
      tables.forEach(async (table) => {
        const errorMessage = await this.createTable(table);
        if (errorMessage) {
          reject({ error: true, message: errorMessage.message });
        }
      });
      resolve({})
    });
  }

  public async createTable(table: TableModel): Promise<DatabaseError> {
    if (table.columns.some(column => column.name === 'id')) {
      return { error: true, message: 'Tables already come with the id as primary keys' };
    }

    if (this.tables.some(dbTable => dbTable.name === table.name)) {
      return { error: true, message: `Table "${table.name}" already exists` };
    }
    
    if (table.columns.some((column, index) => table.columns.findIndex(c => c.name === column.name) !== index)) {
      return { error: true, message: 'Duplicate columns names in the table' };
    }

    const columns = table.columns.map((column) => {
      return `${column.name} ${this.columnTypeToSqlType(column.type)}${column.required ? ' NOT NULL' : ''}`;
    });

    const columnsQuery = ['id INTEGER PRIMARY KEY', ...columns].join(', ');
    const query = `CREATE TABLE IF NOT EXISTS ${table.name} (${columnsQuery})`;
    return await new Promise(resolve => {
      this.db.serialize(() => {
        this.db.run(query, ((err) => {
          if (err) return resolve({ error: true, message: err.message });
          this.tables.push(table);
          return resolve({});
        }));
      });
    });
  }

  public isDataTypesValid(column: ColumnModel, data: any): Promise<boolean> {
    const dataType = typeof data;
    if (dataType === "undefined" && !column.required) return Promise.resolve(true);
    switch (column.type) {
      case 'array':
        return Promise.resolve(Array.isArray(data));
      case 'object':
        return Promise.resolve(dataType === 'object');
      case 'date':
        return Promise.resolve(data instanceof Date);
      case 'boolean':
        return Promise.resolve(dataType === 'boolean');
      case 'int':
        return Promise.resolve(dataType === 'number' && data % 1 === 0);
      case 'real':
        return Promise.resolve(dataType === 'number');
      case 'string':
        return Promise.resolve(dataType === 'string');
      default:
        return Promise.resolve(false);
    }
  }

  public async insertRows(tablesNames: string[], data: { [key: string]: any}[]): Promise<DatabaseError> {
    return await new Promise((resolve, reject) => {
      tablesNames.forEach(async (table, index) => {
        const errorMessage = await this.insertRow(table, data[index]);
        if (errorMessage) {
          reject({ error: true, message: errorMessage.message });
        }
      });
      resolve({})
    });
  }

  public async insertRow(tableName: string, data: { [key: string]: any }): Promise<DatabaseError> {
    const table = await this.getTableModel(tableName);
    if (!table) return { error: true, message: `Table "${tableName}" does not exist` };
    
    for (const column of table.columns) {
      if (!(column.name in data) && column.required) {
        return { error: true, message: `Column ${column.name} is required` };
      }

      const dataColumn = data[column.name];
      if (!this.isDataTypesValid(column, dataColumn)) {
        return { error: true, message: `Invalid data type: ${column.name} is ${column.type} but got ${column.type === 'int' && dataColumn % 1 !== 0 ? 'real' : typeof dataColumn}`};
      }
    }

    const columns = table.columns.map((column) => column.name);
    const values = table.columns.map((column) => {
      const dataColumn = data[column.name];
      if (dataColumn === undefined) return 'NULL';
      switch (column.type) {
        case 'array':
        case 'object':
          return JSON.stringify(dataColumn);
        case 'date':
          return dataColumn.toISOString();
        case 'int':
          return Math.floor(dataColumn);
        default:
          return dataColumn;
      }
    });
    
    const query = `INSERT INTO ${table.name} (${columns.join(', ')}) VALUES (${values.map(() => '?').join(', ')})`;
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(query, values,(err) => {
          if (err) return resolve({ error: true, message: err.message});
          return resolve({});
        });
      });
    });
  }

  public async dropTable(tableName: string): Promise<DatabaseError> {
    const table = await this.getTableModel(tableName);
    if (!table) return { error: true, message: `Table "${tableName}" does not exist` };

    return new Promise((resolve, reject) => {
      this.db.run(`DROP TABLE ${tableName}`, (err) => {
        if (err) return resolve({ error: true, message: err.message });
        this.tables = this.tables.filter(t => t.name !== tableName);
        return resolve({});
      });
    });
  }

  public async getTable(tableName: string, columnsName: string[] | undefined = undefined, sort: { columnName: string, sortType: 'ASC' | 'DESC' } | undefined = undefined, limit: number = 1): Promise<Object[] | DatabaseError> {
    const table = await this.getTableModel(tableName);
    if (!table) return { error: true, message: `Table "${tableName}" does not exist` };

    if (limit < 1) {
      return { error: true, message: `Limit must be greater than 0 but got "${limit}"`}
    }

    const tableColumnsName = table.columns.map(column => column.name);
    const columnsNotFound = columnsName?.filter(columnName => !tableColumnsName.includes(columnName));
    if (columnsNotFound?.length) {
      return { error: true, message: `Column(s) "${columnsNotFound.join('", "')}" do not exist in "${table.name}". Available columns: ${table.columns.map(column => `${column.name} (${column.type})`).join(', ')}`}
    }
    
    if (sort?.columnName && !tableColumnsName.includes(sort?.columnName)) {
      return { error: true, message: `Column "${sort.columnName}" does not exist in "${table.name}". Available columns: ${table.columns.map(column => `${column.name} (${column.type})`).join(', ')}`}
    }

    const query = `SELECT ${['rowID as id', columnsName].join(', ')} FROM ${table.name}${sort?.columnName ? ` ORDER BY ${sort.columnName} ${sort.sortType}` : ''} LIMIT ${limit}`;

    const dbResponse: Object[] | DatabaseError = await new Promise((resolve, reject) => {
      this.db.all(query, (err, rows: Object[]) => {
        if (err) resolve({ error: true, message: err.message });
        resolve(rows);
      });
    });    

    if ((dbResponse as DatabaseError).error) return dbResponse;
    console.log(dbResponse);
    
    return (dbResponse as Object[]).map(rowResponse => {
      Object.keys(rowResponse).forEach(key => {
        const columnModel = table.columns.find(column => column.name == key);
        const columnValue = (rowResponse as any)[key];
        if (columnValue === 'NULL') return (rowResponse as any)[key] = null;
        switch (columnModel?.type) {
          case 'array':
          case 'object':
            return (rowResponse as any)[key] = JSON.parse(columnValue);
          case 'int':
          case 'real':
            return (rowResponse as any)[key] = Number(columnValue);
          case 'boolean':
            return (rowResponse as any)[key] = Boolean(columnValue);
          case 'date':
            return (rowResponse as any)[key] = new Date(Date.parse(columnValue));
          default:
            return rowResponse;
        }
      });
      return rowResponse
    });
  }
}