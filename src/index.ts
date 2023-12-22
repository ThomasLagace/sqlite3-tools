import { Database } from "./Database.js";

const db = new Database(":memory:");

const testing = async () => {
    console.log("log: ", await db.CreateTable({ 
        name: "test", 
        columns: [
            // {name: "id", type: "string"},
            {name: "boolTest", type: "boolean", required: true}, 
            {name: "arrayTest", type: "array"}, 
            {name: "arrayTest", type: "array"}, 
            {name: "arrayTest", type: "array"}, 
            {name: "dateTest", type:"date"},
            {name: "objectTest", type:"object"},
            {name: "stringTest", type:"string"},
            {name: "intTest", type:"int"},
            {name: "realTest", type:"real"},
        ]
    }));
    
    console.log("log: ", 
        await db.InsertRow("test",
        {
            boolTest: true,
            arrayTest: [1, 2, 3],
            dateTest: new Date(),
            objectTest: {hello: "world"},
            stringTest: "'''''\"`LSDKFJLKJDFS123",
            intTest: 1,
            realTest: 2.56,
        })
    );
}

testing();
