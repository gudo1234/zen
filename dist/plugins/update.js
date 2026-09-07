import { exec } from "child_process";

export default {
    name: ["actualizar", "update", "up"],
    help: ["actualizar"],
    desc: "Actualiza el bot directamente desde GitHub.",
    tags: ["owner"],
    register: true,
    owner: true,

    run: async ({ conn, m }) => {
        await m.react("🔄");

        exec(
            'git fetch origin && git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"',
            async (err, stdout, stderr) => {

                if (err) {
                    console.error("❌ Error actualizando:", err);

                    await m.react("❌");

                    return m.reply(
                        `${m.e?.error || "❌"} *No se pudo realizar la actualización.*\n\n` +
                        `> ${err.message}`
                    );
                }

                const resultado = stdout.trim();

                console.log("Git:", resultado);

                if (
                    resultado.includes("HEAD is now at") ||
                    resultado.includes("HEAD is now")
                ) {
                    await m.react("✅");

                    return m.reply(
                        `${m.e?.ok || "✅"} *Bot actualizado correctamente desde GitHub.*\n\n` +
                        `\`\`\`\n${resultado}\n\`\`\``
                    );
                }

                await m.react("✅");

                return m.reply(
                    `${m.e?.ok || "✅"} *Actualización completada.*\n\n` +
                    `\`\`\`\n${resultado || "Sin cambios nuevos."}\n\`\`\``
                );
            }
        );
    }
};
