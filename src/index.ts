import { Database } from "./Database.js";

const db = new Database(":memory:");

const testing = async () => {
    console.log(await db.CreateTable({ name: "test", columns: [] }), "ciici");
    
    console.log(await db.CreateTable({ name: "test", columns: [{name: "lamo", type: "boolean"}]}), 'laskd');
    console.log(db.tables);
}

testing();
