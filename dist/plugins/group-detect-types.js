import { db } from "../lib/db.js";
export default {
    name: ["detecttypes", "dtypes", "antitypes"],
    help: ["detecttypes", "detecttypes add <tipo>", "detecttypes remove <tipo>", "detecttypes reset"],
    desc: "Configurar qué tipos de contenido detectar (nsfw, erotica, gore, violence)",
    tags: ["admin"],
    admin: true,
    group: true,
    register: true,
    run: async ({ conn, m, args, prefijo, cmd }) => {
        const chatId = m.chat;
        const action = args[0]?.toLowerCase() || "list";
        // Tipos disponibles
        const tiposDisponibles = {
            nsfw: { emoji: "🔞", label: "Pornografía/Explícito", category: "Sexual" },
            erotica: { emoji: "💋", label: "Erótico", category: "Sexual" },
            suggestive: { emoji: "😳", label: "Sugestivo", category: "Sexual" },
            gore: { emoji: "🩸", label: "Gore/Sangre", category: "Violencia" },
            violence: { emoji: "⚔️", label: "Violencia", category: "Violencia" }
        };
        // Obtener tipos actuales
        const res = await db.query("SELECT nsfw_types FROM chats WHERE group_id = $1", [chatId]);
        let tiposActuales = res.rows[0]?.nsfw_types || ["nsfw", "gore"];
        // ============================================
        // LISTAR
        // ============================================
        if (action === "list" || action === "lista" || action === "ver" || action === "") {
            let msg = "*📋 TIPOS DE CONTENIDO DETECTADOS*\n\n";
            // Separar por categoría
            msg += "🔞 *SEXUAL:*\n";
            for (const [key, info] of Object.entries(tiposDisponibles)) {
                if (info.category === "Sexual") {
                    const check = tiposActuales.includes(key) ? "✅" : "❌";
                    msg += `  ${check} ${info.emoji} ${info.label}\n`;
                }
            }
            msg += `\n🩸 *VIOLENCIA:*\n`;
            for (const [key, info] of Object.entries(tiposDisponibles)) {
                if (info.category === "Violencia") {
                    const check = tiposActuales.includes(key) ? "✅" : "❌";
                    msg += `  ${check} ${info.emoji} ${info.label}\n`;
                }
            }
            msg += `\n📝 *Comandos:*`;
            msg += `\n  ${prefijo}${cmd} add <tipo>`;
            msg += `\n  ${prefijo}${cmd} remove <tipo>`;
            msg += `\n  ${prefijo}${cmd} reset`;
            return m.reply(msg);
        }
        // ============================================
        // AÑADIR tipo
        // ============================================
        if (action === "add" || action === "añadir") {
            const tipo = args[1]?.toLowerCase();
            if (!tipo || !tiposDisponibles[tipo]) {
                return m.reply(`⚠️ *Tipo no válido*\n\n📌 Tipos: nsfw, erotica, suggestive, gore, violence`);
            }
            if (tiposActuales.includes(tipo)) {
                return m.reply(`ℹ️ *${tiposDisponibles[tipo].emoji} ${tiposDisponibles[tipo].label}* ya está activo`);
            }
            tiposActuales.push(tipo);
            await db.query(`
        INSERT INTO chats (group_id, nsfw_types)
        VALUES ($1, $2)
        ON CONFLICT (group_id) DO UPDATE SET nsfw_types = $2
      `, [chatId, tiposActuales]);
            return m.reply(`✅ *${tiposDisponibles[tipo].emoji} ${tiposDisponibles[tipo].label}* agregado a la detección`);
        }
        // ============================================
        // ELIMINAR tipo
        // ============================================
        if (action === "remove" || action === "remover" || action === "delete" || action === "del") {
            const tipo = args[1]?.toLowerCase();
            if (!tipo || !tiposDisponibles[tipo]) {
                return m.reply(`⚠️ *Tipo no válido*\n\n📌 Tipos: nsfw, erotica, suggestive, gore, violence`);
            }
            if (!tiposActuales.includes(tipo)) {
                return m.reply(`ℹ️ *${tiposDisponibles[tipo].emoji} ${tiposDisponibles[tipo].label}* ya está inactivo`);
            }
            if (tiposActuales.length <= 1) {
                return m.reply(`⚠️ *Debe haber al menos un tipo activo*`);
            }
            tiposActuales = tiposActuales.filter(t => t !== tipo);
            await db.query(`
        INSERT INTO chats (group_id, nsfw_types)
        VALUES ($1, $2)
        ON CONFLICT (group_id) DO UPDATE SET nsfw_types = $2
      `, [chatId, tiposActuales]);
            return m.reply(`❌ *${tiposDisponibles[tipo].emoji} ${tiposDisponibles[tipo].label}* eliminado de la detección`);
        }
        // ============================================
        // RESETEAR a valores por defecto
        // ============================================
        if (action === "reset" || action === "reiniciar") {
            const defaultTypes = ["nsfw", "gore"];
            await db.query(`
        INSERT INTO chats (group_id, nsfw_types)
        VALUES ($1, $2)
        ON CONFLICT (group_id) DO UPDATE SET nsfw_types = $2
      `, [chatId, defaultTypes]);
            return m.reply(`✅ *Tipos reiniciados a valores por defecto:*\n🔞 nsfw (Pornografía)\n🩸 gore (Gore/Sangre)`);
        }
        // ============================================
        // AYUDA
        // ============================================
        const helpMsg = `*📋 DETECT TYPES*

${prefijo}${cmd} - Ver tipos activos
${prefijo}${cmd} add <tipo> - Activar tipo
${prefijo}${cmd} remove <tipo> - Desactivar tipo
${prefijo}${cmd} reset - Resetear a valores por defecto

📌 *Tipos disponibles:*
🔞 nsfw - Pornografía/Explícito (Sexual)
💋 erotica - Erótico (Sexual)
😳 suggestive - Sugestivo (Sexual)
🩸 gore - Gore/Sangre (Violencia)
⚔️ violence - Violencia (Violencia)

📌 *Ejemplos:*
${prefijo}${cmd} add violence
${prefijo}${cmd} remove gore
${prefijo}${cmd} reset`;
        return m.reply(helpMsg);
    }
};
