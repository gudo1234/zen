// @ts-nocheck
import { db } from "../lib/db.js";
import { MASCOTAS, MASCOTA_HP_MAX, estadoMascota, aplicarHambreMascotas } from "../lib/rpg-utils.js";
function barraHP(hp) {
    const total = 10;
    const llenos = Math.max(0, Math.min(total, Math.round((hp / MASCOTA_HP_MAX) * total)));
    return "█".repeat(llenos) + "░".repeat(total - llenos);
}
export default {
    name: ["mascotas", "mascota", "pets"],
    help: ["mascotas"],
    desc: "Ver el estado de tus mascotas",
    tags: ["econ"],
    register: true,
    run: async ({ conn, m, prefijo }) => {
        try {
            const { rows: [user] } = await db.query("SELECT mascotas FROM usuarios WHERE id = $1 OR lid = $2", [m.sender, m.lid || ""]);
            if (!user)
                return m.reply(null, "❌ No estás registrado.");
            let mascotas = Array.isArray(user.mascotas) ? user.mascotas : [];
            if (mascotas.length === 0) {
                return m.reply(null, `🐾 *No tenés mascotas*\n\n> Comprá alguna con *${prefijo}shop*`);
            }
            // 🔥 Aplicar hambre por tiempo
            const { mascotas: actualizadas, cambios } = aplicarHambreMascotas(mascotas);
            mascotas = actualizadas;
            // 🔥 Separar vivas y muertas
            const vivas = [];
            const muertas = [];
            for (const m of mascotas) {
                if (m.hp <= 0) {
                    muertas.push(m);
                }
                else {
                    vivas.push(m);
                }
            }
            // 🔥 Mostrar mensaje
            let txt = "";
            // Vivitas
            if (vivas.length > 0) {
                txt += `╭─「 🐾 *MIS MASCOTAS* 」\n│\n`;
                for (const m of vivas) {
                    const info = MASCOTAS[m.key];
                    if (!info)
                        continue;
                    const estado = estadoMascota(m.hp);
                    txt += `│ ${info.name}\n`;
                    txt += `│ ${estado.barra} ${barraHP(m.hp)} *${m.hp}/${MASCOTA_HP_MAX}*\n`;
                    txt += `│ ${estado.emoji} Estado: *${estado.texto}*\n`;
                    txt += `│\n`;
                }
                txt += `╰───────────────\n\n`;
            }
            // Muertas (se muestran 1 vez y se borran)
            if (muertas.length > 0) {
                txt += `╭─「 💀 *MASCOTAS MUERTAS* 」\n│\n`;
                for (const m of muertas) {
                    const info = MASCOTAS[m.key];
                    if (!info)
                        continue;
                    txt += `│ 💀 ${info.name}\n`;
                }
                txt += `╰───────────────\n\n`;
                txt += `_Las mascotas muertas se eliminan de tu lista._\n\n`;
            }
            // Ayuda
            if (vivas.length > 0) {
                txt += `👉 Alimentar: *${prefijo}alimentar <mascota> <comida>*\n`;
                txt += `📌 Ej: *${prefijo}alimentar perro_cazador carne_conejo_cocida*`;
            }
            await m.reply(null, txt);
            if (muertas.length > 0 || cambios) {
                await db.query("UPDATE usuarios SET mascotas = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(vivas), m.sender]);
            }
            else if (cambios) {
                await db.query("UPDATE usuarios SET mascotas = $1::jsonb WHERE id = $2 OR lid = $2", [JSON.stringify(mascotas), m.sender]);
            }
            // Reacciones
            if (muertas.length > 0) {
                await m.react("💀");
            }
            else if (vivas.some(v => v.hp < 20)) {
                await m.react("😢");
            }
            else {
                await m.react("🐾");
            }
        }
        catch (e) {
            console.error("❌ Error en mascotas:", e);
            m.reply(`❌ Error: ${e.message || e}`);
        }
    }
};
