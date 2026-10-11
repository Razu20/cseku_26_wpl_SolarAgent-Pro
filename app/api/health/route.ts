/* eslint-disable no-undef */
import { db } from '../../../src/db/client'; import { sql } from 'drizzle-orm';
export async function GET(){try{await db.execute(sql`select 1`);return Response.json({ok:true,service:'solaragent-backend',database:'connected'});}catch{return Response.json({ok:false,service:'solaragent-backend',database:'unavailable'},{status:503});}}



