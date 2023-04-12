const express = require("express");
const app = express();
const port = process.env.PORT || 4000;
const pool = require("./db");
const jwt = require("jsonwebtoken");
const auth = require("./auth");
const multer = require("multer");
const bcrypt = require("bcryptjs");

const api="www.google.com"

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// create Random String with create random
const createRandomString = (strlength) => {
    let length = strlength;
    length = typeof strlength === "number" && strlength > 0 ? strlength : false;

    if (length) {
        const possiblecharacters = "abcdefghijklmnopqrstuvwxyz1234567890";
        let output = "";
        for (let i = 1; i <= length; i += 1) {
            const randomCharacter = possiblecharacters.charAt(
                Math.floor(Math.random() * possiblecharacters.length)
            );
            output += randomCharacter;
        }
        return output;
    }
    return false;
};

// token Key
const token_KEY = `asjdhkasjd54a5#%$54dekhjfvcbkjh324325`;

// Registration
app.post("/register", async(req, res) => {
    const { name, email, password, gender, age } = req.body;

    if (!(name && email && password && gender && age)) {
        res.json({ error: "All input is required" });
    } else {
        const hashPassword = await bcrypt.hashSync(
            password,
            bcrypt.genSaltSync(10)
        );

        const user_id = createRandomString(15);
        const token = jwt.sign({ user_id, email, name }, token_KEY, {
            expiresIn: "12h",
        });
        const query = `
        CREATE TABLE users (
            user_id text,
            name text,
            email text,
            password text,
            gender text,
            age int,
            token text
        )
        `;
        pool.query(query, (err) => {
            if (err) {
                console.log(err);
            }
            pool.query(
                `INSERT INTO users (user_id,name,email,password,gender,age,token) VALUES ('${user_id}','${name}','${email}','${hashPassword}','${gender}','${age}','${token}') RETURNING *`,
                (err, result) => {
                    if (!err) {
                        console.log(result.rows[0]);
                        res.json({ msg: "inserted successful" });
                    } else {
                        console.log(err);
                        res.json({ error: "Error with error code" });
                    }
                }
            );
        });
    }
});

// Login
app.post("/login", async(req, res) => {
    const { email, password } = req.body;
    if (!(email && password)) {
        res.json({ error: "All input is required" });
    } else {
        pool.query(
            `SELECT * FROM users WHERE email = $1`, [email],
            (err, result) => {
                if (!err) {
                    if (bcrypt.compareSync(password, result.rows[0].password)) {
                        const token = jwt.sign({
                                user_id: result.rows[0].user_id,
                                email: result.rows[0].email,
                                name: result.rows[0].name,
                            },
                            token_KEY, {
                                expiresIn: "12h",
                            }
                        );
                        pool.query(
                            `UPDATE users SET token = '${token}' WHERE email = '${email}'`,
                            (err) => {
                                if (!err) {
                                    console.log(result.rows[0]);
                                    res.json({
                                        msg: `Logged in successfully with ${result.rows[0].user_id}`,
                                    });
                                }
                            }
                        );
                    } else {
                        res.json({ error: "Password do not match" });
                    }
                } else {
                    res.json({ error: "Error with error code" });
                }
            }
        );
    }
});

// Insert Product Category
app.post("/productCategory", async(req, res) => {
    const { categoryname, categorydescription } = req.body;

    const query = `CREATE TABLE productCategory (category_id serial,category_name text,category_description text)`;
    pool.query(query, () => {
        pool.query(
            `INSERT INTO productCategory (category_name,category_description) VALUES ('${categoryname}','${categorydescription}') RETURNING *`,
            (err, result) => {
                if (!err) {
                    console.log(result.rows[0]);
                    res.json({ msg: "inserted successful" });
                } else {
                    res.json({ error: "Error with error code" });
                }
            }
        );
    });
});

// get Category list
app.get("/productCategory", async(req, res) => {
    pool.query("Select * from productCategory", (err, result) => {
        if (!err) {
            res.json({ category: result.rows });
        } else {
            console.log("Users not found");
        }
    });
});

// Insert Products
app.post("/product", upload.single("productImage"), async(req, res) => {
    const { category_Id, name, description, price } = req.body;

    const productImage = req.file.buffer.toString("base64");

    pool.query(
        `SELECT * FROM productCategory WHERE category_id = $1`, [category_Id],
        (err, result) => {
            if (!err) {
                const catName = result.rows[0].category_name;

                const product_id = createRandomString(10);

                const query = `
                CREATE TABLE product (
                    product_id text,
                    category_name text,
                    name text,
                    image text,
                    description text,
                    price int
                )
                `;
                pool.query(query, () => {
                    pool.query(
                        `INSERT INTO product (product_id,category_name,name,image,description,price) VALUES ('${product_id}','${catName}','${name}','${productImage}','${description}','${price}') RETURNING *`,
                        (err, result) => {
                            if (!err) {
                                console.log(result.rows[0]);
                                res.json({ msg: "inserted successful" });
                            } else {
                                res.json({ error: "Error with error code" });
                            }
                        }
                    );
                });
            }
        }
    );
});

// get all Products
app.get("/product", async(req, res) => {
    pool.query("Select * from product", (err, result) => {
        if (!err) {
            res.json({ products: result.rows });
        } else {
            console.log("Users not found");
        }
    });
});

// place an order
app.post("/product/:id", auth, (req, res) => {
    const { token } = req.body;
    const product_id = req.params.id;
    const user = jwt.verify(token, token_KEY);
    const { user_id, email } = user;

    pool.query(
        `SELECT * FROM product WHERE product_id = $1`, [product_id],
        (err, result) => {
            if (!err) {
                const { product_id, name, price } = result.rows[0];
                const query = `
                CREATE TABLE orderLists (
                    user_id text,
                    email text,
                    user_name text,
                    product_id text,
                    product_name text,
                    price int
                )
                `;

                pool.query(query, () => {
                    pool.query(
                        `INSERT INTO orderLists (user_id,email,user_name,product_id,product_name,price) VALUES ('${user_id}','${email}','${user.name}','${product_id}','${name}','${price}') RETURNING *`,
                        (err, result) => {
                            if (!err) {
                                console.log(result.rows[0]);
                                res.json({ msg: "inserted successful" });
                            } else {
                                console.log(err);
                                res.json({ error: "Error with error code" });
                            }
                        }
                    );
                });
            }
        }
    );
});

// get list of placed an order
app.get("/orderedlist", auth, (req, res) => {
    pool.query(`SELECT * FROM product`, (err, result) => {
        if (!err) {
            res.json({ orders: result.rows });
        } else {
            console.log("Users not found");
        }
    });
});

app.listen(port, () => {
    console.log(`Server running on ${port} PORT`);
});
