import { db } from "../lib/db.js";
import fetch from "node-fetch";
import FormDataNode from "form-data";
// ============================================
// 📌 CONSTANTES
// ============================================
const CONFIDENCE_THRESHOLD = 75; // 🔥 UMBRAL FIJO 75%
const WARNING_LIMIT = 3;
// ============================================
// 📌 FUNCIONES
// ============================================
const evogb = async (buffer, expireValue = 1, expireUnit = "day") => {
    const form = new FormDataNode();
    form.append("file", buffer, {
        filename: `Mitzuki_${Date.now()}`,
        contentType: "application/octet-stream"
    });
    form.append("urlMode", "custom_name");
    form.append("author", "Mitzuki");
    form.append("customLength", "10");
    form.append("expireValue", "1");
    form.append("expireUnit", "day");
    const res = await fetch("https://evogb.win/api/upload", {
        method: "POST",
        body: form,
        headers: form.getHeaders()
    });
    const json = await res.json().catch(() => ({}));
    console.log(`📥 EvoGB Response:`, JSON.stringify(json, null, 2));
    if (!json?.success || !json?.url) {
        throw new Error(JSON.stringify(json));
    }
    return json.url;
};
async function getMediaBuffer(m) {
    try {
        const q = m.quoted ? m.quoted : m;
        const mime = (q.msg || q).mimetype || q.mimetype || "";
        if (!mime) {
            console.log("⚠️ No se pudo detectar el mime");
            return null;
        }
        console.log(`📎 Mime detectado: ${mime}`);
        if (!q.download) {
            console.log("⚠️ No hay método download disponible");
            return null;
        }
        const buffer = await Promise.race([
            q.download(),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout descargando media")), 10000))
        ]);
        if (!buffer || buffer.length === 0) {
            console.log("⚠️ Buffer vacío");
            return null;
        }
        if (buffer.length < 100) {
            console.log("⚠️ Buffer demasiado pequeño, posible corrupto");
            return null;
        }
        return { buffer, mime };
    }
    catch (error) {
        console.error("❌ Error descargando media:", error);
        return null;
    }
}
async function checkNSFW(url) {
    try {
        const fullUrl = `https://api.mitzuki.xyz/tools/nsfw-check?url=${url}&apikey=${process.env.API_KEY}`;
        const response = await fetch(fullUrl);
        if (!response.ok) {
            console.error("❌ NSFW API error:", response.status);
            return null;
        }
        const json = await response.json();
        if (!json?.status || !json?.data) {
            console.error("❌ NSFW API invalid response structure");
            return null;
        }
        return {
            unsafe: json.data.unsafe,
            category: json.data.category,
            confidence: json.data.confidence,
            scores: json.data.scores
        };
    }
    catch (error) {
        console.error("❌ Error checking NSFW:", error);
        return null;
    }
}
async function getWarningLimit(groupId) {
    try {
        const res = await db.query("SELECT nsfw_warn_limit FROM chats WHERE group_id = $1", [groupId]);
        const row = res.rows[0];
        return row?.nsfw_warn_limit || WARNING_LIMIT;
    }
    catch {
        return WARNING_LIMIT;
    }
}
async function getUserWarnings(groupId, userId) {
    try {
        const res = await db.query("SELECT warns FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2", [groupId, userId]);
        const row = res.rows[0];
        return row?.warns || 0;
    }
    catch {
        return 0;
    }
}
async function incrementUserWarnings(groupId, userId, reason) {
    const result = await db.query(`INSERT INTO nsfw_warnings (group_id, user_id, warns, last_reason, updated_at)
     VALUES ($1, $2, 1, $3, NOW())
     ON CONFLICT (group_id, user_id)
     DO UPDATE SET 
       warns = nsfw_warnings.warns + 1,
       last_reason = $3,
       updated_at = NOW()
     RETURNING warns`, [groupId, userId, reason]);
    const row = result.rows[0];
    return row?.warns || 0;
}
async function resetUserWarnings(groupId, userId) {
    await db.query(`DELETE FROM nsfw_warnings WHERE group_id = $1 AND user_id = $2`, [groupId, userId]);
}
async function isUserAdmin(conn, chatId, userId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        return metadata.participants.some(p => {
            return p.id.replace(/:\d+/, "") === userId.replace(/:\d+/, "") && p.admin;
        });
    }
    catch {
        return false;
    }
}
async function isBotAdmin(conn, chatId) {
    try {
        const metadata = await conn.groupMetadata(chatId);
        const botId = conn.user?.id?.replace(/:\d+@/, "@");
        return metadata.participants.some(p => {
            const pid = p.id?.replace(/:\d+/, "");
            return (pid === botId || pid === (conn.user?.lid || "").replace(/:\d+/, "")) && p.admin;
        });
    }
    catch {
        return false;
    }
}
export default {
    name: "antinsfw",
    before: async (m, { conn }) => {
        if (!m.isGroup)
            return;
        try {
            const res = await db.query("SELECT antinsfw FROM chats WHERE group_id = $1", [m.chat]);
            const config = res.rows[0];
            if (!config || !config.antinsfw)
                return;
        }
        catch (e) {
            console.error("❌ Error checking antinsfw DB:", e);
            return;
        }
        const mime = (m.msg || m).mimetype || m.mimetype || "";
        const hasMedia = !!mime && (mime.includes('image') || mime.includes('video'));
        if (!hasMedia)
            return;
        const isAdmin = await isUserAdmin(conn, m.chat, m.sender);
        if (isAdmin || m.fromMe)
            return;
        let mediaUrl = null;
        try {
            const mediaData = await getMediaBuffer(m);
            if (!mediaData)
                return;
            const { buffer } = mediaData;
            mediaUrl = await evogb(buffer, 1, "hour");
        }
        catch (error) {
            console.error("❌ Error subiendo a EvoGB:", error);
            return;
        }
        if (!mediaUrl) {
            console.log("❌ No se obtuvo URL");
            return;
        }
        const result = await checkNSFW(mediaUrl);
        if (!result) {
            console.log("⚠️ Falló el análisis NSFW");
            return;
        }
        if (!result.unsafe)
            return;
        // ============================================
        // 🔥 VERIFICAR TIPOS ACTIVOS
        // ============================================
        const typesRes = await db.query("SELECT nsfw_types FROM chats WHERE group_id = $1", [m.chat]);
        const configTypes = typesRes.rows[0];
        const tiposActivos = configTypes?.nsfw_types || ["nsfw", "gore"];
        if (!tiposActivos.includes(result.category)) {
            console.log(`⏭️ Tipo "${result.category}" no está activo en este grupo. Activos: ${tiposActivos.join(", ")}`);
            return;
        }
        // ============================================
        // ============================================
        // 🔥 VERIFICAR UMBRAL DE CONFIANZA (75%)
        // ============================================
        if (result.confidence < CONFIDENCE_THRESHOLD) {
            console.log(`⏭️ Confianza ${result.confidence}% < umbral ${CONFIDENCE_THRESHOLD}%, ignorando...`);
            return;
        }
        // ============================================
        const warningLimit = await getWarningLimit(m.chat);
        const currentWarnings = await getUserWarnings(m.chat, m.sender);
        const newWarnings = currentWarnings + 1;
        const shouldRemove = newWarnings >= warningLimit;
        const categoryName = result.category.toUpperCase();
        const confidence = result.confidence;
        await incrementUserWarnings(m.chat, m.sender, `${categoryName} (${confidence}%)`);
        const emojis = {
            nsfw: "🔞",
            explicit: "🚫",
            erotica: "💋",
            suggestive: "😳",
            gore: "🩸",
            gore_extreme: "☠️",
            violence: "⚔️"
        };
        const emoji = emojis[result.category] || "🚫";
        const titulos = {
            nsfw: "🚫 ANTI-NSFW",
            explicit: "🚫 CONTENIDO EXPLÍCITO",
            erotica: "🚫 CONTENIDO BLOQUEADO",
            suggestive: "🚫 CONTENIDO BLOQUEADO",
            gore: "🩸 ANTI-GORE",
            gore_extreme: "☠️ ANTI-GORE EXTREMO",
            violence: "⚔️ ANTI-VIOLENCIA"
        };
        const titulo = titulos[result.category] || "🚫 CONTENIDO BLOQUEADO";
        let warningMsg = `*「 ${titulo} 」*\n\n`;
        warningMsg += `${emoji} *${categoryName}* detectado con ${confidence}% de confianza\n`;
        warningMsg += `🎯 *Umbral:* ${CONFIDENCE_THRESHOLD}%\n\n`;
        warningMsg += `@${m.sender.split("@")[0]}`;
        if (shouldRemove) {
            warningMsg += `\n\n⚠️ Límite de ${warningLimit} advertencias alcanzado. Serás eliminado.`;
        }
        else {
            warningMsg += `\n\n⚠️ Advertencia ${newWarnings}/${warningLimit}`;
        }
        const botIsAdmin = await isBotAdmin(conn, m.chat);
        try {
            await conn.sendMessage(m.chat, {
                text: warningMsg,
                mentions: [m.sender]
            }, { quoted: m });
            await conn.sendMessage(m.chat, {
                delete: {
                    remoteJid: m.chat,
                    fromMe: false,
                    id: m.key.id,
                    participant: m.key.participant || m.sender
                }
            });
            if (shouldRemove && botIsAdmin) {
                await conn.groupParticipantsUpdate(m.chat, [m.sender], "remove");
                await resetUserWarnings(m.chat, m.sender);
                console.log(`✅ Usuario ${m.sender} expulsado por NSFW (${result.category})`);
            }
            else if (shouldRemove && !botIsAdmin) {
                await conn.sendMessage(m.chat, {
                    text: `⚠️ @${m.sender.split("@")[0]} debería ser eliminado, pero no soy admin.`,
                    mentions: [m.sender]
                }, { quoted: m });
            }
        }
        catch (error) {
            console.error("❌ Error manejando NSFW:", error);
        }
    }
};
