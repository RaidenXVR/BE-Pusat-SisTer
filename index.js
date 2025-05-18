import app from "./src/server.js";
import { configDotenv } from "dotenv";
// Start server
configDotenv()
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Cabang Pusat API running on port ${PORT}`);
});