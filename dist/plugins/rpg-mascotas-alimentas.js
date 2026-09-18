// @ts-nocheck
import { db } from "../lib/db.js";
import { MASCOTAS, COMIDA_MASCOTA, MASCOTA_HP_MAX, estadoMascota } from "../lib/rpg-utils.js";
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
const frasesBien = [
    "¡Le encantó! {mascota} comió feliz",
    "{mascota} devoró todo en 2 segundos",
    "{mascota} movió la cola de alegría",
    "{mascota} se relamió los bigotes",
    "{mascota} te agradeció con un lamido",
];
const frasesMal = [
    "{mascota} te miró con asco y vomitó",
    "{mascota} olfateó la comida y se alejó",
    "¡Pobre {mascota}! Le cayó mal la comida",
    "{mascota} se enfermó por lo que le diste",
    "{mascota} te gruñó y no quiso comer",
];
export default {
    name: ["alimentar", "feed", "darle"],
    help: ["alimentar <mascota> <comida>"],
    desc: "Alimenta a tu mascota",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        try {
            const now = Date.now();
            const mascotaKey = (args[0] || "").toLowerCase();
            const comidaKey = (args[1] || "").toLowerCase();
            if (!mascotaKey || !comidaKey) {
                return m.reply(null, `🐾 *Uso: ${prefijo}alimentar <mascota> <comida>*\n\n` +
                    `📌 Ejemplo: *${prefijo}alimentar perro_cazador carne_conejo_cocida*\n\n` +
                    `> Ver mascotas: *${prefijo}mascotas*\n` +
                    `> Ver inventario: *${prefijo}inv*`);
            }
            const info = MASCOTAS[mascotaKey];
            if (!info) {
                return m.reply(null, `❌ *${mascotaKey}* no es una mascota válida.\n\n> Ver: *${prefijo}mascotas*`);
            }
            const comida = COMIDA_MASCOTA[comidaKey];
            if (!comida) {
                return m.reply(null, `❌ *${comidaKey}* no se le puede dar a una mascota.`);
            }
            const { rows: [user] } = await db.query("SELECT inventario, mascotas FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            let mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
            let inventario = user.inventario || {};
            // Buscar mascota
            const idx = mascotas.findIndex(m => {
                const key = typeof m === "string" ? m : m.key;
                return key === mascotaKey;
            });
            if (idx === -1) {
                return m.reply(null, `❌ No tenés a *${info.name}* en tus mascotas.`);
            }
            // Verificar comida en inventario
            const cantComida = Number(inventario[comidaKey]) || 0;
            if (cantComida <= 0) {
                return m.reply(null, `❌ No tenés *${comidaKey}* en tu inventario.`);
            }
            // Actualizar mascota
            const mascotaActual = mascotas[idx];
            const hpActual = typeof mascotaActual === "string"
                ? MASCOTA_HP_MAX
                : (Number(mascotaActual.hp) || MASCOTA_HP_MAX);
            if (hpActual <= 0) {
                return m.reply(null, `💀 *${info.name}* está muerta, no puede comer.`);
            }
            const nuevoHp = Math.max(0, Math.min(MASCOTA_HP_MAX, hpActual + comida.hp));
            const hpDelta = nuevoHp - hpActual;
            mascotas[idx] = {
                key: mascotaKey,
                hp: nuevoHp,
                last_feed: now
            };
            // Sacar comida del inventario
            inventario[comidaKey] = cantComida - 1;
            if (inventario[comidaKey] <= 0)
                delete inventario[comidaKey];
            // Update DB
            await db.query("UPDATE usuarios SET mascotas = $1::jsonb, inventario = $2::jsonb WHERE id = $3 OR lid = $3", [JSON.stringify(mascotas), JSON.stringify(inventario), m.sender]);
            // Mensaje
            let msg = "";
            const estadoNuevo = estadoMascota(nuevoHp);
            if (hpDelta > 0) {
                const frase = pickRandom(frasesBien).replace(/{mascota}/g, info.name);
                msg = `🍖 *${frase}*\n\n`;
                msg += `▢ HP: *${hpActual}* → *${nuevoHp}* (+${hpDelta})\n`;
                msg += `▢ Estado: ${estadoNuevo.emoji} *${estadoNuevo.texto}*`;
            }
            else if (hpDelta < 0) {
                const frase = pickRandom(frasesMal).replace(/{mascota}/g, info.name);
                msg = `🤢 *${frase}*\n\n`;
                msg += `▢ HP: *${hpActual}* → *${nuevoHp}* (${hpDelta})\n`;
                msg += `▢ Estado: ${estadoNuevo.emoji} *${estadoNuevo.texto}*`;
                if (nuevoHp === 0) {
                    msg += `\n\n💀 *¡${info.name} MURIÓ!*\n> Se eliminará de tu lista`;
                }
            }
            else {
                msg = `😐 *${info.name}* comió pero no cambió nada.\n\n`;
                msg += `▢ HP: *${nuevoHp}*`;
            }
            await m.reply(null, msg);
            await m.react(hpDelta > 0 ? "🍖" : hpDelta < 0 ? "🤢" : "😐");
        }
        catch (e) {
            console.error("❌ Error en alimentar:", e);
            m.reply(`❌ Error: ${e.message || e}`);
        }
    }
};
