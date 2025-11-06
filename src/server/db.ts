// src/server/db.ts
import { MongoClient, Db } from 'mongodb';

let _client: MongoClient | undefined;
export let db: Db;

export async function connectDb(uri: string, dbName?: string) {
  _client = new MongoClient(uri);
  await _client.connect();
  db = _client.db(dbName);
  return db;
}

export function getDb(): Db {
  if (!db) throw new Error('DB not initialized. Call connectDb first.');
  return db;
}
