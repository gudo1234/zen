// @ts-nocheck
import { db } from "./db.js";
import fetch from "node-fetch";
import FormDataNode from "form-data";
export const evogb = async (buffer) => {
    const form = new FormDataNode();
    form.append("file", buffer, {
        filename: `Mitzuki_${Date.now()}`,
        contentType: "application/octet-stream"
    });
    form.append("urlMode", "custom_name");
    form.append("author", "Mitzuki");
    const res = await fetch("https://evogb.win/api/upload", {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    const json = await res.json().catch(() => ({}));
    if (!json?.success || !json?.url) {
        throw new Error(JSON.stringify(json));
    }
    return json.url;
};
export async function addCustomCommand(data) {
    const { name, type, text, url, isGlobal, groupId, createdBy } = data;
    if (isGlobal) {
        // Comando global del bot (solo owners)
        await db.query(`INSERT INTO custom_commands (bot_id, cmd, type, text, url, created_by, is_global)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (bot_id, cmd) 
       DO UPDATE SET type = EXCLUDED.type, text = EXCLUDED.text, url = EXCLUDED.url, 
                     updated_at = NOW(), created_by = EXCLUDED.created_by, is_global = true`, [data.botId, name, type, text, url, createdBy]);
    }
    else {
        // Comando local del grupo
        await db.query(`INSERT INTO custom_commands (bot_id, group_id, cmd, type, text, url, created_by, is_global)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       ON CONFLICT (bot_id, group_id, cmd) 
       DO UPDATE SET type = EXCLUDED.type, text = EXCLUDED.text, url = EXCLUDED.url, 
                     updated_at = NOW(), created_by = EXCLUDED.created_by`, [data.botId, groupId, name, type, text, url, createdBy]);
    }
}
export async function getCustomCommand(botId, cmd, groupId) {
    let result;
    if (groupId) {
        // Primero buscar comando local del grupo
        result = await db.query(`SELECT * FROM custom_commands 
       WHERE bot_id = $1 AND group_id = $2 AND cmd = $3 AND is_global = false`, [botId, groupId, cmd]);
        if (result.rows.length > 0) {
            return result.rows[0];
        }
    }
    // Si no hay local o es privado, buscar global
    result = await db.query(`SELECT * FROM custom_commands 
     WHERE bot_id = $1 AND cmd = $2 AND is_global = true`, [botId, cmd]);
    return result.rows[0] || null;
}
export async function deleteCustomCommand(botId, cmd, groupId) {
    if (groupId) {
        await db.query(`DELETE FROM custom_commands 
       WHERE bot_id = $1 AND group_id = $2 AND cmd = $3`, [botId, groupId, cmd]);
    }
    else {
        await db.query(`DELETE FROM custom_commands 
       WHERE bot_id = $1 AND cmd = $2 AND is_global = true`, [botId, cmd]);
    }
}
export async function listCustomCommands(botId, groupId) {
    if (groupId) {
        return await db.query(`SELECT cmd, type, text, url, created_by, is_global 
       FROM custom_commands 
       WHERE bot_id = $1 AND (group_id = $2 OR is_global = true)
       ORDER BY is_global DESC, cmd ASC`, [botId, groupId]);
    }
    return await db.query(`SELECT cmd, type, text, url, created_by, is_global 
     FROM custom_commands 
     WHERE bot_id = $1 AND is_global = true
     ORDER BY cmd ASC`, [botId]);
}
