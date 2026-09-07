import { setPrefix, getPrefix } from "../lib/db.js";
export default {
    name: "setprefix",
    help: ["setprefix"],
    desc: "cambiar en prefijo del bot",
    tags: ["jadibot"],
    owner: true,
    run: async ({ conn, m, body, prefijo, cmd }) => {
        const botId = conn.user?.id?.split(":")[0];
        const args = body.replace(/^setprefix\s*/i, "").trim();
        const actual = await getPrefix(botId);
        if (!args)
            return m.reply(`📌 Prefijo(s) actual(es): ${actual || "(sin prefijo)"}

${m.e.warn} *Para cambiar tu prefijo usa:*\n${prefijo + cmd} <prefijo>\n📌 Ej: ${prefijo + cmd} #\n📌 Ej: ${prefijo + cmd} #,!,😀\n📌 Ej: ${prefijo + cmd} noprefix`);
        const prefijos = args.split(",").map(p => p.trim()).filter(p => p.length > 0)
            .map(p => p.toLowerCase() === "noprefix" ? "" : p)
            .filter(p => p === "" || (p.length >= 1 && p.length <= 5));
        if (prefijos.length === 0)
            return m.reply("❌ Prefijo inválido.");
        const guardarComo = prefijos.map(p => p === "" ? "noprefix" : p).join(",");
        await setPrefix(botId, guardarComo);
        const lista = prefijos.map(p => p === "" ? "`(sin prefijo)`" : `\`${p}\``).join(", ");
        return m.reply(`✅ Prefijo(s) actualizado(s): ${lista}`);
    }
};
