import { db } from "./db.js";
import { configDotenv } from "dotenv";

export const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const branchId = req.body.branch_id; // Or from headers, depending on your design

    if (!apiKey || !branchId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: API key and branch ID are required' });
    }

    isValidApiKey(branchId, apiKey).then((validApiKey) => {
        if (!validApiKey) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API key' });
        }
        next();

    });


};

async function isValidApiKey(branchId, apiKey) {

    try {
        const [secret] = await db.query('SELECT hashed_secret FROM secrets where branch_id = ?', [branchId]);
        console.log(secret)
        return secret[0]["hashed_secret"] == apiKey;

    }
    catch (err) {
        console.log(err)
    }
}

export const executiveAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    const userId = req.body.user_id; // Or from headers, depending on your design

    if (!apiKey || !userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized: API key and Employee ID are required' });
    }

    isUserApiKeyValid(userId, apiKey).then((validApiKey) => {
        if (!validApiKey) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API key and Role' });
        }
        next();

    });

}

async function isUserApiKeyValid(user_id, apiKey) {
    try {
        configDotenv()
        const defaultAPI = process.env.EXECUTIVE_KEY;
        const [secret] = await db.query('SELECT hashed_secret FROM secrets where user_id = ?', [user_id]);
        const [role] = await db.query('SELECT role FROM users where user_id = ?', [user_id])
        return (secret[0]["hashed_secret"] == apiKey && role[0]["role"] == "executive");

    }
    catch (err) {
        console.log(err)
    }
}