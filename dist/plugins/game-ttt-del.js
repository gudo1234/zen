import { juegos } from "./game-tictac.js";
export default {
    name: ["delttt", "deletett", "deltictac"],
    help: ["delttt"],
    desc: "Eliminar una sala de Tic-Tac-Toe",
    tags: ["game"],
    group: true,
    register: true,
    run: async ({ conn, m, args, prefijo }) => {
        const senderJid = m.sender;
        const chatId = m.chat;
        // ========== SIN ARGUMENTOS ==========
        if (!args[0]) {
            return m.reply(`🗑️ *ELIMINAR SALA TIC-TAC-TOE*\n\n📌 *Uso:*\n${prefijo}delttt [nombre]\n\n📌 *Ejemplo:*\n${prefijo}delttt hola\n\n⚠️ Solo el *creador* de la sala puede eliminarla.`);
        }
        const nombreSala = args[0].trim();
        const salaKey = `sala_${chatId}_${nombreSala}`;
        // Buscar la sala en memoria
        const sala = juegos.get(salaKey);
        if (!sala) {
            return m.reply(`❌ No existe una sala con el nombre *${nombreSala}*`);
        }
        // Verificar que sea el creador
        if (sala.jugador1 !== senderJid) {
            return m.reply(`❌ Solo el *creador* de la sala puede eliminarla.\n\n👤 Creador: @${sala.jugador1.split('@')[0]}`, true, { mentions: [sala.jugador1] });
        }
        // Eliminar sala de la DB
        await m.db.query(`DELETE FROM tictac_salas WHERE nombre = $1 AND chat_id = $2`, [nombreSala, chatId]);
        // Eliminar juegos de los jugadores
        const key1 = `${chatId}_${sala.jugador1}`;
        const key2 = sala.jugador2 ? `${chatId}_${sala.jugador2}` : null;
        juegos.delete(salaKey);
        juegos.delete(key1);
        if (key2)
            juegos.delete(key2);
        // Notificar al otro jugador si existe
        if (sala.jugador2) {
            await conn.sendMessage(sala.jugador2, {
                text: `🗑️ *Sala ${nombreSala} eliminada*\n\nEl creador @${sala.jugador1.split('@')[0]} ha eliminado la sala.\n\n¡Gracias por jugar! 🎮`,
                mentions: [sala.jugador1]
            });
        }
        await m.reply(`✅ Sala *${nombreSala}* eliminada correctamente.`);
        await m.react("🗑️");
    }
};
