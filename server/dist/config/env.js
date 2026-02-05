import dotenvFlow from "dotenv-flow";
dotenvFlow.config();
const required = ["DATABASE_URL", "JWT_SECRET"];
for (const key of required) {
    if (!process.env[key]) {
        throw new Error(`Missing required env var: ${key}`);
    }
}
export const env = {
    databaseUrl: process.env.DATABASE_URL,
    port: process.env.PORT ? Number(process.env.PORT) : 4000,
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    jwtSecret: process.env.JWT_SECRET,
};
