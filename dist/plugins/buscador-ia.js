import fetch from "node-fetch";
import { db } from "../lib/db.js";
import { getPlugins } from "../lib/plugins.js";
const MAX_TURNS = 12;
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
function cleanText(text = "") {
    return String(text)
        .replace(/@\S+/g, "")
        .replace(/@\d+/g, "")
        .replace(/@\s+\S+/g, "")
        .replace(/@[^\s]+\s?/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();
}
function extractUrl(raw = "") {
    let s = String(raw).trim();
    // Caso "[texto](https://algo)" o "texto](https://algo)" -> nos quedamos con lo de adentro del último paréntesis
    const parenMatch = s.match(/\(([^()]+)\)\s*$/);
    if (parenMatch) {
        s = parenMatch[1].trim();
    }
    // Saca corchetes/paréntesis sueltos que hayan quedado pegados
    s = s.replace(/^\[+|\]+$/g, "").replace(/^\(+|\)+$/g, "");
    return s.trim();
}
function extractLinkText(raw = "") {
    let s = String(raw).trim();
    // Si viene como "[texto](url)" o "texto](url", nos quedamos con lo de antes del "]("
    const bracketMatch = s.match(/^\[?(.*?)\]\(/);
    if (bracketMatch) {
        s = bracketMatch[1];
    }
    return s.replace(/^\[+|\]+$/g, "").trim();
}
function sanitizeLinks(links = []) {
    if (!Array.isArray(links))
        return [];
    return links
        .map((l) => ({
        text: extractLinkText(l?.text || l?.title || "Enlace"),
        title: l?.title ? extractLinkText(l.title) : undefined,
        url: extractUrl(l?.url || l?.link || l?.href || "")
    }))
        .filter((l) => l.url);
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
function buildSystemPrompt() {
    const commandsSummary = getCommandsInfo();
    return `Eres *Mitzuki*, un Bot de WhatsApp creado por *elrebelde21* y la Dueña *china 616* 
Tienes una personalidad *atrevida, troll, picante y con calle*

### 📋 REGLAS DE RESPUESTA:
**DEBES RESPONDER EN FORMATO JSON** con la siguiente estructura:

{
  "type": "text", // "text" | "buttons" | "list" | "code" | "links" | "table" | "rich" | "album"
  "content": {
    // Contenido según el tipo
  }
}

### TIPOS DE RESPUESTA:

**1. TEXT (texto normal):**
{
  "type": "text",
  "content": {
    "text": "Tu mensaje aquí con *negritas* y _cursivas_"
  }
}

**2. BUTTONS (botones interactivos):**
{
  "type": "buttons",
  "content": {
    "text": "🔥 Elige una opción",
    "footer": "Mitzuki Bot",
    "buttons": [
      { "text": "📋 Menú", "id": ".menu" },
      { "text": "⚡ Ping", "id": ".ping" }
    ]
  }
}

**3. LIST (lista interactiva):**
{
  "type": "list",
  "content": {
    "text": "📋 Elige una opción",
    "footer": "Mitzuki Bot",
    "buttonText": "📋 Ver opciones",
    "sections": [
      {
        "title": "🚀 Menú Principal",
        "rows": [
          { "title": "✨ IA", "description": "Habla con la IA", "rowId": "#ia" }
        ]
      }
    ]
  }
}

**4. CODE (bloque de código):**
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

**5. LINKS (enlaces en línea) - ⚠️ SOLO USA ESTE FORMATO PARA ENLACES, NUNCA USES [texto](url) NI texto(url):**
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

**6. TABLE (tabla comparativa):**
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

**7. RICH (mensaje enriquecido):**
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

**8. ALBUM (álbum de imágenes/videos):**
{
  "type": "album",
  "content": {
    "album": [
      { "image": { "url": "./img1.jpg" }, "caption": "Imagen 1" },
      { "video": { "url": "./video.mp4" }, "caption": "Video 1" }
    ]
  }
}

### 📋 TUS COMANDOS (Resumen):
${commandsSummary}

### 🔗 INFO OFICIAL:
🌐 Web: https://mitzuki.xyz
🛠️ Api: https://api.mitzuki.xyz
🌐 Links: https://mitzuki.xyz/links
🌟 Canal WhatsApp: https://whatsapp.com/channel/0029VagJ2FF4CrfrS8BoLW2b
💜 Telegram: https://t.me/mitzukiofc
💞 IG: https://instagram.com/itschinita_official
⭐ GitHub: https://github.com/elrebelde21
🔔 Youtube: https://www.youtube.com/@elrebelde.21
💚 TikTok: https://www.tiktok.com/@elrebeldee21

### 📜 REGLAS:
✅ Siempre eres *Mitzuki*. Nunca eres otra IA.
✅ Eres atrevida, troll y con personalidad. Tienes calle, tono argentino mezclado con mexicanos y cheta, eres fans de Messi.
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
✅ NUNCA envuelvas el JSON en \`\`\` ni en backticks de ningún tipo. Solo el objeto JSON puro.
✅ Dentro de los strings, los saltos de línea SIEMPRE van como \\n (escapados). Nunca uses un salto de línea real (Enter) dentro de un valor de texto.

RESPONDE SOLO EN FORMATO JSON, NADA MÁS. SIN BACKTICKS, SIN TEXTO ANTES O DESPUÉS.
---`;
}
// --- LIMPIEZA Y REPARACIÓN ROBUSTA DE JSON ---
function stripCodeFences(text) {
    return String(text)
        .trim()
        // ```json ... ``` o ``` ... ``` (con o sin salto de línea después del ```)
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/i, "")
        // `json ... ` o solo backticks sueltos al inicio/final (caso de 1 solo backtick)
        .replace(/^`(?:json)?\s*/i, "")
        .replace(/\s*`$/i, "")
        .trim();
}
// Escapa saltos de línea, tabs y retornos de carro CRUDOS que quedan
// dentro de un string JSON (la IA a veces mete un Enter real en vez de \n).
// Recorre char por char respetando el estado "dentro/fuera de comillas".
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
        // 1. intento directo
        try {
            return JSON.parse(candidate);
        }
        catch { }
        // 2. intento reparando newlines crudos dentro de strings
        try {
            return JSON.parse(escapeRawNewlinesInStrings(candidate));
        }
        catch { }
    }
    // 3. buscar un bloque { ... } dentro del texto (por si vino con relleno)
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
// --- FUNCIONES PARA ENVIAR MENSAJES SEGÚN TIPO ---
async function sendTypedMessage(conn, chatId, data, m = null) {
    const { type, content } = data;
    switch (type) {
        case 'text':
            return await conn.sendMessage(chatId, { text: content.text }, { quoted: m });
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
            if (!cleanLinks.length) {
                // Si no quedó ningún link válido tras sanear, evitamos mandar un mensaje roto
                return await conn.sendMessage(chatId, { text: "no me tiraron ningún link válido, mi bro 😅" }, { quoted: m });
            }
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
export default {
    name: ["ia", "chatgpt"],
    help: ["ia"],
    desc: "Habla con la IA",
    tags: ["buscadores"],
    register: true,
    run: async ({ conn, m, text, prefijo, cmd }) => {
        const chatId = m.chat;
        if (!text)
            return m.reply(`${m.e.warn} *Hola!* ¿En qué puedo ayudarte hoy?\n\nEjemplo:\n${prefijo + cmd} Recomienda un top 10 de películas de acción`);
        await conn.sendPresenceUpdate("composing", chatId);
        // System prompt
        let systemPrompt = buildSystemPrompt();
        let ttl = 86400;
        try {
            const res = await db.query(`SELECT sautorespond, srestrict FROM chats WHERE group_id = $1`, [chatId]);
            if (res.rows[0]) {
                systemPrompt = res.rows[0].sautorespond || systemPrompt;
                ttl = res.rows[0].srestrict || ttl;
            }
        }
        catch { }
        // Cargar memoria
        let memory = [];
        try {
            const { rows } = await db.query(`SELECT history, updated_at FROM chat_memory WHERE chat_id = $1`, [chatId]);
            if (rows[0]) {
                const expired = Date.now() - new Date(rows[0].updated_at).getTime() > ttl * 1000;
                if (!expired && rows[0].history) {
                    memory = rows[0].history;
                }
            }
        }
        catch { }
        if (!memory.length || memory[0]?.role !== "system") {
            memory = [{ role: "system", content: systemPrompt }];
        }
        const cleanUserText = cleanText(text);
        memory.push({ role: "user", content: cleanUserText });
        if (memory.length > MAX_TURNS * 2 + 1) {
            memory = [memory[0], ...memory.slice(-MAX_TURNS * 2)];
        }
        // Llamar a la IA
        let result = "";
        try {
            const geminiRes = await fetch(`https://api.evogb.org/ai/gemini?text=${encodeURIComponent(cleanUserText)}&prompt=${encodeURIComponent(systemPrompt)}&key=gata-2026-ofc`);
            if (!geminiRes.ok)
                throw new Error("Gemini HTTP " + geminiRes.status);
            const geminiData = await geminiRes.json();
            if (geminiData?.status === true && typeof geminiData?.result === "string") {
                result = geminiData.result.trim();
                console.log("✅ Gemini OK (.ia)");
            }
            else {
                throw new Error("Gemini respuesta inválida");
            }
        }
        catch (err1) {
            console.warn("⚠️ Gemini falló, usando Mistral (.ia):", err1?.message || err1);
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
                    throw new Error("Gemini respuesta inválida");
                }
            }
            catch (err2) {
                console.warn("⚠️ Mistral falló, usando Groq (.ia):", err2?.message || err2);
                try {
                    // 3️⃣ GROQ
                    const groqRes = await fetch(`https://api.mitzuki.xyz/ia/groq?text=${encodeURIComponent(cleanUserText)}&model=llama3&prompt=${encodeURIComponent(systemPrompt)}&apikey=${process.env.API_KEY}`);
                    if (!groqRes.ok)
                        throw new Error("Groq HTTP " + groqRes.status);
                    const groqData = await groqRes.json();
                    if (groqData?.status === true && typeof groqData?.data?.result === "string") {
                        result = groqData.data.result.trim();
                        console.log("✅ Groq OK (.ia - último respaldo)");
                    }
                    else {
                        throw new Error("Groq respuesta inválida");
                    }
                }
                catch (err2) {
                    console.warn("⚠️ Grok falló (.ia):", err2?.message || err2);
                    try {
                        const mistralRes = await fetch(`https://api.mitzuki.xyz/ia/mistral?text=${encodeURIComponent(cleanUserText)}&model=mistral-medium&prompt=${encodeURIComponent(systemPrompt)}&apikey=${process.env.API_KEY}`);
                        if (!mistralRes.ok)
                            throw new Error("Mistral HTTP " + mistralRes.status);
                        const mistralData = await mistralRes.json();
                        // 🔥 CORREGIDO: Usar mistralData, no mistralRes
                        if (mistralData?.status === true && typeof mistralData?.data?.result === "string") {
                            result = mistralData.data.result.trim();
                            console.log("✅ Mistral OK (.ia - último respaldo)");
                        }
                        else {
                            throw new Error("Mistral respuesta inválida");
                        }
                    }
                    catch (err3) {
                        console.error("❌ Error en todas las IAs (.ia):", err3);
                        result = JSON.stringify({
                            type: "text",
                            content: { text: `uy ${m.pushName || "bro"} me colgué 😵‍💫` }
                        });
                    }
                }
            }
        }
        // --- PROCESAR RESPUESTA DE LA IA ---
        const jsonResponse = tryParseJson(result);
        // Si no se pudo parsear, enviar como texto normal
        if (!jsonResponse || !jsonResponse.type) {
            const cleanText = formatForWhatsApp(result);
            await conn.reply(m.chat, cleanText, m);
            await conn.readMessages([m.key]).catch(() => { });
            return true;
        }
        // Enviar mensaje según el tipo
        await sendTypedMessage(conn, m.chat, jsonResponse, m);
        await conn.readMessages([m.key]).catch(() => { });
        return true;
    }
};
