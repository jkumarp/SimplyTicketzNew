import { createClient, RedisClientType } from "redis";

class RedisService {
    private static instance: RedisService;
    private client: RedisClientType;
    private isConnected: boolean = false;

    private constructor() {
        // Falls back to redis://localhost:6379 if no environment variable is provided
        const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

        this.client = createClient({
            url: redisUrl,
            socket: {
                reconnectStrategy: false,
                connectTimeout: 5000,
            },
        });

        this.client.on("error", (err) => {
            console.error("Redis Client Critical Error:", err);
        });

        this.client.on("connect", () => {
            console.log("Redis client initiating connection...");
        });

        this.client.on("ready", () => {
            this.isConnected = true;
            console.log("Redis client connected and completely ready to use.");
        });
    }

    // Ensures single shared instance pattern across application
    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    // Asynchronous connection initialization loop
    public async connect(): Promise<void> {
        if (!this.isConnected) {
            await this.client.connect();
        }
    }

    // Expose underlying client instance securely
    public getClient(): RedisClientType {
        return this.client;
    }

    // Gracefully terminates active background connection threads
    public async disconnect(): Promise<void> {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
            console.log("Redis client disconnected gracefully.");
        }
    }
}

export const redisService = RedisService.getInstance();
