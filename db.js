const Pool = require("pg").Pool;

const pool = new Pool({
    user: "postgres",
    password: "123456",
    database: "postgres",
    host: "localhost",
    port: 3600,
});

if (pool.connect) {
    console.log("connected to the database successfully");
}

module.exports = pool;
