import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Whether a database is configured. When false, the data-access layer serves
 * the local seed catalog instead so the storefront is browsable out of the box.
 */
export const hasDatabase = Boolean(MONGODB_URI && MONGODB_URI.trim().length > 0);

// Cache the connection across hot-reloads / serverless invocations.
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global._mongoose ?? { conn: null, promise: null };
global._mongoose = cached;

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (!hasDatabase) {
    throw new Error("MONGODB_URI is not set. Cannot connect to the database.");
  }
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI as string, {
      bufferCommands: false,
    });
  }
  cached.conn = await cached.promise;
  return cached.conn;
}
