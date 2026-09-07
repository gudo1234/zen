import crypto from "crypto";
import { db } from "./db.js";
function isAnimatedWebp(buf) {
    return buf.includes(Buffer.from("ANIM"));
}
export async function createPack(owner, name, ownerName) {
    return db.query(`INSERT INTO sticker_packs (name, owner_id, owner_name)
     VALUES ($1,$2,$3)
     RETURNING *`, [name, owner, ownerName]);
}
export async function getPack(owner, name) {
    const res = await db.query(`SELECT * FROM sticker_packs
     WHERE owner_id = $1 AND name = $2
     LIMIT 1`, [owner, name]);
    return res.rows[0];
}
export async function setPackVisibility(owner, name, isPublic) {
    await db.query(`UPDATE sticker_packs
     SET public = $3
     WHERE owner_id = $1 AND name = $2`, [owner, name, isPublic]);
}
export async function addStickerToPack(packId, buffer, emojis = [""]) {
    const sha = crypto
        .createHash("sha256")
        .update(buffer)
        .digest();
    const animated = isAnimatedWebp(buffer);
    await db.query(`
    INSERT INTO sticker_pack_items
    (pack_id, sticker, sticker_sha256, emojis, is_animated)
    VALUES ($1,$2,$3,$4,$5)
    `, [packId, buffer, sha, emojis, animated]);
}
export async function countStickers(packId) {
    const res = await db.query(`SELECT COUNT(*)::int AS total
     FROM sticker_pack_items
     WHERE pack_id = $1`, [packId]);
    return res.rows[0].total;
}
export async function getPackStickers(packId) {
    const res = await db.query(`
    SELECT sticker, emojis, is_animated
    FROM sticker_pack_items
    WHERE pack_id = $1
    ORDER BY id ASC
    `, [packId]);
    return res.rows;
}
export async function getPackForSend(userId, name) {
    const res = await db.query(`
    SELECT *
    FROM sticker_packs
    WHERE name = $1
      AND (
        owner_id = $2
        OR public = true
      )
    ORDER BY (owner_id = $2) DESC
    LIMIT 1
    `, [name, userId]);
    return res.rows[0];
}
