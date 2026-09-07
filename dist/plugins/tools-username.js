// tools-username.ts - SOLO AGREGAR BÚSQUEDA EN DB
import { USyncQuery, USyncUser } from "@whiskeysockets/baileys";
import fs from "fs";
import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { db } from "../lib/db.js";
export default {
    name: ["us"],
    owner: true,
    run: async ({ conn, m, text }) => {
        const username = text.replace(/^@/, "").trim();
        if (!username) {
            return m.reply("❌ Ingresa un username\n\nEjemplo: .us zorxzorx");
        }
        try {
            const q = new USyncQuery()
                .withContext("interactive")
                .withContactProtocol()
                .withUsernameProtocol()
                .withLIDProtocol()
                .withUser(new USyncUser().withUsername(username));
            const res = await conn.executeUSyncQuery(q);
            const lid = res?.list?.[0]?.id;
            if (!lid || !lid.endsWith('@lid')) {
                return m.reply(`❌ Usuario @${username} no encontrado o no tiene LID.`);
            }
            let numero = null;
            let encontradoEn = null;
            // 🔥 BUSCAR EN DB POR LID
            const dbResult = await db.query(`SELECT num FROM usuarios WHERE lid = $1`, [lid]);
            if (dbResult.rows.length > 0 && dbResult.rows[0].num) {
                numero = dbResult.rows[0].num;
                encontradoEn = "DB";
            }
            // 🔥 SI NO ESTÁ EN DB, BUSCAR EN SESSIONS
            if (!numero) {
                const sessionsDir = join(process.cwd(), "sessions");
                const subDirs = fs.readdirSync(sessionsDir).filter(d => d === "main" || d.startsWith("sub_"));
                for (const dir of subDirs) {
                    const file = join(sessionsDir, dir, `lid-mapping-${lid.replace("@lid", "")}_reverse.json`);
                    if (existsSync(file)) {
                        try {
                            const data = JSON.parse(readFileSync(file, "utf8"));
                            let number = null;
                            if (typeof data === "string") {
                                number = data;
                            }
                            else if (typeof data === "object") {
                                const keys = Object.keys(data);
                                const phoneJid = keys.find(k => k.endsWith('@s.whatsapp.net'));
                                if (phoneJid) {
                                    number = phoneJid.replace('@s.whatsapp.net', '');
                                }
                            }
                            if (number) {
                                numero = number;
                                encontradoEn = dir;
                                break;
                            }
                        }
                        catch (e) {
                            console.error(`Error leyendo ${file}:`, e);
                        }
                    }
                }
            }
            let msg = `✅ *@${username}*\n\n`;
            msg += `🆔 *LID:* ${lid}\n`;
            if (numero) {
                msg += `📱 *Número:* ${numero}\n`;
                msg += `🔗 wa.me/${numero}\n`;
            }
            else {
                msg += `⚠️ *Sin número visible*\n\n`;
                msg += `💡 El usuario debe enviar un mensaje primero.`;
            }
            return m.reply(msg);
        }
        catch (e) {
            return m.reply("```json\n" +
                JSON.stringify({
                    error: true,
                    message: e.message
                }, null, 2) +
                "\n```");
        }
    }
};
