export default {
    name: ["vote"],
    help: ["vote <nombre del personaje>"],
    desc: "Vota un personaje y aumenta su valor",
    tags: ["gacha"],
    register: true,
    run: async ({ conn, m, args }) => {
        if (!m.db)
            return;
        try {
            const name = args.join(" ").trim().toLowerCase();
            if (!name)
                return m.reply('⚠️ Especificá el nombre del personaje.');
            const now = Date.now();
            const cooldown = 30 * 60 * 1000; // 30 min
            const { rows: users } = await m.db.query(`SELECT timevot FROM usuarios WHERE id = $1`, [m.sender]);
            const lastVote = users[0]?.timevot || 0;
            if (now - lastVote < cooldown)
                return m.reply(`🤚 Calmado crack, esperá ${msToTime(cooldown - (now - lastVote))}`);
            const { rows: chars } = await m.db.query(`SELECT id, name, price, votes 
         FROM characters 
         WHERE LOWER(name) = $1`, [name]);
            const character = chars[0];
            if (!character)
                return m.reply(`❌ No existe el personaje *${name}*.`);
            const votes = (character.votes || 0) + 1;
            const increment = Math.floor(Math.random() * 50) + 1;
            const price = (character.price || 0) + increment;
            await m.db.query(`UPDATE characters 
         SET votes = $1, price = $2 
         WHERE id = $3`, [votes, price, character.id]);
            await m.db.query(`INSERT INTO usuarios (id, timevot)
         VALUES ($1, $2)
         ON CONFLICT (id)
         DO UPDATE SET timevot = EXCLUDED.timevot`, [m.sender, now]);
            return m.reply(`✨️ Votaste por el personaje *${character.name}*, su nuevo precio es *${price.toLocaleString()}* (+${increment})`);
        }
        catch (err) {
            console.error("vote error:", err);
            return m.reply('⚠️ Error al votar el personaje.');
        }
    }
};
function msToTime(ms) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes} min ${seconds < 10 ? '0' : ''}${seconds} seg`;
}
