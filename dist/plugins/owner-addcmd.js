import { db } from "../lib/db.js";
import { evogb } from "../lib/commands.js";
import { fileTypeFromBuffer } from "file-type";
function parseFields(input = "") {
    const parts = input.split("|");
    const name = parts[0]?.trim();
    const data = { name, text: null };
    for (let i = 1; i < parts.length; i++) {
        const part = parts[i];
        const colonIndex = part.indexOf(":");
        if (colonIndex === -1)
            continue;
        const key = part.slice(0, colonIndex).trim().toLowerCase();
        const value = part.slice(colonIndex + 1);
        if (key === "text")
            data.text = value;
    }
    return data;
}
function detectMediaType(mimetype, filename) {
    if (mimetype === 'image/webp' || filename?.endsWith('.webp'))
        return 'sticker';
    if (mimetype.startsWith('image/'))
        return 'image';
    if (mimetype.startsWith('video/'))
        return 'video';
    if (mimetype.startsWith('audio/'))
        return 'audio';
    return null;
}
// 🔥 Hash "perceptual" del sticker: se decodifica a píxeles crudos (ignorando
// metadata/EXIF/pack-id que WhatsApp reescribe distinto según quién reenvía)
// para que el MISMO sticker visual siempre dé el mismo hash, sin importar
// quién lo mande. Si "sharp" no está disponible, cae al hash del buffer crudo.
async function computeStickerHash(buffer) {
    const crypto = await import('crypto');
    try {
        const sharp = (await import('sharp')).default;
        const { data, info } = await sharp(buffer, { animated: false })
            .ensureAlpha()
            .raw()
            .toBuffer({ resolveWithObject: true });
        const hasher = crypto.createHash('sha256');
        hasher.update(`${info.width}x${info.height}x${info.channels}`);
        hasher.update(data);
        return hasher.digest('hex');
    }
    catch (e) {
        console.log("⚠️ No se pudo normalizar el sticker con sharp, usando hash crudo:", e.message);
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
}
function getMediaTypeFromMessage(message) {
    if (!message)
        return null;
    const types = {
        'imageMessage': 'image',
        'videoMessage': 'video',
        'audioMessage': 'audio',
        'stickerMessage': 'sticker'
    };
    for (const [key, type] of Object.entries(types)) {
        if (message[key]) {
            return {
                type,
                mimetype: message[key]?.mimetype,
                filename: message[key]?.fileName
            };
        }
    }
    return null;
}
export default {
    name: ["addcmd", "editcmd", "delcmd", "listcmds"],
    help: ["addcmd", "editcmd", "delcmd", "listcmds"],
    tags: ["owner", "jadibot"],
    desc: "Agregar comando personalizado",
    run: async ({ conn, m, text, cmd, prefijo, isOwner, isAdmin, isGroup }) => {
        const botId = conn.user?.id?.split(":")[0] || "unknown";
        const isGlobal = isOwner;
        const groupId = isOwner ? null : (isGroup ? m.chat : null);
        if (!isOwner && !isAdmin) {
            return m.reply("❌ Necesitas ser admin del grupo o owner del bot.");
        }
        // RENOMBRAR COMANDO: .editcmd nombreactual | nuevonombre
        // (solo se activa si lo que sigue al "|" NO tiene formato campo:valor)
        if (cmd === "editcmd" && text.includes("|")) {
            const [rawOld, ...restParts] = text.split("|");
            const rawNew = restParts.join("|");
            if (rawNew.trim() && !rawNew.includes(":")) {
                const oldName = rawOld.trim();
                const newName = rawNew.trim();
                if (!oldName || !newName) {
                    return m.reply(`Uso: ${prefijo}editcmd nombreactual | nuevonombre`);
                }
                const nativeCommands = ['addcmd', 'editcmd', 'delcmd', 'listcmds', 'help', 'ping'];
                const cleanNew = newName.startsWith(prefijo) ? newName.slice(prefijo.length) : newName;
                if (nativeCommands.includes(cleanNew.toLowerCase())) {
                    return m.reply("❌ Ese nombre no está disponible, es un comando nativo.");
                }
                let result;
                if (isOwner) {
                    result = await db.query(`UPDATE custom_commands SET cmd = $1, updated_at = NOW()
             WHERE bot_id = $2 AND cmd = $3 AND is_global = true AND group_id IS NULL`, [newName, botId, oldName]);
                }
                if ((!result || result.rowCount === 0) && groupId) {
                    result = await db.query(`UPDATE custom_commands SET cmd = $1, updated_at = NOW()
             WHERE bot_id = $2 AND cmd = $3 AND is_global = false AND group_id = $4`, [newName, botId, oldName, groupId]);
                }
                if (!result || result.rowCount === 0) {
                    return m.reply(`❌ Comando *${oldName}* no encontrado.\n\n💡 Usa el nombre exacto con el que fue creado.`);
                }
                return m.reply(`✅ Comando renombrado de *${oldName}* a *${newName}*.`);
            }
        }
        // LISTAR COMANDOS
        if (cmd === "listcmds") {
            const mode = text.trim().toLowerCase();
            let query = "";
            let params = [];
            if (mode === "global") {
                query = `
          SELECT cmd, type, is_global
          FROM custom_commands
          WHERE bot_id = $1
          AND is_global = true
          ORDER BY cmd ASC
        `;
                params = [botId];
            }
            else {
                if (!isGroup) {
                    return m.reply(`⚠️ Este comando solo muestra comandos locales en grupos.\n\nUsa *${prefijo}listcmds global* para ver los comandos globales.`);
                }
                query = `
          SELECT cmd, type, is_global
          FROM custom_commands
          WHERE bot_id = $1
          AND group_id = $2
          ORDER BY cmd ASC
        `;
                params = [botId, m.chat];
            }
            const { rows } = await db.query(query, params);
            if (!rows.length) {
                return m.reply(mode === "global"
                    ? "📭 No hay comandos globales."
                    : "📭 Este grupo no tiene comandos locales.");
            }
            let list = mode === "global"
                ? "🌍 *COMANDOS GLOBALES*\n\n"
                : "🏠 *COMANDOS DE ESTE GRUPO*\n\n";
            for (const row of rows) {
                const type = row.type === "text" ? "📝" :
                    row.type === "image" ? "🖼️" :
                        row.type === "video" ? "🎬" :
                            row.type === "audio" ? "🎵" :
                                row.type === "sticker" ? "🏷️" :
                                    "📦";
                const hasPrefix = row.cmd.startsWith(".") ? "🔹" : "🔸";
                list += `${type} ${hasPrefix} ${row.cmd}\n`;
            }
            list += `\n💡 *${prefijo}listcmds global* → Ver comandos globales.`;
            return m.reply(list);
        }
        // ELIMINAR COMANDO
        if (cmd === "delcmd") {
            let name = text.trim();
            if (!name)
                return m.reply(`Uso: ${prefijo}delcmd <nombre>`);
            let result;
            if (isOwner) {
                result = await db.query(`DELETE FROM custom_commands 
           WHERE bot_id = $1 AND cmd = $2 AND is_global = true AND group_id IS NULL`, [botId, name]);
            }
            if ((!result || result.rowCount === 0) && groupId) {
                result = await db.query(`DELETE FROM custom_commands 
           WHERE bot_id = $1 AND cmd = $2 AND is_global = false AND group_id = $3`, [botId, name, groupId]);
            }
            if ((!result || result.rowCount === 0) && !name.startsWith(".")) {
                if (isOwner) {
                    result = await db.query(`DELETE FROM custom_commands 
             WHERE bot_id = $1 AND cmd = $2 AND is_global = true AND group_id IS NULL`, [botId, "." + name]);
                }
                if ((!result || result.rowCount === 0) && groupId) {
                    result = await db.query(`DELETE FROM custom_commands 
             WHERE bot_id = $1 AND cmd = $2 AND is_global = false AND group_id = $3`, [botId, "." + name, groupId]);
                }
            }
            if (!result || result.rowCount === 0) {
                return m.reply(`❌ Comando *${name}* no encontrado.\n\n💡 Asegúrate de usar el nombre exacto:\n• Si lo creaste como *.res* usa: ${prefijo}delcmd .res\n• Si lo creaste como *res* usa: ${prefijo}delcmd res`);
            }
            return m.reply(`✅ Comando *${name}* eliminado.`);
        }
        if (cmd === "addcmd" || cmd === "crear" || cmd === "editcmd") {
            const isEdit = cmd === "editcmd";
            let commandName = null;
            let commandText = null;
            const hasDirectMedia = !!getMediaTypeFromMessage(m.message);
            if (!text.trim() && !m.quoted && !hasDirectMedia) {
                return m.reply(`📌 *Uso de ${prefijo + cmd}*

- *Texto:*
${prefijo + cmd} hola | text:Hola, ¿cómo estás?

- *Respondiendo a una imagen o video:*
(responde al archivo)
${prefijo + cmd} .test | text: hola

- *Respondiendo a un sticker:*
(responde al sticker)
${prefijo + cmd} hola → Cuando alguien envie la palabra clave "hola", el bot envia en sticker.
${prefijo + cmd} .s → Cuando alguien envíe ese sticker, el bot ejecuta el comando .s

- *Crear comando vacío (para llenarlo después):*
${prefijo + cmd} .ventas
Luego usa ${prefijo}setventas <texto> (o responde a una imagen/video con ${prefijo}setventas) para asignarle contenido. Se puede tener texto e imagen a la vez; si solo mandas imagen no se borra el texto, y viceversa.

- *Renombrar un comando:*
${prefijo}editcmd nombreactual | nuevonombre

- *Eliminar un comando:*
${prefijo}delcmd nombre del comando 

⚡ *Prefijo:*
• ${prefijo + cmd} .hola → funciona con cualquier prefijo del bot.
• $${prefijo + cmd} hola → funciona sin prefijo.

👥 *Ámbito:*
• Owner: comando global para este bot.
• Admin: comando disponible solo en este grupo.`);
            }
            if (text.includes('|')) {
                const data = parseFields(text);
                commandName = data.name;
                commandText = data.text || null;
            }
            else {
                if (m.quoted) {
                    commandName = text.trim();
                    commandText = text.trim() || null;
                }
                else {
                    const parts = text.trim().split(/\s+/);
                    commandName = parts[0];
                    commandText = parts.slice(1).join(' ') || null;
                }
            }
            if (!commandName) {
                return m.reply(`❌ Debes especificar un nombre. Ejemplo: ${prefijo + cmd} hola | text:hola`);
            }
            let quotedMedia = m.quoted?.message;
            let mediaInfo = getMediaTypeFromMessage(quotedMedia);
            let mediaSource = mediaInfo ? 'quoted' : null;
            // 🔥 Si no hay media citada, revisar si la media viene DIRECTA en el
            // mismo mensaje (ej: mandar una imagen con el caption ".addcmd .test")
            if (!mediaInfo) {
                const directInfo = getMediaTypeFromMessage(m.message);
                if (directInfo) {
                    mediaInfo = directInfo;
                    mediaSource = 'direct';
                }
            }
            let mediaBuffer = null;
            let mediaUrl = null;
            let detectedType = null;
            let stickerHash = null;
            if (mediaInfo) {
                try {
                    await m.react("⏳");
                    mediaBuffer = mediaSource === 'quoted' ? await m.quoted.download() : await m.download();
                    const fileInfo = await fileTypeFromBuffer(mediaBuffer);
                    const detected = detectMediaType(fileInfo?.mime || mediaInfo.mimetype || '', mediaInfo.filename || fileInfo?.ext);
                    if (!detected) {
                        return m.reply("❌ Formato no soportado. Usa: imagen, video, audio o sticker.");
                    }
                    detectedType = detected;
                    if (detectedType === 'sticker') {
                        const isCommand = commandName && commandName.startsWith('.');
                        if (isCommand) {
                            // 🔥 Solo los comandos con "." (ej. .cerrar) necesitan hash:
                            // se disparan cuando alguien REENVÍA el sticker.
                            stickerHash = await computeStickerHash(mediaBuffer);
                            mediaUrl = null;
                        }
                        else {
                            // Comandos por PALABRA CLAVE (ej. "admins"): sin hash. Solo
                            // se disparan cuando alguien ESCRIBE la palabra clave, no al
                            // reenviar el sticker.
                            stickerHash = null;
                            mediaUrl = await evogb(mediaBuffer);
                        }
                    }
                    else {
                        mediaUrl = await evogb(mediaBuffer);
                    }
                }
                catch (err) {
                    console.error("❌ Error procesando media:", err);
                    return m.reply(`❌ Error al subir: ${err.message}`);
                }
            }
            const nativeCommands = ['addcmd', 'editcmd', 'delcmd', 'listcmds', 'help', 'ping'];
            const cleanName = commandName.startsWith(prefijo) ? commandName.slice(prefijo.length) : commandName;
            if (nativeCommands.includes(cleanName)) {
                return m.reply("❌ No puedes sobreescribir comandos nativos.");
            }
            let finalType = detectedType || 'text';
            if (finalType === 'sticker' && !commandText) {
                commandText = commandName;
            }
            // 🔥 Si es addcmd (no editcmd) y no se dio texto ni media, se crea un
            // comando VACÍO (sin contenido). Luego se rellena con .set<nombre>.
            // Ej: .addcmd .ventas  →  crea el comando ".ventas" sin contenido.
            // 🔥 VERIFICAR EXISTENCIA
            let existing;
            if (isOwner) {
                existing = await db.query(`SELECT * FROM custom_commands 
           WHERE bot_id = $1 AND cmd = $2 AND is_global = true AND group_id IS NULL`, [botId, commandName]);
                if (existing.rows.length === 0 && groupId) {
                    existing = await db.query(`SELECT * FROM custom_commands 
             WHERE bot_id = $1 AND cmd = $2 AND is_global = false AND group_id = $3`, [botId, commandName, groupId]);
                }
            }
            else {
                if (groupId) {
                    existing = await db.query(`SELECT * FROM custom_commands 
             WHERE bot_id = $1 AND cmd = $2 AND group_id = $3`, [botId, commandName, groupId]);
                }
            }
            const exists = existing && existing.rows.length > 0;
            if (isEdit && !exists) {
                return m.reply(`❌ El comando *${commandName}* no existe. Usa *${prefijo + cmd}*.`);
            }
            if (!isEdit && exists) {
                return m.reply(`❌ El comando *${commandName}* ya existe. Usa *editcmd* para modificarlo.`);
            }
            try {
                if (isEdit) {
                    // 🔥 CORREGIDO: UPDATE con la lógica correcta
                    if (isOwner) {
                        // Actualizar GLOBAL (is_global = true, group_id IS NULL)
                        await db.query(`UPDATE custom_commands 
               SET type = $1, text = $2, url = $3, sticker_hash = $4, updated_at = NOW()
               WHERE bot_id = $5 AND cmd = $6 AND is_global = true AND group_id IS NULL`, [finalType, commandText, mediaUrl, stickerHash, botId, commandName]);
                    }
                    else {
                        // Actualizar LOCAL (group_id específico)
                        await db.query(`UPDATE custom_commands 
               SET type = $1, text = $2, url = $3, sticker_hash = $4, updated_at = NOW()
               WHERE bot_id = $5 AND cmd = $6 AND group_id = $7`, [finalType, commandText, mediaUrl, stickerHash, botId, commandName, groupId]);
                    }
                }
                else {
                    await db.query(`INSERT INTO custom_commands (bot_id, group_id, cmd, type, text, url, sticker_hash, is_global, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [botId, groupId, commandName, finalType, commandText, mediaUrl, stickerHash, isGlobal, m.sender]);
                }
                const typeEmoji = finalType === 'text' ? '📝' : finalType === 'image' ? '🖼️' : finalType === 'video' ? '🎬' : finalType === 'audio' ? '🎵' : finalType === 'sticker' ? '🏷️' : '📦';
                const scope = isGlobal ? 'global en este bot' : 'en este grupo';
                const hasPrefix = commandName.startsWith(prefijo) ? 'con prefijo' : 'sin prefijo';
                let msg = `✅ Comando *${commandName}* ${isEdit ? 'actualizado' : 'creado'} (${scope}) (${hasPrefix})\n\n`;
                msg += `Tipo: ${finalType} ${typeEmoji}\n`;
                if (commandText)
                    msg += `📝 Texto: ${commandText}\n`;
                if (mediaUrl)
                    msg += `🔗 Media: ${mediaUrl}\n`;
                if (!commandText && !mediaUrl) {
                    const cleanCmd = commandName.startsWith(prefijo) ? commandName.slice(prefijo.length) : commandName;
                    msg += `\n⚠️ Este comando aún no tiene contenido.\n💡 Usa *${prefijo}set${cleanCmd.replace(/^\./, '')} <texto>* o responde a una imagen/video con *${prefijo}set${cleanCmd.replace(/^\./, '')}* para configurarlo.`;
                }
                await m.react("✅");
                return m.reply(msg);
            }
            catch (err) {
                console.error("❌ Error:", err);
                return m.reply(`❌ Error: ${err.message}`);
            }
        }
    }
};
