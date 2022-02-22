const jwt = require("jsonwebtoken");

const token_KEY = `asjdhkasjd54a5#%$54dekhjfvcbkjh324325`;

const verifyToken = (req, res, next) => {
    const token =
        req.body.token || req.query.token || req.headers["token"];

    if (!token) {
        return res.status(403).send("A token is required for authentication");
    }
    try {
        const decoded = jwt.verify(token, token_KEY);
        req.user = decoded;
    } catch (err) {
        return res.status(401).send("Invalid Token");
    }
    return next();
};

module.exports = verifyToken;