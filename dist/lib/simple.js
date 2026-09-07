// @ts-nocheck
import { downloadMediaMessage, downloadContentFromMessage, generateWAMessage, generateWAMessageFromContent, prepareWAMessageMedia } from "@whiskeysockets/baileys";
import fetch from 'node-fetch';
import fs from "fs";
import { fileTypeFromBuffer } from "file-type";
import { db, getBotSettings } from './db.js';
function cleanNumber(jid) {
    if (!jid)
        return "";
    return jid
        .split("@")[0]
        .split(":")[0]
        .replace(/[^0-9]/g, "");
}
function stripDevice(jid) {
    if (!jid)
        return "";
    return jid.replace(/:\d+(?=@)/, "");
}
function getCleanUserJid(jid) {
    if (!jid)
        return "";
    let clean = stripDevice(jid);
    clean = clean.split("@")[0].replace(/[^0-9]/g, "");
    if (clean)
        return clean + "@s.whatsapp.net";
    return "";
}
async function getDefaultContextInfo(conn, text = '') {
    const botId = conn.user?.id?.split(":")[0] || "mainbot";
    const settings = await getBotSettings(botId);
    const jid = settings?.newsletter_jid || "120363285614743024@newsletter";
    const name = settings?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
    const isActive = jid && jid !== "" && jid !== "off";
    const contextInfo = {
        mentionedJid: await conn.parseMention(text),
        isForwarded: true,
        forwardingScore: 1
    };
    if (isActive) {
        contextInfo.forwardedNewsletterMessageInfo = {
            newsletterJid: jid,
            newsletterName: name
        };
    }
    return contextInfo;
}
export async function smsg(conn, m) {
    if (!m)
        return m;
    // 🔥 SOBRESCRIBIR conn.sendMessage con contextInfo por defecto
    const originalSendMessage = conn.sendMessage.bind(conn);
    conn.sendMessage = async function (jid, content, options = {}) {
        const text = content?.text || content?.caption || '';
        // Obtener configuración del canal del bot
        const botId = conn.user?.id?.split(":")[0] || "mainbot";
        const settings = await getBotSettings(botId);
        const channelJid = settings?.newsletter_jid || "120363285614743024@newsletter";
        const channelName = settings?.newsletter_name || "ᴄʜᴀɴɴᴇʟ🦖ᴢᴇɴᴛʀɪx";
        const isActive = channelJid && channelJid !== "" && channelJid !== "off";
        const contextInfoDefault = {
            mentionedJid: await conn.parseMention(text),
            isForwarded: true,
            forwardingScore: 1
        };
        // Solo agregar newsletter si está activo
        if (isActive) {
            contextInfoDefault.forwardedNewsletterMessageInfo = {
                newsletterJid: channelJid,
                newsletterName: channelName
            };
        }
        // Si NO tiene contextInfo, agregar el por defecto
        if (!content.contextInfo) {
            content.contextInfo = contextInfoDefault;
        }
        return originalSendMessage(jid, content, options);
    };
    m.db = { query: (...args) => db.query(...args) };
    const botId = conn.user?.id?.split(":")[0].replace(/[^0-9]/g, "") || "mainbot";
    const settings = await getBotSettings(botId);
    const e = Object.assign({ error: "❌", ok: "✅", warn: "⚠️", load: "⌛", currency_name: "Diamante(s)", currency_emoji: "💎" }, settings.emoji_set || {});
    m.msg = Object.assign({
        admin: "Solo los *admins* del grupo pueden usar este comando.",
        group: "¿Estos es un grupos?, Este comando solo funciona en *grupos* bobo",
        private: "Este comando solo puede usarse *Al privados* del bot.",
        owner: "Solo el *dueño del bot* puede usar este comando.",
        error: "```OCURRIO UN ERROR```\n\n> *Reporta el siguiente error a mi creador con el comando:* #report",
        warn: "⚠️ Cuidado, revisa lo que has enviado.",
        success: "✅ Completado exitosamente",
        example: "📌 Ejemplo: /comando argumento",
        wait: "⏳ Espera antes de volver a usar este comando.",
    }, settings.system_msgs || {});
    m.e = e;
    if (m.key.remoteJid?.endsWith('@g.us')) {
        m.chat = m.key.remoteJid;
    }
    else {
        const alt = m.key.remoteJidAlt || m.key.participantAlt;
        m.chat = (alt ||
            (m.key.remoteJid?.endsWith('@lid')
                ? m.key.remoteJid.replace('@lid', '@s.whatsapp.net')
                : m.key.remoteJid)) || "";
    }
    if (!m.mentionedJid)
        m.mentionedJid = m.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    // 🔥 CORREGIDO: DETECTAR quoted EN STICKERS Y OTROS TIPOS
    if (!m.quoted) {
        let ctx = null;
        let quotedMsg = null;
        let stanzaId = null;
        let participant = null;
        // 1. Buscar en extendedTextMessage
        if (m.message?.extendedTextMessage?.contextInfo) {
            ctx = m.message.extendedTextMessage.contextInfo;
        }
        // 2. Buscar en stickerMessage (🔥 ESTA ES LA CLAVE PARA STICKERS)
        if (!ctx && m.message?.stickerMessage?.contextInfo) {
            ctx = m.message.stickerMessage.contextInfo;
        }
        // 3. Buscar en imageMessage, videoMessage, audioMessage, documentMessage
        if (!ctx) {
            const tipos = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];
            for (const tipo of tipos) {
                if (m.message?.[tipo]?.contextInfo) {
                    ctx = m.message[tipo].contextInfo;
                    break;
                }
            }
        }
        // Si encontramos contextInfo y tiene quotedMessage
        if (ctx && ctx.quotedMessage) {
            quotedMsg = ctx.quotedMessage;
            stanzaId = ctx.stanzaId;
            participant = ctx.participant;
            const quotedMessage = {
                key: {
                    id: stanzaId,
                    fromMe: participant === conn.user?.jid,
                    remoteJid: m.chat,
                    participant: participant,
                },
                message: quotedMsg,
                messageTimestamp: m.messageTimestamp,
                participant: participant,
                sender: participant,
                chat: m.chat,
            };
            m.quoted = {
                ...quotedMessage,
                download: () => downloadMediaMessage(quotedMessage, 'buffer', {}),
            };
        }
    }
    if (m.quoted && m.quoted.message && typeof m.quoted.message === 'object') {
        const keys = Object.keys(m.quoted.message);
        if (keys.length > 0) {
            const type = keys[0];
            const media = m?.quoted.message[type];
            if (type?.includes('image'))
                m.quoted.mimetype = 'image';
            else if (type?.includes('video'))
                m.quoted.mimetype = 'video';
            else if (type?.includes('sticker'))
                m.quoted.mimetype = 'image/webp';
            else if (type?.includes('audio'))
                m.quoted.mimetype = 'audio';
            else if (type?.includes('document'))
                m.quoted.mimetype = media.mimetype || 'application/octet-stream';
        }
    }
    if (!m.mimetype) {
        const messageContent = m.message;
        if (messageContent) {
            const type = Object.keys(messageContent)[0];
            if (type && type.includes('image'))
                m.mimetype = 'image';
            else if (type && type.includes('video'))
                m.mimetype = 'video';
            else if (type && type.includes('sticker'))
                m.mimetype = 'image/webp';
            else if (type && type.includes('audio'))
                m.mimetype = 'audio';
            else if (type && type.includes('document')) {
                const msgMedia = messageContent[type];
                m.mimetype = msgMedia?.mimetype || 'application/octet-stream';
            }
        }
    }
    const rawJid = m.key.senderPn ||
        m.key.jid ||
        m.key.participantPn ||
        m.key.participant ||
        (m.key.remoteJid && !m.key.remoteJid.endsWith("@g.us")
            ? m.key.remoteJid
            : "");
    const altJid = m.key.participantAlt ||
        m.key.remoteJidAlt ||
        (m.message?.extendedTextMessage?.contextInfo?.participant ?? "") ||
        "";
    // LID
    m.lid =
        rawJid?.includes("@lid")
            ? rawJid
            : altJid?.includes("@lid")
                ? altJid
                : "";
    // Resolver LID -> número
    let resolvedNumber = "";
    if (m.lid) {
        try {
            const lidId = m.lid.replace("@lid", "");
            const botNumber = conn.user?.id?.split(":")[0]?.replace(/[^0-9]/g, "");
            const subPath = `${process.cwd()}/sessions/sub_${botNumber}`;
            const sessionDir = botNumber && fs.existsSync(subPath) ? subPath : `${process.cwd()}/sessions/main`;
            const file = `${sessionDir}/lid-mapping-${lidId}_reverse.json`;
            if (fs.existsSync(file)) {
                const data = JSON.parse(fs.readFileSync(file, "utf8"));
                if (typeof data === "string") {
                    resolvedNumber = `${data}@s.whatsapp.net`;
                }
            }
        }
        catch (e) {
            console.error("Error resolviendo LID:", e);
        }
    }
    // Número real
    const realJid = resolvedNumber ||
        (rawJid?.includes("@s.whatsapp.net")
            ? rawJid
            : altJid?.includes("@s.whatsapp.net")
                ? altJid
                : m.key.jid || altJid || rawJid);
    m.sender = m.key.fromMe
        ? stripDevice(conn.user?.id || "")
        : stripDevice(realJid || m.key.remoteJid || m.key.participant || "");
    m.username = m.key.participantUsername || m.key.remoteJidUsername;
    m.isGroup = m.chat.endsWith("@g.us");
    m.id = m.key.id;
    m.who = m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : m.fromMe ? conn.user.id : m.sender;
    m.pp = async () => {
        return await conn.profilePictureUrl(m.who, 'image')
            .catch(() => 'https://telegra.ph/file/33bed21a0eaa789852c30.jpg');
    };
    Array.prototype.getRandom = function () {
        return this[Math.floor(Math.random() * this.length)];
    };
    // reply
    /*conn.reply = async (chatId, text, quoted = null, options = {}) => {
        return await conn.sendMessage(chatId, { text }, { quoted, ...options });
    };*/
    conn.reply = async (jid, text, quoted = null, content = {}, options = {}) => {
        if (content.thumbnail) {
            const linkPreview = {};
            const matchedText = content.thumbnailUrl || "https://telegra.ph/file/39fb047cdf23c790e0146.jpg";
            text = matchedText + ' ' + text;
            linkPreview['matched-text'] = matchedText;
            linkPreview.title = content.title || "Mitzuki";
            linkPreview.description = content.description || "";
            linkPreview.previewType = content.previewType || "video";
            // Si thumbnail es Buffer o URL
            let thumbnailBuffer = content.thumbnail;
            if (typeof thumbnailBuffer === 'string' && thumbnailBuffer.startsWith('http')) {
                const res = await fetch(thumbnailBuffer);
                thumbnailBuffer = Buffer.from(await res.arrayBuffer());
            }
            linkPreview.jpegThumbnail = thumbnailBuffer;
            if (content.largeThumbnail) {
                const { imageMessage: img } = await prepareWAMessageMedia({
                    image: thumbnailBuffer,
                    mimetype: 'image/jpeg'
                }, {
                    upload: conn.waUploadToServer,
                    mediaTypeOverride: 'thumbnail-link'
                });
                img.width = content.width || 720;
                img.height = content.height || 440;
                linkPreview.highQualityThumbnail = img;
            }
            content.linkPreview = linkPreview;
        }
        content.text = text;
        content.mentions = await conn.parseMention(text);
        options.quoted = quoted;
        return conn.sendMessage(jid, content, options);
    };
    conn.getName = async (jid, withoutContact = false, m = null) => {
        if (!jid)
            return null;
        jid = conn.decodeJid ? conn.decodeJid(jid) : jid;
        try {
            if (jid.endsWith("@g.us")) {
                const metadata = await conn.groupMetadata(jid);
                return metadata.subject || jid.split("@")[0];
            }
            if (jid === "0@s.whatsapp.net")
                return "WhatsApp";
            if (conn.user?.jid && jid === conn.user.jid)
                return conn.user.name || jid.split("@")[0];
            if (m?.pushName)
                return m.pushName;
            const res = await db.query("SELECT name FROM usuarios WHERE id = $1", [jid]);
            if (res.rows.length && res.rows[0].name)
                return res.rows[0].name;
            return jid.split("@")[0];
        }
        catch (err) {
            console.error(err);
            return jid.split("@")[0];
        }
    };
    // react
    m.react = async (emoji) => {
        if (!emoji)
            return;
        return conn.sendMessage(m.chat, { react: { text: emoji, key: m.key } });
    };
    // descargar media
    m.download = async () => {
        const content = m.message || (m.quoted && m.quoted.message);
        if (!content)
            return null;
        const type = Object.keys(content)[0];
        const stream = await downloadContentFromMessage(content[type], type.includes("image") ? "image" : type.includes("video") ? "video" : "document");
        const chunks = [];
        for await (const chunk of stream)
            chunks.push(chunk);
        return Buffer.concat(chunks);
    };
    // sendFile
    conn.sendFile = async function (jid, path, filename = '', caption = '', quoted = null, ptt = false, options = {}) {
        try {
            const contextInfo = options.contextInfo ?? {};
            delete options.contextInfo;
            const getCleanExt = (url) => {
                const match = url.match(/\.([a-zA-Z0-9]+)(\?|$)/);
                return match ? match[1].toLowerCase() : 'bin';
            };
            if (Buffer.isBuffer(path)) {
                const fileInfo = (await fileTypeFromBuffer(path)) || {};
                const ext = (filename.includes('.') ? filename.split('.').pop() : getCleanExt(filename)).toLowerCase();
                const mime = fileInfo.mime || 'application/octet-stream';
                const fileName = filename || `file.${ext}`;
                const messageType = (() => {
                    if (ext === 'webp')
                        return 'sticker';
                    if (['mp4', 'mov', 'mkv'].includes(ext))
                        return 'video';
                    if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext))
                        return 'audio';
                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
                        return 'image';
                    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
                        return 'document';
                    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'json', 'apk'].includes(ext))
                        return 'document';
                    return 'document';
                })();
                // Obtener contextInfo por defecto
                const defaultContextInfo = await getDefaultContextInfo(this, caption || '');
                const finalContextInfo = { ...defaultContextInfo, ...contextInfo };
                return await this.sendMessage(jid, {
                    ...(messageType === 'sticker' ? { sticker: path } : { [messageType]: path }),
                    mimetype: mime,
                    fileName,
                    caption,
                    contextInfo: finalContextInfo,
                    ...options,
                }, { quoted });
            }
            else if (typeof path === 'string' && /^https?:\/\//.test(path)) {
                const res = await fetch(path);
                if (!res.ok)
                    throw new Error(`Error HTTP ${res.status}: ${res.statusText}`);
                const buffer = await res.buffer();
                const fileInfo = (await fileTypeFromBuffer(buffer)) || {};
                const mime = fileInfo.mime || 'application/octet-stream';
                const ext = (typeof filename === 'string' && filename.includes('.')
                    ? filename.split('.').pop()
                    : getCleanExt(path)).toLowerCase();
                const fileName = filename || `file.${ext}`;
                const messageType = (() => {
                    if (ext === 'webp')
                        return 'sticker';
                    if (['mp4', 'mov', 'mkv'].includes(ext))
                        return 'video';
                    if (['mp3', 'm4a', 'ogg', 'wav'].includes(ext))
                        return 'audio';
                    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext))
                        return 'image';
                    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext))
                        return 'document';
                    if (['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt', 'csv', 'json', 'apk'].includes(ext))
                        return 'document';
                    return 'document';
                })();
                const defaultContextInfo = await getDefaultContextInfo(this, caption || '');
                const finalContextInfo = { ...defaultContextInfo, ...contextInfo };
                return await this.sendMessage(jid, {
                    ...(messageType === 'sticker' ? { sticker: buffer } : { [messageType]: buffer }),
                    mimetype: mime,
                    fileName,
                    caption,
                    contextInfo: finalContextInfo,
                    ...options,
                }, { quoted });
            }
            else if (typeof path === 'string' && fs.existsSync(path)) {
                const buffer = await fs.promises.readFile(path);
                return await this.sendFile(jid, buffer, filename, caption, quoted, ptt, options);
            }
            throw new Error('sendFile: ruta o buffer inválido');
        }
        catch (e) {
            console.error('❌ Error en sendFile:', e.message);
            return null;
        }
    };
    conn.fakeReply = async function (jid, caption = '', fakeNumber = '0@s.whatsapp.net', fakeCaption = '', quoted = null, options = {}) {
        return this.sendMessage(jid, { text: caption, ...options }, {
            quoted: {
                key: {
                    fromMe: false,
                    participant: fakeNumber,
                    ...(jid.endsWith('@g.us')
                        ? { remoteJid: jid }
                        : { remoteJid: null })
                },
                message: {
                    conversation: fakeCaption
                },
                messageTimestamp: Math.floor(Date.now() / 1000)
            }
        });
    };
    // sendImage
    conn.sendImage = async (jid, url, caption = "", quoted = null, options = {}) => {
        return conn.sendMessage(jid, { image: { url }, caption, ...options }, { quoted });
    };
    // sendVideo
    conn.sendVideo = async (jid, url, caption = "", quoted = null, options = {}) => {
        return conn.sendMessage(jid, { video: { url }, caption, ...options }, { quoted });
    };
    // sendAudio
    conn.sendAudio = async (jid, url, quoted = null, options = {}) => {
        return conn.sendMessage(jid, { audio: { url }, mimetype: "audio/mpeg", ...options }, { quoted });
    };
    // sendAlbum
    conn.sendAlbumMessage = async function (jid, medias = [], caption = '', quoted = null) {
        if (!Array.isArray(medias) || medias.length === 0) {
            throw new Error("No se proporcionaron medios válidos.");
        }
        const album = generateWAMessageFromContent(jid, {
            albumMessage: {
                expectedImageCount: medias.filter(media => media.type === "image").length,
                expectedVideoCount: medias.filter(media => media.type === "video").length,
                ...(quoted ? {
                    contextInfo: {
                        remoteJid: quoted.key.remoteJid,
                        fromMe: quoted.key.fromMe,
                        stanzaId: quoted.key.id,
                        participant: quoted.key.participant || quoted.key.remoteJid,
                        quotedMessage: quoted.message
                    }
                } : {})
            }
        }, { quoted });
        await this.relayMessage(album.key.remoteJid, album.message, {
            messageId: album.key.id
        });
        for (let i = 0; i < medias.length; i++) {
            const { type, data } = medias[i];
            let mediaMessage;
            const mediaPayload = {};
            mediaPayload[type] = data;
            if (i === 0 && caption) {
                mediaPayload.caption = caption;
            }
            mediaMessage = await generateWAMessage(album.key.remoteJid, mediaPayload, {
                upload: this.waUploadToServer
            });
            mediaMessage.message.messageContextInfo = {
                messageAssociation: {
                    associationType: 1,
                    parentMessageKey: album.key
                }
            };
            await this.relayMessage(mediaMessage.key.remoteJid, mediaMessage.message, {
                messageId: mediaMessage.key.id
            });
        }
        return album;
    };
    conn.parseMention = async (text = '') => {
        try {
            if (typeof text !== 'string')
                return [];
            const matches = [...text.matchAll(/@([0-9]{5,15})/g)];
            return matches.map(match => `${match[1]}@s.whatsapp.net`).filter(jid => jid.includes('@s.whatsapp.net'));
        }
        catch (e) {
            console.error(e);
            return [];
        }
    };
    // sendSticker
    conn.sendSticker = async (jid, path, quoted = null, options = {}) => {
        return conn.sendMessage(jid, { sticker: Buffer.isBuffer(path) ? path : { url: path }, ...options }, { quoted });
    };
    return m;
}
