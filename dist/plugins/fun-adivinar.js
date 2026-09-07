import fs from 'fs';
import fetch from 'node-fetch';
import similarity from 'similarity';
const timeout = 50000;
const timeout2 = 20000;
const poin = 500;
const threshold = 0.72;
const juegos = {};
const preguntasUsadas = new Set();
const archivosRespaldo = {
    acertijo: "acertijo.json",
    pelicula: "peliculas.json",
    trivia: "trivia.json"
};
// ========== IA URLS (ACTUALIZADAS) ==========
const IA_URLS = [
    {
        name: 'Gemini',
        url: (text, prompt) => `https://api.mitzuki.xyz/ia/gemini?text=${encodeURIComponent(text)}&model=flash&prompt=${encodeURIComponent(prompt)}&search=true&apikey=${process.env.API_KEY}`,
        parse: (data) => data?.data?.result || data?.result || ''
    },
    {
        name: 'Gemini (Evogb)',
        url: (text, prompt) => `https://api.evogb.org/ai/gemini?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}&key=gata-2026-ofc`,
        parse: (data) => data?.result || ''
    },
    {
        name: 'GPT (Evogb)',
        url: (text, prompt) => `https://api.evogb.org/ai/gptprompt?text=${encodeURIComponent(text)}&prompt=${encodeURIComponent(prompt)}&key=gata-2026-ofc`,
        parse: (data) => data?.result || ''
    }
];
// ========== OBTENER PREGUNTA POR IA ==========
async function obtenerPreguntaIA(tipo) {
    const prompt = {
        acertijo: "Genera un acertijo con su respuesta en formato JSON válido: {\"question\": \"<pregunta>\", \"response\": \"<respuesta>\"}. Solo devuelve el JSON sin explicaciones.",
        pelicula: "Genera un juego de adivinar película con emojis como pista, formato JSON válido: {\"question\": \"<pista con emojis>\", \"response\": \"<nombre de la película>\"}. Solo devuelve el JSON sin explicaciones.",
        trivia: "Genera una trivia de cultura general con 4 opciones, formato JSON válido: {\"question\": \"<pregunta>\\n\\nA) ...\\nB) ...\\nC) ...\\nD) ...\", \"response\": \"<letra correcta>\"}. Solo devuelve el JSON sin explicaciones."
    }[tipo];
    // Intentar con cada IA
    for (const ia of IA_URLS) {
        try {
            const url = ia.url("", prompt);
            const res = await fetch(url);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const text = ia.parse(data);
            if (!text)
                continue;
            // Extraer JSON del texto
            const match = text.match(/```json\s*([\s\S]*?)\s*```/);
            const clean = match ? match[1] : text;
            const obj = JSON.parse(clean);
            if (obj.question && obj.response && !preguntasUsadas.has(obj.question)) {
                preguntasUsadas.add(obj.question);
                return obj;
            }
        }
        catch (e) {
            console.error(`[IA ${ia.name}] Error:`, e.message);
            continue;
        }
    }
    return null;
}
// ========== OBTENER PREGUNTA DE JSON LOCAL ==========
function obtenerPreguntaLocal(tipo) {
    try {
        const archivo = `./src/game/${archivosRespaldo[tipo]}`;
        if (!fs.existsSync(archivo)) {
            console.log(`⚠️ Archivo ${archivo} no encontrado`);
            return null;
        }
        const data = JSON.parse(fs.readFileSync(archivo, 'utf8'));
        const disponibles = data.filter((p) => !preguntasUsadas.has(p.question));
        if (disponibles.length === 0) {
            preguntasUsadas.clear();
            return data[Math.floor(Math.random() * data.length)];
        }
        const pregunta = disponibles[Math.floor(Math.random() * disponibles.length)];
        preguntasUsadas.add(pregunta.question);
        return pregunta;
    }
    catch (e) {
        console.error('Error leyendo archivo local:', e);
        return null;
    }
}
// ========== OBTENER PREGUNTA ==========
async function obtenerPregunta(tipo) {
    // Primero intentar con IA
    let pregunta = await obtenerPreguntaIA(tipo);
    // Si falla IA, usar local
    if (!pregunta) {
        pregunta = obtenerPreguntaLocal(tipo);
    }
    return pregunta;
}
// ========== BEFORE - DETECTA RESPUESTAS ==========
const before = async (m, { conn }) => {
    const id = m.chat;
    if (!juegos[id])
        return;
    if (!m.quoted?.key?.id)
        return;
    if (m.quoted.key.id !== juegos[id].caption?.key?.id)
        return;
    const juego = juegos[id];
    const correcta = juego.pregunta.response.toLowerCase().trim();
    const userInput = (m.originalText || m.text || "").trim().toLowerCase();
    // Verificar similitud
    const esCorrecta = userInput === correcta || similarity(userInput, correcta) >= threshold;
    if (esCorrecta) {
        await m.db.query('UPDATE usuarios SET exp = exp + $1 WHERE id = $2', [juego.puntos, m.sender]);
        await m.reply(`✅ *¡Correcto!*`, `Ganaste +${juego.puntos} XP 🎉`);
        m.react("✅");
        clearTimeout(juego.timeout);
        delete juegos[id];
        return true;
    }
    else {
        juego.intentos--;
        if (juego.intentos <= 0) {
            await m.reply(`❌ Fallaste 3 veces.`, `*Respuesta:* ${juego.pregunta.response}`);
            m.react("❌");
            clearTimeout(juego.timeout);
            delete juegos[id];
            return true;
        }
        else {
            await m.reply(`❌ Incorrecto.`, `Te quedan *${juego.intentos}* intento(s).`);
            m.react("❌");
            return true;
        }
    }
};
export default {
    name: ["acertijo", "acert", "adivinanza", "pelicula", "adv", "trivia"],
    help: ["acertijo", "pelicula", "trivia"],
    desc: "Adivinanzas, películas y trivia",
    tags: ["game"],
    register: true,
    before: before,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const userId = m.sender;
        const chatId = m.chat;
        const lid = m.lid || "";
        const id = chatId;
        // Verificar registrado
        const check = await m.db.query(`SELECT exp FROM usuarios WHERE id = $1 OR lid = $2 LIMIT 1`, [userId, lid]);
        // Verificar si hay juego activo
        if (juegos[id]) {
            return m.reply(null, '⚠️ Ya hay un juego activo en este chat.');
        }
        // Determinar tipo
        let tipo = null;
        if (/acert|acertijo|adivinanza/.test(cmd))
            tipo = 'acertijo';
        else if (/pelicula|adv/.test(cmd))
            tipo = 'pelicula';
        else if (/trivia/.test(cmd))
            tipo = 'trivia';
        if (!tipo)
            return;
        const pregunta = await obtenerPregunta(tipo);
        if (!pregunta) {
            return m.reply(null, '❌ No se pudo generar la pregunta. Intenta de nuevo.');
        }
        const tiempo = tipo === 'trivia' ? timeout2 : timeout;
        const texto = `${pregunta.question}

*• Tiempo:* ${tiempo / 1000}s
*• Bono:* +${poin} XP

> 💡 Responde a este mensaje`;
        const enviado = await conn.sendMessage(chatId, { text: texto }, { quoted: m });
        juegos[id] = {
            tipo,
            pregunta,
            caption: enviado,
            puntos: poin,
            intentos: 3,
            timeout: setTimeout(() => {
                if (juegos[id]) {
                    conn.sendMessage(chatId, {
                        text: `⏳ Se acabó el tiempo.\n*Respuesta:* ${pregunta.response}`
                    }, { quoted: m });
                    delete juegos[id];
                }
            }, tiempo)
        };
    }
};
