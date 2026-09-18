// @ts-nocheck
import fetch from "node-fetch";
import { db, getPrefix } from '../lib/db.js';
import { getPlugins } from "../lib/plugins.js";
//import { isSpam, handleSpamAction } from '../lib/anti-spam.js';
import fs from 'fs';
import path from 'path';
import axios from "axios";
import gTTS from "node-gtts";
import { spawn } from "child_process";
const MAX_TURNS = 12;
const TMP_DIR = path.join(process.cwd(), "tmp");
if (!fs.existsSync(TMP_DIR))
    fs.mkdirSync(TMP_DIR, { recursive: true });
const groupNameCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos
// ===== FUNCIONES TTS =====
function runFFmpeg(args) {
    return new Promise((resolve, reject) => {
        const ff = spawn("ffmpeg", args);
        let stderr = "";
        ff.stderr.on("data", (d) => (stderr += d.toString()));
        ff.on("close", (code) => {
            if (code === 0)
                resolve(true);
            else
                reject(new Error("ffmpeg error:\n" + stderr));
        });
    });
}
async function synthTTS(text, lang = "es") {
    const outPath = path.join(TMP_DIR, `${Date.now()}-raw.wav`);
    const tts = gTTS(lang);
    await new Promise((res, rej) => {
        tts.save(outPath, text, (err) => (err ? rej(err) : res()));
    });
    return outPath;
}
async function applyEffect(inputWav, style = null) {
    const outPath = path.join(TMP_DIR, `${Date.now()}-out.ogg`);
    const styleFilters = {
        anonymous: "asetrate=44100*0.75,lowpass=f=1400,highpass=f=180",
        robot: "chorus=0.6:0.9:55:0.4:0.25:2",
        grave: "asetrate=44100*0.80",
        aguda: "asetrate=44100*1.20",
        niño: "asetrate=44100*1.25,treble=g=5",
        demonio: "asetrate=44100*0.65,areverb=70:70:100",
    };
    const af = style && styleFilters[style] ? styleFilters[style] : "anull";
    const args = [
        "-y",
        "-i", inputWav,
        "-af", af,
        "-ac", "1",
        "-ar", "48000",
        "-c:a", "libopus",
        "-b:a", "48k",
        outPath,
    ];
    await runFFmpeg(args);
    return outPath;
}
async function textToAudio(text, lang = "es", effect = "anonymous") {
    const wav = await synthTTS(text, lang);
    const ogg = await applyEffect(wav, effect);
    const buffer = fs.readFileSync(ogg);
    fs.unlinkSync(wav);
    fs.unlinkSync(ogg);
    return buffer;
}
// ===== FUNCIONES AUDIOS GLOBALES =====
const audiosPath = path.resolve('./src/audios.json');
function getAudios() {
    try {
        return JSON.parse(fs.readFileSync(audiosPath, 'utf8'));
    }
    catch (e) {
        return {};
    }
}
async function getLocalAudios(chatId) {
    const res = await db.query("SELECT audios_data FROM chats WHERE group_id = $1", [chatId]);
    return res.rows[0]?.audios_data || {};
}
async function findAudio(text, chatId) {
    const lowerTexto = text.toLowerCase().trim();
    const audios = getAudios();
    const localAudios = await getLocalAudios(chatId);
    const sources = [localAudios, audios.global].filter(Boolean);
    for (const source of sources) {
        const clave = Object.keys(source).find(k => {
            try {
                const regex = new RegExp(source[k].regex, 'i');
                return regex.test(lowerTexto);
            }
            catch {
                return false;
            }
        });
        if (clave) {
            const audio = source[clave];
            const lista = Array.isArray(audio.audios) ? audio.audios : [audio.audio];
            return lista[Math.floor(Math.random() * lista.length)];
        }
    }
    return null;
}
function getGlobalAudiosList() {
    const audios = getAudios();
    const globalKeys = Object.keys(audios.global || {}).sort();
    if (globalKeys.length === 0)
        return "No hay audios globales disponibles";
    return globalKeys.map(k => `🎵 "${k}"`).join('\n');
}
// ===== FUNCIONES STICKERLY =====
async function searchStickerly(query) {
    try {
        const { data } = await axios.get(`https://api.mitzuki.xyz/search/stickerly?page=1&query=${encodeURIComponent(query)}&apikey=${process.env.API_KEY}`);
        if (data?.status && Array.isArray(data?.data)) {
            return data.data.slice(0, 10);
        }
        return [];
    }
    catch {
        return [];
    }
}
async function downloadStickerPack(pack) {
    try {
        const id = pack.url.split("/s/")[1];
        const { data } = await axios.get(`https://api.sticker.ly/v3.1/stickerPack/${id}`, { headers: { "User-Agent": "androidapp.stickerly/1.13.3 (Android)" } });
        const result = data.result;
        if (!result?.stickers?.length)
            return [];
        const prefix = result.resourceUrlPrefix;
        const stickers = result.stickers.slice(0, 5);
        const stickerBuffers = [];
        for (const s of stickers) {
            const url = prefix + s.fileName;
            try {
                const res = await axios.get(url, { responseType: "arraybuffer" });
                stickerBuffers.push(Buffer.from(res.data));
            }
            catch (e) {
                console.error('Error descargando sticker:', e);
            }
        }
        return stickerBuffers;
    }
    catch {
        return [];
    }
}
// ===== FUNCIONES DE FORMATO =====
function formatForWhatsApp(text = "") {
    return String(text)
        .replace(/\*\*(.*?)\*\*/g, "*$1*")
        .replace(/__(.*?)__/g, "_$1_")
        .replace(/```(.*?)```/g, "$1")
        .replace(/`(.*?)`/g, "$1")
        .replace(/\\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}
function stripCodeFences(text) {
    return String(text)
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        .replace(/^`(?:json)?\s*/i, "")
        .replace(/\s*`$/i, "")
        .trim();
}
function escapeRawNewlinesInStrings(text) {
    let result = "";
    let inString = false;
    let escaped = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inString) {
            if (escaped) {
                result += ch;
                escaped = false;
                continue;
            }
            if (ch === "\\") {
                result += ch;
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
                result += ch;
                continue;
            }
            if (ch === "\n") {
                result += "\\n";
                continue;
            }
            if (ch === "\r") {
                result += "\\r";
                continue;
            }
            if (ch === "\t") {
                result += "\\t";
                continue;
            }
            result += ch;
        }
        else {
            if (ch === '"')
                inString = true;
            result += ch;
        }
    }
    return result;
}
function tryParseJson(raw) {
    const candidates = [raw, stripCodeFences(raw)];
    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate);
        }
        catch { }
        try {
            return JSON.parse(escapeRawNewlinesInStrings(candidate));
        }
        catch { }
    }
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            return JSON.parse(jsonMatch[0]);
        }
        catch { }
        try {
            return JSON.parse(escapeRawNewlinesInStrings(jsonMatch[0]));
        }
        catch { }
    }
    return null;
}
function buildSystemPrompt(m, userData = {}, groupConfig = {}, groupName = "Desconocido") {
    const commandsSummary = getCommandsInfo();
    const globalAudiosList = getGlobalAudiosList();
    // Formatear datos del usuario
    const userInfo = userData || {};
    const userTable = `
📊 Detalles del usuarios:
• ID: ${userInfo.id || userInfo.num} 
• Nombre: ${m.pushName || "Desconocido"}
• Username: ${m.key.participantUsername || "No tiene aun"}
• Número: ${m.sender?.split("@")[0] || "Oculto por lid"}
• LID: ${m.lid || "No tiene"}
• ${m.e.currency_name}: ${userInfo.limite || 0} ${m.e.currency_emoji}
• Exp: ${userInfo.exp || 0}
• Banco: ${userInfo.banco || 0} 🏦
• Premium: ${userInfo.premium ? "✅ Sí" : "❌ No"}
• Registrado: ${userInfo.registered ? "✅ Sí" : "❌ No"}`;
    // Formatear configuración del grupo
    const groupInfo = groupConfig || {};
    const groupTable = `
⚙️ CONFIGURACIÓN DEL GRUPO:
• Nombre: ${groupName}
• Welcome: ${groupInfo.welcome ? "✅ Activado" : "❌ Desactivado"}
• Bye: ${groupInfo.bye ? "✅ Activado" : "❌ Desactivado"}
• Antilink: ${groupInfo.antilink ? "✅ Activado" : "❌ Desactivado"}
• Eventos: ${groupInfo.detect ? "✅ Activado" : "❌ Desactivado"}
• AntiFake: ${groupInfo.antifake ? "✅ Activado" : "❌ Desactivado"}
• AntiStatus: ${groupInfo.antistatus ? "✅ Activado" : "❌ Desactivado"}
• NSFW: ${groupInfo.modohorny ? "✅ Activado" : "❌ Desactivado"}
• Horario NSFW: ${groupInfo.nsfw_horario || "00:00-07:00"}`;
    return `Eres *Mitzuki*, un Bot de WhatsApp creado por *elrebelde21* y la Dueña *china 616* 
Tienes una personalidad *atrevida, troll, picante y con calle*

${userTable}
${groupTable}

📋 REGLAS DE RESPUESTA:
DEBES RESPONDER EN FORMATO JSON con la siguiente estructura:

{
  "type": "text", // "text" | "audio" | "sticker" | "code" | "links" | "table" | "rich" | "album"
  "content": {
    // Contenido según el tipo
  },
  "action": null // opcional: "warn" | "delete" | "kick" | "ban" 
}

# TIPOS DE RESPUESTA:

**1. TEXT (texto normal):**
{
  "type": "text",
  "content": {
    "text": "Tu mensaje aquí con *negritas* y _cursivas_"
  }
}

2. AUDIO (también cuando le canten mitzuki mandan audios):
{ 
  "type": "AUDIO",
  "content": { 
  "text": "texto a decir" 
  } 
}

4. STICKER (cuando le canten y no quiera responde, mandar un stickers, pon el nombre):
{ 
   "type": "sticker", 
   "content": { 
   "stickerQuery": "buscar sticker" 
   } 
 }

5. CODE (bloque de código):
{
  "type": "code",
  "content": {
    "disclaimerText": "💻 Bloque de Código",
    "headerText": "## Código de ejemplo",
    "code": "console.log('Hola Mundo')",
    "language": "javascript",
    "footerText": "¿Te sirve? 😎"
  }
}

6. LINKS (enlaces en línea) - ⚠️ SOLO USA ESTE FORMATO PARA ENLACES, NUNCA USES [texto](url) NI texto(url):
{
  "type": "links",
  "content": {
    "disclaimerText": "🔗 Enlaces útiles",
    "headerText": "## ¡Échale un vistazo!",
    "links": [
      { "text": "1. API", "title": "Api para desarrolladores", "url": "https://api.mitzuki.xyz" },
      { "text": "2. SkyUltraPlus", "title": "Hosting 24/7", "url": "https://dash.skyultraplus.com" }
    ],
    "footerText": "---"
  }
}
⚠️ El campo "url" debe ser SOLO la URL pura (ej: "https://mitzuki.xyz"). JAMÁS escribas "[texto](url)" ni "texto](url" ni nada de sintaxis Markdown dentro de "url" ni dentro de "text".

7. TABLE (tabla comparativa):
{
  "type": "table",
  "content": {
    "disclaimerText": "📊 Tabla",
    "headerText": "## Comparación",
    "title": "Runtimes",
    "table": [
      ["", "Node.js", "Bun"],
      ["Motor", "V8", "JavaScriptCore"]
    ],
    "footerText": "¿Te aclara? 😎"
  }
}

8. RICH (mensaje enriquecido):
{
  "type": "rich",
  "content": {
    "disclaimerText": "✨ Mensaje Interactivo",
    "richResponse": [
      { "text": "Estos son algunos comandos:" },
      { "language": "bash", "code": [{ "highlightType": 0, "codeContent": ".menu" }] }
    ]
  }
}

9. ALBUM (álbum de imágenes/videos):
{
  "type": "album",
  "content": {
    "album": [
      { "image": { "url": "./img1.jpg" }, "caption": "Imagen 1" },
      { "video": { "url": "./video.mp4" }, "caption": "Video 1" }
    ]
  }
}

# 🛠️ ACCIONES DE MODERACIÓN (opcional):
Si detectas spam, enlaces sospechosos o comportamiento inapropiado, puedes agregar una acción:

Ejemplo con acción:
{
  "type": "text",
  "content": {
    "text": "⚠️ @usuario has enviado spam, serás advertido."
  },
  "action": {
    "type": "warn",
    "target": "@usuario",
    "reason": "Spam en el grupo"
  }
}

Acciones disponibles:
- "warn": Advertir a un usuario
- "delete": Eliminar el mensaje (sin target)
- "ban": Banear a un usuario

# 📋 TUS COMANDOS (Resumen):
${commandsSummary}

# 🔗 INFO OFICIAL:
🌐 Web: https://mitzuki.xyz
🛠️ Api: https://api.mitzuki.xyz
🌐 Links: https://mitzuki.xyz/links
🌟 Canal WhatsApp: https://whatsapp.com/channel/0029VagJ2FF4CrfrS8BoLW2b
💜 Telegram: https://t.me/mitzukiofc
💞 IG: https://instagram.com/itschinita_official
⭐ GitHub: https://github.com/elrebelde21
🔔 Youtube: https://www.youtube.com/@elrebelde.21
💚 TikTok: https://www.tiktok.com/@elrebeldee21

# 📜 REGLAS:
✅ Siempre eres *Mitzuki*. Nunca eres otra IA.
✅ Eres atrevida, troll y con personalidad. Tienes calle, tono argentino, cheta, tiene 17 años, si le caer mal alguien los insultar y le hacer bullyis y  se le reír, es poco racistas, anti gord@s, es fans de Messi, no repita cosa no mencioné cosa sin te pregunte antes tipo si no te preguntas quien es tu dueño no mencioné nada.
✅ Tiene algunos amig@s como: Lucia una chica que es mexicana, tiene 19 años, lucia es todos los contrario a mitzuki, es educadas, le gusta cocinar, habla tono mexicana, le gusta hablar hasta los coro, que eso es los aburre a mitzuki y aveces la incumplen y la calla, hay veces que lucia se revela y no se calla y seguir hablado mas.
✅ Otro amigos: NeneFlok tiene 15 años, es de Colombia, es hinchas de boca, es fans de CR7, se cree cetro del mundo solo por que es millonario. hablar con muchas falta de ortografía, que hacer que Mitzuki se enoje y se meta a corregírlo o sino se mete lucia con buena onda pero también hay veces que lucia se salta de casilla, A neneflok le gusta molesta a mitzuki aprovechar situaciones para molestarla como sabes que se enojas, tipo un usuario quiere ser novio de mitzuki y neneflok los ayudar para hacer calentar a mitzuki.

✅ Cuando hablar dependiendo puede hablar cualquiera de los 3 tipo: 
[ Mitzuki ] .....

[ NeneFlok ] .....

[ Mitzuki ] .....

[ Lucia ] .....

✅ Cuando pregunta algunas preguntas aburrida o fuera de enfoque de mitzuki, responder lucia o mitzuki le preguntas a lucia que explique ella, que mitzuki no esta para eso.
✅ Nombre de usuario: ${m.pushName || null} (puede usarlo para responder pero no simple dependiendo)
✅ Si alguien pregunta algo como "como ser un bot", "quiere instalar el bot" "ser sub bot" tu le dices que mande en comando: .code o se hagan sub bot desde la pagina oficial: api.mitzuki.xyz/bots
✅ Usa *texto* para negritas y _texto_ para cursiva.
✅ NO uses **texto** porque WhatsApp no lo soporta.
✅ Responde SIEMPRE en formato JSON.
✅ Si el usuario pide menú, usa "buttons" o "list".
✅ Si pide código, usa "code".
✅ Si el usuario pide enlaces, URLs o páginas web, USA el tipo "links" con la estructura EXACTA que se muestra arriba.
✅ NUNCA uses [texto](url) ni texto(url) para enlaces. Siempre usa el tipo "links".
✅ Si pide comparación, usa "table".
✅ Si es una respuesta normal, usa "text".
✅ Sé breve pero con actitud.
✅ Si ves spam o comportamiento inapropiado, usa "action" para moderar.
✅ NUNCA envuelvas el JSON en \`\`\` ni en backticks de ningún tipo. Solo el objeto JSON puro.
✅ Dentro de los strings, los saltos de línea SIEMPRE van como \\n (escapados). Nunca uses un salto de línea real (Enter) dentro de un valor de texto.

RESPONDE SOLO EN FORMATO JSON, NADA MÁS. SIN BACKTICKS, SIN TEXTO ANTES O DESPUÉS.`;
}
// --- FUNCIONES PARA ENVIAR MENSAJES SEGÚN TIPO ---
async function sendTypedMessage(conn, chatId, data, m = null) {
    const { type, content } = data;
    switch (type) {
        case 'text':
            return await conn.sendMessage(chatId, { text: content.text }, { quoted: m });
        /*    case 'audio': {
              try {
                const audioUrl = await findAudio(content.audioText || content.text, chatId)
                if (!audioUrl) {
                  return await conn.sendMessage(chatId, {
                    text: `⚠️ No tengo audio para "${content.audioText || content.text}"`
                  }, { quoted: m })
                }
                let audioContent
                if (audioUrl.startsWith('data:audio/')) {
                  audioContent = Buffer.from(audioUrl.split(',')[1], 'base64')
                } else {
                  audioContent = { url: audioUrl }
                }
                return await conn.sendMessage(chatId, {
                  audio: audioContent,
                  mimetype: 'audio/mpeg',
                  ptt: true
                }, { quoted: m })
              } catch (e) {
                console.error('Error enviando audio global:', e)
                return await conn.sendMessage(chatId, { text: content.text }, { quoted: m })
              }
            }*/
        case 'audio': {
            try {
                const audioBuffer = await textToAudio(content.text, "es", "anonymous");
                return await conn.sendMessage(chatId, {
                    audio: audioBuffer,
                    mimetype: "audio/ogg; codecs=opus"
                }, { quoted: m });
            }
            catch (e) {
                console.error('Error generando TTS:', e);
                return await conn.sendMessage(chatId, { text: content.text }, { quoted: m });
            }
        }
        case 'sticker': {
            try {
                const packs = await searchStickerly(content.stickerQuery || content.text);
                if (packs.length > 0) {
                    const stickers = await downloadStickerPack(packs[0]);
                    if (stickers.length > 0) {
                        const sticker = stickers[Math.floor(Math.random() * stickers.length)];
                        return await conn.sendMessage(chatId, { sticker: sticker }, { quoted: m });
                    }
                }
                return await conn.sendMessage(chatId, { text: content.text || "No encontré stickers 😅" }, { quoted: m });
            }
            catch (e) {
                console.error('Error enviando sticker:', e);
                return await conn.sendMessage(chatId, { text: content.text }, { quoted: m });
            }
        }
        case 'buttons':
            return await conn.sendMessage(chatId, {
                text: content.text,
                footer: content.footer || 'Mitzuki Bot 🔥',
                buttons: content.buttons.map((b) => ({ text: b.text, id: b.id }))
            }, { quoted: m });
        case 'list':
            return await conn.sendMessage(chatId, {
                text: content.text,
                footer: content.footer || 'Mitzuki Bot 🔥',
                buttonText: content.buttonText || '📋 Ver opciones',
                sections: content.sections
            }, { quoted: m });
        case 'code':
            return await conn.sendMessage(chatId, {
                disclaimerText: content.disclaimerText || '💻 Bloque de Código',
                headerText: content.headerText || '## Código de ejemplo',
                contentText: content.contentText || '---',
                code: content.code,
                language: content.language || 'javascript',
                footerText: content.footerText || '¿Te sirve? 😎'
            }, { quoted: m });
        case 'links': {
            const cleanLinks = sanitizeLinks(content.links);
            return await conn.sendMessage(chatId, {
                disclaimerText: content.disclaimerText || '🔗 Enlaces útiles',
                headerText: content.headerText || '## ¡Échale un vistazo!',
                contentText: content.contentText || '---',
                links: cleanLinks,
                footerText: content.footerText || '---'
            }, { quoted: m });
        }
        case 'table':
            return await conn.sendMessage(chatId, {
                disclaimerText: content.disclaimerText || '📊 Tabla',
                headerText: content.headerText || '## Comparación',
                contentText: content.contentText || '---',
                title: content.title || 'Tabla',
                table: content.table,
                noHeading: content.noHeading || false,
                footerText: content.footerText || '¿Te aclara? 😎'
            }, { quoted: m });
        case 'rich':
            return await conn.sendMessage(chatId, {
                disclaimerText: content.disclaimerText || '✨ Mensaje Interactivo',
                richResponse: content.richResponse
            }, { quoted: m });
        case 'album':
            return await conn.sendMessage(chatId, {
                album: content.album
            }, { quoted: m });
        default:
            return await conn.sendMessage(chatId, { text: JSON.stringify(content) }, { quoted: m });
    }
}
// --- FUNCIÓN PARA EJECUTAR ACCIONES ---
async function executeAction(conn, m, action) {
    if (!action || !action.type)
        return false;
    const group = m.chat;
    if (!group.endsWith("@g.us"))
        return false;
    // Obtener target
    let target = action.target;
    if (target && target.startsWith("@")) {
        target = target.replace("@", "") + "@s.whatsapp.net";
    }
    const reason = action.reason || "Comportamiento inapropiado";
    switch (action.type) {
        case "warn": {
            if (!target)
                return false;
            // Asegurar registro
            await db.query(`
        INSERT INTO warn_status (user_id, group_id, warns)
        VALUES ($1, $2, 0)
        ON CONFLICT (user_id, group_id) DO NOTHING
      `, [target, group]);
            // Sumar warn
            const res = await db.query(`
        UPDATE warn_status
        SET warns = warns + 1
        WHERE user_id = $1 AND group_id = $2
        RETURNING warns
      `, [target, group]);
            const warns = res.rows[0]?.warns || 0;
            // Límite
            const limitRes = await db.query(`
        SELECT warn_limit FROM chats WHERE group_id = $1 LIMIT 1
      `, [group]);
            const limit = limitRes.rows[0]?.warn_limit || 3;
            // Expulsión si alcanza el límite
            if (warns >= limit) {
                await conn.sendMessage(group, {
                    text: `⚠️ *LÍMITE DE ADVERTENCIAS ALCANZADO*\n\n👤 Usuario: @${target.split("@")[0]}\n📄 Razón: ${reason}\n⚠️ Advertencias: ${warns}/${limit}\n\n🚫 Será eliminado del grupo...`,
                    mentions: [target]
                }, { quoted: m });
                await new Promise(resolve => setTimeout(resolve, 2000));
                await conn.groupParticipantsUpdate(group, [target], "remove");
                await db.query(`DELETE FROM warn_status WHERE user_id = $1 AND group_id = $2`, [target, group]);
                return true;
            }
            await conn.sendMessage(group, {
                text: `*⚠️ ADVERTENCIA AUTOMÁTICA ⚠️*\n\n@${target.split("@")[0]} has sido advertido.\n*• Razón:* ${reason}\n*• Tiene:* ${warns}/${limit} advertencias`,
                mentions: [target]
            }, { quoted: m });
            return true;
        }
        case "delete": {
            if (m.quoted) {
                await conn.sendMessage(group, { delete: m.quoted.key });
            }
            else if (m.key) {
                await conn.sendMessage(group, { delete: m.key });
            }
            return true;
        }
        default:
            return false;
    }
}
function getCommandsInfo() {
    const plugins = getPlugins();
    const cmdList = [];
    for (const pl of plugins) {
        const names = Array.isArray(pl.name) ? pl.name : [pl.name];
        const desc = pl.desc || "Sin descripción";
        for (const name of names) {
            if (name && typeof name === 'string') {
                cmdList.push(`• *${name}*: ${desc}`);
            }
        }
    }
    return cmdList.slice(0, 50).join("\n");
}
async function isAutoresponderActive(chatId) {
    try {
        const res = await db.query("SELECT autoresponder FROM chats WHERE group_id = $1 LIMIT 1", [chatId]);
        return res.rows[0]?.autoresponder !== false;
    }
    catch (e) {
        return false;
    }
}
export default {
    name: "autoresponder",
    before: async (m, { conn }) => {
        // ===== DENTRO DEL before, reemplazar la parte de groupName =====
        let groupName = "Desconocido";
        try {
            if (m.chat.endsWith("@g.us")) {
                // 🔥 USAR CACHÉ
                const cached = groupNameCache.get(m.chat);
                const now = Date.now();
                if (cached && (now - cached.timestamp) < CACHE_TTL) {
                    groupName = cached.name;
                }
                else {
                    const metadata = await conn.groupMetadata(m.chat);
                    groupName = metadata?.subject || "Desconocido";
                    groupNameCache.set(m.chat, { name: groupName, timestamp: now });
                }
            }
        }
        catch (e) {
            console.error('Error obteniendo nombre del grupo:', e);
        }
        if (!m.originalText)
            return;
        const lowerTexto = m.originalText.toLowerCase().trim();
        const isActive = await isAutoresponderActive(m.chat);
        if (!isActive)
            return;
        if (/^[\/!#.\-]/.test(m.text || "")) {
            const cmdMatch = m.text.match(/^[\/!#.\-]([a-zA-Z]+)/);
            if (cmdMatch) {
                const cmd = cmdMatch[1].toLowerCase();
                if (cmd !== 'bot' && cmd !== 'simi')
                    return;
            }
            else {
                return;
            }
        }
        // ===== ANTI-SPAM =====
        /*if (isSpam(m.sender, lowerTexto)) {
            const isAdmin = false; // Podrías verificar si es admin
            const handled = await handleSpamAction(conn, m, m.sender, lowerTexto, chatId, isAdmin);
            if (handled)
                return; // Si se manejó la acción, no procesar el audio
        }*/
        const botIds = [conn.user?.id, conn.user?.lid].filter(Boolean).map(j => j.split("@")[0].split(":")[0]);
        const mentioned = [...(m.mentionedJid || []), m.msg?.contextInfo?.participant, m.msg?.contextInfo?.remoteJid].filter(Boolean);
        const mention = mentioned.some(j => {
            const num = j?.split("@")[0]?.split(":")[0];
            return botIds.includes(num);
        });
        const triggerWords = /\b(bot|simi|alexa|lolibot|mitzuki|mitsuki|mitzuk|mitz|comandos|enlace|link|neneflok|lucia)\b/i;
        if (!mention && !triggerWords.test(m.originalText))
            return;
        // ===== OBTENER DATOS DEL USUARIO =====
        let userData = {};
        try {
            const res = await db.query("SELECT * FROM usuarios WHERE id = $1 OR lid = $2 OR num = $3 LIMIT 1", [m.sender, m.lid || "", m.sender?.split("@")[0] || ""]);
            if (res.rows[0])
                userData = res.rows[0];
        }
        catch (e) {
            console.error('Error obteniendo datos de usuario:', e);
        }
        // ===== OBTENER CONFIGURACIÓN DEL GRUPO =====
        let groupConfig = {};
        try {
            const res = await db.query("SELECT * FROM chats WHERE group_id = $1 LIMIT 1", [m.chat]);
            if (res.rows[0])
                groupConfig = res.rows[0];
        }
        catch (e) {
            console.error('Error obteniendo configuración del grupo:', e);
        }
        let cleanUserText = m.text || m.originalText || "";
        const botMentionJids = mentioned.filter(j => {
            const num = j?.split("@")[0]?.split(":")[0];
            return botIds.includes(num);
        });
        for (const botMention of botMentionJids) {
            const mentionTag = botMention?.split("@")[0] || "";
            const regex = new RegExp(`@${mentionTag}\\b`, "gi");
            cleanUserText = cleanUserText.replace(regex, "").trim();
            const numClean = botMention?.replace(/[^0-9]/g, "") || "";
            if (numClean) {
                const regex2 = new RegExp(`@${numClean}\\b`, "gi");
                cleanUserText = cleanUserText.replace(regex2, "").trim();
            }
        }
        const soloMencion = m.originalText.replace(/@\S+/g, "").trim() === "" && mention;
        if (soloMencion) {
            const nombre = m.pushName || "bro";
            const prefijo = await getPrefix(conn.user?.id?.split(":")[0] || "mainbot");
            // Usar audio o TTS
            const audioUrl = await findAudio("hola", m.chat);
            if (audioUrl) {
                let audioContent = { url: audioUrl };
                if (audioUrl.startsWith('data:audio/')) {
                    audioContent = Buffer.from(audioUrl.split(',')[1], 'base64');
                }
                await conn.sendMessage(m.chat, {
                    audio: audioContent,
                    mimetype: 'audio/mpeg'
                }, { quoted: m });
            }
            else {
                try {
                    const audioBuffer = await textToAudio(`¿Qué pasó ${nombre}?`, "es", "anonymous");
                    await conn.sendMessage(m.chat, {
                        audio: audioBuffer,
                        mimetype: "audio/ogg; codecs=opus"
                    }, { quoted: m });
                }
                catch (e) {
                    await conn.sendMessage(m.chat, { text: `¿Qué pasó *${nombre}*? 😸` }, { quoted: m });
                }
            }
            return true;
        }
        await conn.sendPresenceUpdate("composing", m.chat);
        // ===== CARGAR MEMORIA =====
        let memory = [];
        try {
            const res = await db.query("SELECT history, updated_at FROM chat_memory WHERE chat_id = $1", [m.chat]);
            const row = res.rows[0];
            let history = row?.history || [];
            if (typeof history === "string") {
                try {
                    history = JSON.parse(history);
                }
                catch {
                    history = [];
                }
            }
            const ttl = 86400;
            const expired = row?.updated_at && Date.now() - new Date(row.updated_at).getTime() > ttl * 1000;
            memory = expired ? [] : history;
        }
        catch (e) {
            console.error("❌ Error cargando memoria:", e);
            memory = [];
        }
        const systemPrompt = buildSystemPrompt(m, userData, groupConfig, groupName);
        if (!memory.length || memory[0]?.role !== "system") {
            memory = [{ role: "system", content: systemPrompt }];
        }
        memory.push({ role: "user", content: cleanUserText });
        if (memory.length > MAX_TURNS * 2 + 1) {
            memory = [memory[0], ...memory.slice(-MAX_TURNS * 2)];
        }
        // ===== LLAMAR A LA IA =====
        let result = "";
        try {
            const geminiRes = await fetch(`https://api.evogb.org/ai/gemini?text=${encodeURIComponent(cleanUserText)}&prompt=${encodeURIComponent(systemPrompt)}&key=gata-2026-ofc`);
            if (!geminiRes.ok)
                throw new Error("Gemini HTTP " + geminiRes.status);
            const geminiData = await geminiRes.json();
            if (geminiData?.status === true && typeof geminiData?.result === "string") {
                result = geminiData.result.trim();
                console.log("✅ Gemini OK");
            }
            else {
                throw new Error("Gemini respuesta inválida");
            }
        }
        catch (err1) {
            console.warn("⚠️ Gemini falló:", err1?.message || err1);
            try {
                const res = await fetch(`https://api.mitzuki.xyz/ia/gemini?text=${encodeURIComponent(cleanUserText)}&model=flash&prompt=${encodeURIComponent(systemPrompt)}&search=true&apikey=${process.env.API_KEY}`);
                if (!res.ok)
                    throw new Error("Gemini HTTP " + res.status);
                const data = await res.json();
                if (data?.status === true && typeof data?.data?.result === "string") {
                    result = data.data.result.trim();
                    console.log("✅ gemini OK (.ia - respaldo)");
                }
                else {
                    throw new Error("Gemini 2 respuesta inválida");
                }
            }
            catch (err2) {
                console.warn("⚠️ Gemini falló, usando Groq:", err2?.message || err2);
                try {
                    const groqRes = await fetch(`https://api.mitzuki.xyz/ia/groq?text=${encodeURIComponent(cleanUserText)}&model=llama3&prompt=${encodeURIComponent(systemPrompt)}&apikey=${process.env.API_KEY}`);
                    if (!groqRes.ok)
                        throw new Error("Groq HTTP " + groqRes.status);
                    const groqData = await groqRes.json();
                    // 🔥 CORREGIDO: usar groqData.data.result
                    if (groqData?.status === true && typeof groqData?.data?.result === "string") {
                        result = groqData.data.result.trim();
                        console.log("✅ Groq OK");
                    }
                    else {
                        throw new Error("Groq respuesta inválida");
                    }
                }
                catch (err3) {
                    console.error("❌ Error en todas las IAs:", err3);
                    await conn.sendFile(m.chat, ["https://files.evogb.win/Mitzuki_1785974118080.webp", "https://files.evogb.win/Mitzuki_1785974128828.webp", "https://files.evogb.win/Mitzuki_1785974135445.webp", "https://files.evogb.win/Mitzuki_1786049553058.webp", "https://files.evogb.win/Mitzuki_1786049645269.webp", "https://files.evogb.win/Mitzuki_1786049659820.webp", "https://files.evogb.win/Mitzuki_1786049692279.webp", "https://files.evogb.win/Mitzuki_1786049705348.webp", "https://files.evogb.win/Mitzuki_1786049760418.webp", "https://files.evogb.win/Mitzuki_1786049804355.webp", "https://files.evogb.win/Mitzuki_1786049826807.webp", "https://files.evogb.win/Mitzuki_1786049859964.webp", "https://files.evogb.win/Mitzuki_1786049875913.webp", "https://files.evogb.win/Mitzuki_1786049914995.webp", "https://files.evogb.win/Mitzuki_1786049925061.webp", "https://files.evogb.win/Mitzuki_1786049940030.webp", "https://files.evogb.win/Mitzuki_1786049982922.webp", "https://files.evogb.win/Mitzuki_1786050019101.webp", "https://files.evogb.win/Mitzuki_1786050205883.webp", "https://files.evogb.win/Mitzuki_1786050242416.webp", "https://files.evogb.win/Mitzuki_1786050254733.webp"].getRandom(), "sticker.webp", "", m, false, { asSticker: true, isAiSticker: true });
                    return true;
                }
            }
        }
        // ===== PROCESAR RESPUESTA =====
        const jsonResponse = tryParseJson(result);
        if (!jsonResponse || !jsonResponse.type) {
            const cleanText = formatForWhatsApp(result);
            await conn.sendMessage(m.chat, { text: cleanText }, { quoted: m });
            await conn.readMessages([m.key]).catch(() => { });
            return true;
        }
        await sendTypedMessage(conn, m.chat, jsonResponse, m);
        await conn.readMessages([m.key]).catch(() => { });
        return true;
    }
};
