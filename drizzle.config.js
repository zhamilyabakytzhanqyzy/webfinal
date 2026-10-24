/** @type {import('drizzle-kit').Config} */
module.exports ={
    schema: "./schema.js" ,
    out: "./drizzle",
    dialect:"mysql",
    dbCredientials: {
        host: "localhost",
        user: "root",
        password:"",
        database:"amirito_db"
    },
};