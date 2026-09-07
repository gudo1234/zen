import fetch from 'node-fetch';
const juegos = {};
const timeout = 60000;
const poin = 500;
async function getRandomPopularSong() {
    try {
        // Varios charts para más variedad
        const charts = [
            "https://api.deezer.com/chart/122/tracks?limit=40", // Reggaeton
            "https://api.deezer.com/chart/71/tracks?limit=40", // Cumbia
            "https://api.deezer.com/chart/152/tracks?limit=40", // Rock
            "https://api.deezer.com/chart/132/tracks?limit=40", // Pop
            "https://api.deezer.com/chart/116/tracks?limit=40", // Rap / Hip-Hop / Trap
            "https://api.deezer.com/chart/144/tracks?limit=40", // Reggae
            "https://api.deezer.com/chart/0/tracks?limit=40", // Global
            "https://api.deezer.com/chart/75/tracks?limit=40" // Brazilian Music
        ];
        const randomChart = charts[Math.floor(Math.random() * charts.length)];
        const res = await fetch(randomChart);
        const data = await res.json();
        if (!data.data?.length)
            return null;
        // Mezclamos bien
        const tracks = data.data.sort(() => Math.random() - 0.5);
        for (const track of tracks) {
            if (track.preview) {
                return {
                    nombre: track.title,
                    artista: track.artist.name,
                    preview: track.preview
                };
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
function generarPista(nombre) {
    const palabras = nombre.split(" ");
    return palabras.map(palabra => {
        if (palabra.length <= 3)
            return palabra; // palabras cortas se muestran completas
        // Cuanto más larga la palabra, más letras muestra
        let visible;
        if (palabra.length <= 5)
            visible = 2;
        else if (palabra.length <= 8)
            visible = 3;
        else
            visible = Math.ceil(palabra.length / 3); // ~1/3 de la palabra
        let pista = "";
        for (let i = 0; i < palabra.length; i++) {
            if (i < visible) {
                pista += palabra[i];
            }
            else {
                pista += "_";
            }
        }
        return pista;
    }).join(" ");
}
async function generarPistaIA(cancion) {
    console.log(`🎵 Generando pista para: ${cancion.nombre} - ${cancion.artista}`);
    const prompt = `Generá una pista corta y útil para adivinar la canción "${cancion.nombre}" de ${cancion.artista}.

Reglas:
- No digas el nombre de la canción ni del artista
- Que sea algo característico (letra, videoclip, género, año, colaboración, etc)
- Máximo 15 palabras
- Que ayude pero no regale la respuesta

Solo respondé con la pista, nada más.`;
    // Gemini
    try {
        const url = `https://api.mitzuki.xyz/ia/gemini?text=${encodeURIComponent(prompt)}&model=flash&prompt=${encodeURIComponent("Eres una asistente útil que solo responde con pistas para adivinar canciones.")}&search=true&apikey=${process.env.API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
            const data = await res.json();
            if (data?.status === true && data?.data?.result) {
                return data.data.result.trim();
            }
        }
    }
    catch (e) { }
    // Respaldo 1
    try {
        const res = await fetch(`https://api.evogb.org/ai/gemini?text=${encodeURIComponent(prompt)}&prompt=${encodeURIComponent("Eres una asistente útil que solo responde con pistas para adivinar canciones.")}&key=gata-2026-ofc`);
        if (res.ok) {
            const data = await res.json();
            if (data?.status === true && data?.result) {
                return data.result.trim();
            }
        }
    }
    catch (e) { }
    // Respaldo 2
    try {
        const res = await fetch(`https://api.evogb.org/ai/gptprompt?text=${encodeURIComponent(prompt)}&prompt=${encodeURIComponent("Eres una asistente útil que solo responde con pistas para adivinar canciones.")}&key=gata-2026-ofc`);
        if (res.ok) {
            const data = await res.json();
            if (data?.status === true && data?.result) {
                return data.result.trim();
            }
        }
    }
    catch (e) { }
    return generarPista(cancion.nombre);
}
function normalizar(texto) {
    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s]/g, "")
        .trim();
}
const before = async (m) => {
    const texto = (m.originalText || m.text || "").trim();
    if (!texto)
        return;
    const id = m.chat;
    if (!juegos[id])
        return;
    // === PISTA ===
    if (texto.toLowerCase() === ".pintas" || texto.toLowerCase() === "pintas") {
        const juego = juegos[id];
        if (juego.pistaUsada) {
            return m.reply(null, "⚠️ Ya usaste la pista en este juego.");
        }
        juego.pistaUsada = true;
        const pista = await generarPistaIA(juego.cancion);
        await m.reply(null, `💡 *Pista:* ${pista}`);
        return true;
    }
    if (!m.quoted?.key?.id)
        return;
    if (m.quoted.key.id !== juegos[id].caption?.key?.id && m.quoted.key.id !== juegos[id].audio?.key?.id)
        return;
    if (texto.startsWith("/") || texto.startsWith(".") || texto.startsWith("!"))
        return;
    const juego = juegos[id];
    const userInput = normalizar(texto);
    const tituloCorrecto = normalizar(juego.cancion.nombre);
    const artistaCorrecto = normalizar(juego.cancion.artista);
    const adivinoTitulo = userInput === tituloCorrecto ||
        tituloCorrecto.includes(userInput) ||
        userInput.includes(tituloCorrecto);
    const adivinoArtista = userInput === artistaCorrecto ||
        artistaCorrecto.includes(userInput) ||
        userInput.includes(artistaCorrecto);
    // === ADIVINÓ LOS DOS AL MISMO TIEMPO ===
    if (adivinoTitulo && adivinoArtista) {
        const puntos = 750;
        await m.db.query("UPDATE usuarios SET exp = exp + $1 WHERE id = $2", [puntos, m.sender]);
        await m.reply(`✅ *¡Correcto!*`, `🎵 *${juego.cancion.nombre}* - ${juego.cancion.artista}\n\n🏆 +${puntos} XP`);
        m.react("✅");
        clearTimeout(juego.timeout);
        delete juegos[id];
        return true;
    }
    // === ADIVINÓ EL ARTISTA ===
    if (!juego.artistaAdivinado && adivinoArtista) {
        juego.artistaAdivinado = true;
        const puntos = 250;
        await m.db.query("UPDATE usuarios SET exp = exp + $1 WHERE id = $2", [puntos, m.sender]);
        if (juego.tituloAdivinado) {
            // Ya tenía el título → termina
            await m.reply(`✅ *¡Correcto! Adivinaste el artista*`, `🎤 *${juego.cancion.artista}*\n\n🏆 +${puntos} XP\n\n🎉 ¡Ganaste el título + el artista!`);
            m.react("✅");
            clearTimeout(juego.timeout);
            delete juegos[id];
        }
        else {
            await m.reply(`✅ *¡Correcto! Adivinaste el artista*`, `🎤 *${juego.cancion.artista}*\n\n🏆 +${puntos} XP\n\nTodavía podés adivinar el *título* por +500 XP más`);
            m.react("✅");
        }
        return true;
    }
    // === ADIVINÓ EL TÍTULO ===
    if (!juego.tituloAdivinado && adivinoTitulo) {
        juego.tituloAdivinado = true;
        const puntos = 500;
        await m.db.query("UPDATE usuarios SET exp = exp + $1 WHERE id = $2", [puntos, m.sender]);
        if (juego.artistaAdivinado) {
            // Ya tenía el artista → termina
            await m.reply(`✅ *¡Correcto! Adivinaste el título*`, `🎵 *${juego.cancion.nombre}*\n\n🏆 +${puntos} XP\n\n🎉 ¡Ganaste el artista + el título!`);
            m.react("✅");
            clearTimeout(juego.timeout);
            delete juegos[id];
        }
        else {
            await m.reply(`✅ *¡Correcto! Adivinaste el título*`, `🎵 *${juego.cancion.nombre}*\n\n🏆 +${puntos} XP\n\nTodavía podés adivinar el *artista* por +250 XP más`);
            m.react("✅");
        }
        return true;
    }
    // === INCORRECTO ===
    juego.intentos--;
    if (juego.intentos <= 0) {
        await m.reply(`❌ Se acabaron los intentos.`, `🎵 *${juego.cancion.nombre}* - ${juego.cancion.artista}`);
        m.react("❌");
        clearTimeout(juego.timeout);
        delete juegos[id];
    }
    else {
        await m.reply(`❌ Incorrecto.`, `Te quedan *${juego.intentos}* intento(s).`);
        m.react("❌");
    }
    return true;
};
export default {
    name: ["cancion", "songguess", "adivinacancion"],
    help: ["cancion"],
    desc: "Adivina la canción",
    tags: ["game"],
    register: true,
    before,
    run: async ({ conn, m }) => {
        const id = m.chat;
        if (juegos[id])
            return m.reply(null, "⚠️ Ya hay un juego activo.");
        const cancion = await getRandomPopularSong();
        if (!cancion) {
            return m.reply(null, "❌ No pude conseguir una canción ahora. Intentá de nuevo.");
        }
        try {
            const audioRes = await fetch(cancion.preview);
            if (!audioRes.ok)
                throw new Error("No se pudo descargar el audio");
            const audioBuffer = Buffer.from(await audioRes.arrayBuffer());
            let audio2 = await conn.sendMessage(id, {
                audio: audioBuffer,
                mimetype: "audio/mpeg"
            }, { quoted: m });
            const enviado = await m.reply(`*🎵 ADIVINA LA CANCIÓN*

🔊 Escucha el audio y adivina

⏱️ Tiempo: 60s
🎯 Intentos: 3
🏆 Premio: +${poin} XP

Responde a este mensaje con la respuesta

> Usar: .pintas para obtener una ayuda`);
            m.react("🎵");
            juegos[id] = {
                cancion,
                caption: enviado,
                audio: audio2,
                puntos: poin,
                intentos: 3,
                artistaAdivinado: false,
                tituloAdivinado: false,
                pistaUsada: false,
                timeout: setTimeout(() => {
                    if (juegos[id]) {
                        m.reply(`⏳ Tiempo agotado.`, `🎵 *${cancion.nombre}* - ${cancion.artista}`);
                        /*  conn.sendMessage(id, {
                            text: `⏳ Tiempo agotado.\n🎵 *${cancion.nombre}* - ${cancion.artista}`
                          }, { quoted: m });*/
                        delete juegos[id];
                    }
                }, timeout)
            };
        }
        catch (e) {
            console.error(e);
            return m.reply("❌ Error al enviar el audio. Intentá de nuevo.");
        }
    }
};
