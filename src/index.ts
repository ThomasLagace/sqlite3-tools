import { Database } from "./Database.js";

const db = new Database(":memory:");

const testing = async () => {
  console.log("log: ", await db.createTable({ 
    name: "test", 
    columns: [
      // {name: "id", type: "string"},
      {name: "boolTest", type: "boolean", required: true}, 
      {name: "arrayTest", type: "array"}, 
      {name: "dateTest", type:"date"},
      {name: "objectTest", type:"object"},
      {name: "stringTest", type:"string"},
      {name: "intTest", type:"int"},
      {name: "realTest", type:"real"},
    ]
  }));
  
  // console.log("log: ", 
  //   await db.insertRow("test",
  //   {
  //     boolTest: true,
  //     arrayTest: [1, 2, 3],
  //     dateTest: new Date(),
  //     objectTest: {hello: "world"},
  //     stringTest: "'''''\"`LSDKFJLKJDFS123",
  //     intTest: 1,
  //     realTest: 2.56,
  //   })
  // );
  
  // console.log("log: ", 
  //   await db.insertRow("test",
  //   {
  //     boolTest: false,
  //     dateTest: new Date(),
  //     objectTest: {hello: "monde"},
  //     stringTest: "lllllllDFS123",
  //     intTest: 9,
  //     realTest: 6.18,
  //   })
  // );

  console.log("log1: ", await db.insertRows('test', 
    [
      {
        boolTest: true,
        arrayTest: [1, 2, 3],
        dateTest: new Date(),
        objectTest: {hello: "world"},
        stringTest: "'''''\"`LSDKFJLKJDFS123",
        intTest: 1,
        realTest: 2.56,
      },
      {
        boolTest: false,
        dateTest: new Date(),
        objectTest: {hello: "monde"},
        stringTest: "lllllllDFS123",
        intTest: 9,
        realTest: 6.18,
      }
    ]
  ))

  // console.log('Log1: ', await db.getTable('test', [ 'boolTest', 'arrayTest', 'stringTest' ], undefined, 10));

  // console.log('Log2: ', await db.deleteRowByID('test', 6));

  console.log('Log3: ', await db.getTable('test'));

  db.db.close();
}

testing();
