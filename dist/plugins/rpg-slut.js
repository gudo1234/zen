const COOLDOWN = 10 * 60 * 1000; // 10 minutos
const frasesExito = [
    "💅 Te vendiste por un combo del McDonald's",
    "👄 Le diste una buena mamada a un admin del grupo",
    "💃 Le hiciste un baile sensual al admin y te pagó",
    "📱 Tu OnlyFans explotó por 10 minutos",
    "🐾 Tu cliente era un furry y te pagó el doble",
    "👗 Te disfrazaste de maid y funcionó",
    "👴 El viejo verde del grupo te dio propina",
    "🤗 Ofreciste abrazos por monedas, pero te malinterpretaron",
    "🎮 Trabajaste en una esquina pixelada de San Andreas",
    "🤫 Te pagaron por quedarte calladito... y lo hiciste muy bien",
    "🌹 Fuiste a la zona roja del grupo y volviste con billete",
    "🔥 Tu cosplay de Nezuko encendió el ambiente",
    "🎭 Hiciste roleplay con el bot y te pagaron por no romper personaje",
    "😈 Te disfrazaste de emoji y alguien pagó por usarte",
    "💰 Un sugar daddy te ofreció XP a cambio de cariñitos virtuales",
    "🎲 Participaste en un 'verdad o reto' y te pasaste de atrevid@",
    "🖼️ Tu avatar provocó donaciones en un grupo de solteros",
    "📱 Te alquilaste como fondo de pantalla personalizado",
    "💋 Vendiste besos digitales y fue un éxito",
    "🌸 Tu waifu interior salió a facturar",
    "📸 Tu foto de perfil enamoró a un moderador",
    "😏 Aceptaste una cita con alguien que solo habla en stickers",
    "🤖 Te disfrazaste de bot NSFW y nadie notó la diferencia",
    "🎵 Hiciste un dúo de TikTok caliente y lo monetizaste",
    "🎮 Un VTuber te contrató como su asistente picante",
    "📦 Tu pack de stickers se volvió viral y pediste comisión",
    "🎙️ Te pagaron por enviar audios diciendo 'papi'",
    "📱 Te disfrazaste de Siri y alguien te pidió comandos indecentes",
    "📚 Te ofreciste para dar tutoriales privados en el grupo",
    "🏰 Fuiste la estrella de una noche en la taberna del RPG",
    "👣 Le vendiste 'fotos de pies' en formato ASCII",
    "🎭 Cobraste por dejar que te usaran de NPC caliente",
    "⛏️ Participaste en un evento hot en un servidor de Minecraft",
    "👊 Le hiciste un peter al admin del grupo",
    "🎤 Te grabaste susurrando comandos y alguien lo compró",
    "📱 Creaste un OnlyBots y fuiste trending",
    "👮 Te hiciste pasar por moderador sexy y cobraste multas",
    "📖 Tu nombre salió en un fanfic y alguien te recompensó",
    "👋 Organizaste un evento de 'nalgadas virtuales' con entrada paga",
    "💃 Le bailaste a un bot de economía y te soltó todo su saldo",
    "🔥 Hiciste un striptease virtual y te llovieron propinas",
    "💬 Vendiste packs de stickers hot en el grupo",
    "🌙 Fuiste el/la acompañante de un admin en una cita virtual",
    "😈 Tu voz hot en un audio generó donaciones masivas",
];
const frasesFracaso = [
    "😤 *¡Te rechazaron!* Solo ganaste",
    "💀 *¡El admin te baneó temporalmente!* Ganaste",
    "😅 *¡No fue tu noche!* Solo ganaste",
    "🤡 *¡Te confundieron con un bot!* Ganaste",
    "😢 *¡Te reportaron por spam hot!* Ganaste",
    "🥴 *¡Te dormiste en el trabajo!* Ganaste",
];
const frasesBonus = [
    "🎰 *¡SESIÓN DE LUJO!*",
    "👑 *¡ESTRELLA DEL GRUPO!*",
    "⭐ *¡RENDIMIENTO ESTELAR!*",
    "💎 *¡CLIENTE VIP!*",
    "🔥 *¡FIESTA SALVAJE!*",
];
export default {
    name: ["slut"],
    help: ["slut"],
    desc: "Acción RPG para ganar XP",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m }) => {
        try {
            const now = Date.now();
            const { rows: [user] } = await m.db.query("SELECT exp, lastslut FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            const last = Number(user.lastslut) || 0;
            const cd = last + COOLDOWN - now;
            if (cd > 0) {
                const min = Math.floor(cd / 60000);
                const seg = Math.floor((cd % 60000) / 1000);
                const tiempo = min > 0 ? `${min}m ${seg}s` : `${seg}s`;
                return m.reply(null, `💦 *Descansá ${tiempo} antes de volver a prostitute*`);
            }
            // ===== EVENTOS =====
            const eventType = Math.random();
            let texto = "";
            let xpGanado = 0;
            let esFracaso = false;
            // ===== 1. ÉXITO (55%) =====
            if (eventType < 0.55) {
                const xp = Math.floor(Math.random() * 2500) + 1000; // 1000-3500 XP
                xpGanado = xp;
                // 15% de chance de sesión de lujo
                if (Math.random() < 0.15) {
                    const bonusXp = Math.floor(Math.random() * 3000) + 500;
                    xpGanado += bonusXp;
                    texto = `${pickRandom(frasesBonus)}\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n🎁 *¡BONUS!* +${bonusXp.toLocaleString("es-AR")} XP extra`;
                }
                else {
                    texto = `${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*`;
                }
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2 WHERE id = $3 OR lid = $4", [xpGanado, now, m.sender, m.lid || ""]);
            }
            // ===== 2. FRACASO (30%) =====
            else if (eventType < 0.85) {
                const xp = Math.floor(Math.random() * 500) + 50; // 50-500 XP
                xpGanado = xp;
                esFracaso = true;
                texto = `${pickRandom(frasesFracaso)} *${xpGanado.toLocaleString("es-AR")} XP*`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 3. FIESTA SALVAJE (10%) =====
            else if (eventType < 0.95) {
                const xp = Math.floor(Math.random() * 4000) + 3000; // 3000-7000 XP
                xpGanado = xp;
                texto = `🔥 *¡FIESTA SALVAJE!* 🔥\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n💃 *¡La noche fue épica!*`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            // ===== 4. JACKPOT HOT (5%) =====
            else {
                const xp = Math.floor(Math.random() * 8000) + 5000; // 5000-13000 XP
                xpGanado = xp;
                texto = `🎰 *¡JACKPOT HOT!* 🔥🔥🔥\n${pickRandom(frasesExito)}\nGanaste: *${xpGanado.toLocaleString("es-AR")} XP*\n\n⭐ *¡ERES LA ESTRELLA DEL GRUPO!* ⭐`;
                await m.db.query("UPDATE usuarios SET exp = exp + $1, lastslut = $2 WHERE id = $3 OR lid = $3", [xpGanado, now, m.sender]);
            }
            await m.reply(null, texto);
            // ===== REACCIONES =====
            if (xpGanado > 5000) {
                await m.react("🔥");
            }
            else if (xpGanado > 3000) {
                await m.react("💃");
            }
            else if (xpGanado > 1000) {
                await m.react("😈");
            }
            else if (esFracaso) {
                await m.react("😢");
            }
            else {
                await m.react("💅");
            }
        }
        catch (err) {
            console.error("slut error:", err);
            m.reply("❌ Ocurrió un error.");
            await m.react("🚨");
        }
    }
};
/* ========= UTILS ========= */
function pickRandom(list) {
    return list[Math.floor(Math.random() * list.length)];
}
