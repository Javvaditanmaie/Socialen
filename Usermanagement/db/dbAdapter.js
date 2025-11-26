import mongoAdapter from "./adapters/mongoAdapter.js";
//import sqlAdapter from "./adapters/sqlAdapter.js";

const DB_TYPE = process.env.DB_TYPE || "mongo";

let dbAdapter;

if (DB_TYPE === "mongo") {
  dbAdapter = mongoAdapter;
} else if (DB_TYPE === "sql") {
  dbAdapter = sqlAdapter;
} else {
  throw new Error(`Unknown DB_TYPE: ${DB_TYPE}`);
}

export default dbAdapter;
