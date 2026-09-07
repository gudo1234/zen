import { exec as _exec } from "child_process";
import { promisify } from "util";
const exec = promisify(_exec);
export default {
    name: ["$"],
    help: ["$ <comando>"],
    desc: "Ejecuta comandos en la terminal del servidor.",
    tags: ["owner"],
    customPrefix: /^[$]\s?/,
    run: async ({ m, conn, isROwner }) => {
        if (!isROwner)
            return;
        const input = m.originalText?.replace(/^\$\s?/, "").trim();
        if (!input)
            return m.reply("✳️ Usa:\n`$ <comando>`\n\nEjemplo:\n`$ ls -la`\n```\n$ cd api\nnpm start\n```");
        await m.react("💻");
        try {
            const command = input
                .split(/\r?\n/)
                .map(line => line.replace(/\\\s*$/, ""))
                .map(line => line.trim())
                .filter(Boolean)
                .join(" ");
            const { stdout, stderr } = await exec(command, {
                shell: "/bin/bash",
                maxBuffer: 1024 * 1024 * 5
            });
            let salida = "";
            if (stdout.trim())
                salida += "✅ *Salida:*\n```\n" + stdout.slice(0, 4000) + "\n```";
            if (stderr.trim())
                salida += "\n> *- ejecutado:*\n```\n" + stderr.slice(0, 4000) + "\n```";
            if (!salida)
                salida = "✔️ Comando ejecutado sin salida visible.";
            await m.reply(salida);
        }
        catch (err) {
            const out = (err.stdout || "").toString().slice(0, 4000);
            const errOut = (err.stderr || "").toString().slice(0, 4000);
            let mensaje = "❌ *Error fatal:*\n```\n" + (err.message || String(err)) + "\n```";
            if (out)
                mensaje += "\n✅ *Salida parcial:*\n```\n" + out + "\n```";
            if (errOut)
                mensaje += "\n⚠️ *stderr:*\n```\n" + errOut + "\n```";
            await m.reply(mensaje);
            await m.react("❌");
        }
    },
};
