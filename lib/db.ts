import { neon } from "@neondatabase/serverless";

/** Neon HTTP ドライバーのシングルトン */
export const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
