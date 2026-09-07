import { getPack, setPackVisibility } from "../lib/stickerPack.js";
export default {
    name: ["setpack"],
    tags: ["sticker"],
    help: ["setpack <public/private>"],
    desc: "Para poner tu paquete de stickers publico/privado",
    register: true,
    run: async ({ m, text, prefijo }) => {
        const [mode, ...rest] = text.split(" ");
        const name = rest.join(" ");
        if (!["public", "private"].includes(mode))
            return m.reply(`❌ Usa: ${prefijo}setpack public|private nombre`);
        const pack = await getPack(m.sender, name);
        if (!pack)
            return m.reply("❌ Pack no existe");
        await setPackVisibility(m.sender, name, mode === "public");
        m.reply(mode === "public"
            ? "🌍 Pack ahora es **PÚBLICO**"
            : "🔒 Pack ahora es **PRIVADO**");
    }
};
