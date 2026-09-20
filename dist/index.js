// @ts-nocheck
//import baileys from "@whiskeysockets/baileys"
//const { makeWASocket, fetchLatestBaileysVersion } = baileys
process.env.TMPDIR = '/home/container/tmp';
process.env.TMP = '/home/container/tmp';
process.env.TEMP = '/home/container/tmp';
import { makeWASocket, fetchLatestBaileysVersion, DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import 'dotenv/config';
import P from "pino";
import * as readline from "readline-sync";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import chalk from "chalk";
import NodeCache from "node-cache";
import { handler, participantsUpdate, handleJoinRequest, groupsUpdate, verificarExpirados } from "./handler.js";
import { db, initDB, setBotSettings } from "./lib/db.js";
import { iniciarSubbot } from "./plugins/jadibot.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const processed = new NodeCache({
    stdTTL: 60,
    checkperiod: 30,
    useClones: false
});
const reintentos = {};
const msgStore = new NodeCache({
    stdTTL: 120,
    checkperiod: 60,
    useClones: false
});
const autoStartedSubs = new Set();
let mainSock = null;
let reconnectTimer = null;
let isStartingMain = false;
async function iniciarTodosLosSubbotsUnaSolaVez() {
    const AUTO_CONEXION = process.env.AUTO_CONEXION === "true";
    if (!AUTO_CONEXION)
        return;
    console.log(chalk.greenBright("🚀 AUTO_CONEXION: iniciando subbots una sola vez"));
    const sessionsDir = path.resolve(process.cwd(), "sessions");
    if (!fs.existsSync(sessionsDir))
        return;
    const subs = fs.readdirSync(sessionsDir).filter(d => d.startsWith("sub_"));
    for (const folder of subs) {
        const numero = folder.replace("sub_", "");
        if (!numero || autoStartedSubs.has(numero))
            continue;
        autoStartedSubs.add(numero);
        const fakeMsg = {
            key: { remoteJid: `${numero}@s.whatsapp.net` },
            chat: `${numero}@s.whatsapp.net`,
            sender: `${numero}@s.whatsapp.net`,
            message: { conversation: "" }
        };
        iniciarSubbot({ logger: P({ level: "silent" }), user: { id: `${numero}@s.whatsapp.net` }, isFromCommand: false }, fakeMsg, false, false)
            .then(() => console.log(chalk.green(`✅ Subbot ${numero} iniciado`)))
            .catch(e => {
            autoStartedSubs.delete(numero);
            console.error(`❌ Error subbot ${numero}:`, e);
        });
    }
}
async function main() {
    if (isStartingMain)
        return;
    isStartingMain = true;
    try {
        await initDB();
        const AUTO_CONEXION = process.env.AUTO_CONEXION === "true";
        const mainSessionPath = path.join(process.cwd(), "sessions", "main", "creds.json");
        const hasMainSession = fs.existsSync(mainSessionPath);
        console.log("iniciando...");
        if (!hasMainSession && AUTO_CONEXION) {
            console.log(chalk.yellow("🟡 Sin bot principal → solo subbots activos"));
            isStartingMain = false;
            return;
        }
        if (mainSock) {
            try {
                mainSock.ev?.removeAllListeners?.();
            }
            catch { }
            try {
                mainSock.ws?.close?.();
            }
            catch { }
            try {
                mainSock.end?.();
            }
            catch { }
            mainSock = null;
        }
        const { state, saveCreds } = await useMultiFileAuthState(path.join(process.cwd(), "sessions", "main"));
        const { version } = await fetchLatestBaileysVersion();
        let numero = "";
        let opcion = "2";
        const wasUnregistered = !state.creds.registered;
        let linkedFromConsole = false;
        if (wasUnregistered) {
            console.log("1) Conectar con código QR");
            console.log("2) Conectar con código de 8 dígitos");
            opcion = readline.question("Elige una opción (1/2): ");
            linkedFromConsole = true;
            if (opcion === "2") {
                console.log(chalk.yellow("Ingresa tu número (ej: +521234567890): "));
                numero = readline.question("").replace(/[^0-9]/g, "");
            }
        }
        const msgRetryCounterCache = new NodeCache({ stdTTL: 0, checkperiod: 0, useClones: false });
        const userDevicesCache = new NodeCache({ stdTTL: 0, checkperiod: 0, useClones: false });
        const groupCache = new NodeCache({ stdTTL: 600, checkperiod: 120, useClones: false });
        console.info = () => { };
        const sock = makeWASocket({
            logger: P({ level: "silent" }),
            printQRInTerminal: false,
            browser: ['Windows', 'Chrome'],
            auth: state,
            markOnlineOnConnect: false,
            generateHighQualityLinkPreview: true,
            emitOwnEvents: true,
            shouldIgnoreJid: (jid) => /@(newsletter|broadcast)/.test(jid),
            syncFullHistory: false,
            connectTimeoutMs: 60_000,
            qrTimeout: 60_000,
            defaultQueryTimeoutMs: 60_000,
            version,
            getMessage: async (key) => msgStore.get(key.id)?.message || undefined,
        });
        mainSock = sock;
        sock.ev.on("creds.update", saveCreds);
        sock.isInit = false;
        sock.ev.on("connection.update", async ({ isNewLogin, connection, lastDisconnect }) => {
            if (isNewLogin)
                sock.isInit = false;
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (connection === "open") {
                const botId = sock.user?.id?.split(":")[0]?.replace(/\D/g, "");
                sock.isInit = true;
                isStartingMain = false;
                verificarExpirados(sock);
                console.log(chalk.greenBright(`✅ Bot principal conectado: +${numero || "sesión existente"}`));
                reintentos[botId] = 0;
                // SOLO marcar como main si fue vinculado manualmente desde consola/input
                if (linkedFromConsole && wasUnregistered) {
                    await db.query(`INSERT INTO subbot_instances
           (
             owner_id,
             phone,
             plan,
             ptero_server_id,
             session_id,
             session_path,
             status,
             created_at
           )
           VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())
           ON CONFLICT (session_id)
           DO UPDATE SET
             status = 'active'`, [
                        botId,
                        botId,
                        'main',
                        process.env.P_SERVER_UUID ||
                            process.env.SERVER_UUID ||
                            process.env.PTERO_SERVER_IDENTIFIER ||
                            'main',
                        `main_${botId}`,
                        './sessions',
                        'active'
                    ]);
                    await setBotSettings(botId, { tipo: "main" });
                }
                return;
            }
            if (connection === "close") {
                const botId = sock.user?.id?.split(":")[0]?.replace(/\D/g, "");
                console.log(`❌ Close reason=${reason}`);
                if (reason === DisconnectReason.loggedOut) {
                    console.log("💀 LoggedOut: borra sessions/main y vuelve a vincular");
                    if (botId) {
                        await db.query(`DELETE FROM subbot_instances
               WHERE phone = $1
               AND plan IN ('main', 'premium')`, [botId]).catch(() => { });
                    }
                    isStartingMain = false;
                    return;
                }
                if (reconnectTimer)
                    return;
                try {
                    sock.ev?.removeAllListeners?.();
                }
                catch { }
                try {
                    sock.ws?.close?.();
                }
                catch { }
                try {
                    sock.end?.();
                }
                catch { }
                reconnectTimer = setTimeout(async () => {
                    reconnectTimer = null;
                    isStartingMain = false;
                    try {
                        await main();
                    }
                    catch (e) {
                        console.error("❌ Error reiniciando principal:", e);
                    }
                }, 8000);
            }
        });
        process.on("uncaughtException", console.error);
        process.on("unhandledRejection", console.error);
        if (opcion === "2" && wasUnregistered) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(numero);
                    console.log(chalk.yellow("🔑 Código de emparejamiento:"), chalk.greenBright(code));
                }
                catch (err) {
                    console.error("❌ Error generando código de emparejamiento:", err);
                }
            }, 3000);
        }
        sock.ev.on('presence.update', async ({ id, presences }) => {
            for (const presence in presences)
                listener.presence({ id, presence, presences });
        });
        sock.ev.on("messages.upsert", async ({ messages, type }) => {
            if (type !== "notify")
                return;
            for (const msg of messages) {
                if (!msg?.message)
                    continue;
                if (msg.key.remoteJid === "status@broadcast")
                    continue;
                const id = msg.key.id || "";
                if (id.startsWith("BAE5") ||
                    id.startsWith("3EB0") ||
                    id.startsWith("EVO") ||
                    id.startsWith("Lyru-") ||
                    id.startsWith("EvoGlobalBot-") ||
                    id.startsWith("SUKI") ||
                    id.startsWith("B24E") ||
                    id.startsWith("FizzxyTheGreat-") ||
                    (id.startsWith("8SCO") && id.length === 20))
                    continue;
                // if (msg.messageStubType) continue
                // if (msg.message.protocolMessage || msg.message.pollUpdateMessage || msg.message.reactionMessage) continue
                if (msg.messageTimestamp && Date.now() / 1000 - Number(msg.messageTimestamp) > 120)
                    continue;
                const msg_id = `${msg.key.id}|${msg.key.remoteJid}`;
                if (processed.has(msg_id))
                    continue;
                processed.set(msg_id, true);
                try {
                    await handler(sock, msg);
                }
                catch (e) {
                    console.error(e);
                }
            }
        });
        sock.ev.on("group-participants.update", async (update) => {
            console.log(update);
            try {
                await participantsUpdate(sock, update);
            }
            catch (err) {
                console.error(chalk.red("❌ Error procesando group-participants.update:"), err);
            }
        });
        sock.ev.on("group.join-request", async (data) => {
            const groupId = data.id;
            const participants = [{
                    jid: data.participant,
                    pn: data.participantPn || null
                }];
            try {
                await handleJoinRequest(sock, groupId, participants);
            }
            catch (err) {
                console.error("❌ Error aprobando join-request:", err);
            }
        });
        sock.ev.on('messaging-history.set', (update) => { });
        sock.ev.on('messaging-history.status', (update) => { });
        sock.ev.on('chats.upsert', (update) => { });
        sock.ev.on('chats.update', (update) => { });
        sock.ev.on('chats.delete', (update) => { });
        sock.ev.on('chats.lock', (update) => { });
        sock.ev.on('lid-mapping.update', (update) => {
            //console.log(update)
        });
        sock.ev.on('contacts.upsert', (update) => { });
        sock.ev.on('contacts.update', (update) => {
            //console.log(update)
        });
        sock.ev.on('messages.delete', (update) => { });
        sock.ev.on('messages.update', (update) => { });
        sock.ev.on('messages.media-update', (update) => { });
        sock.ev.on('messages.upsert', (update) => {
            //console.log(update)
        });
        sock.ev.on('messages.reaction', (update) => { });
        sock.ev.on('message-receipt.update', (update) => {
            //console.log(update)
        });
        sock.ev.on('groups.upsert', (update) => {
            //console.log(update)
        });
        sock.ev.on('group.member-tag.update', (update) => {
            //console.log(update)
        });
        sock.ev.on('blocklist.set', (update) => { });
        sock.ev.on('blocklist.update', (update) => { });
        sock.ev.on('labels.edit', (update) => { });
        sock.ev.on('labels.association', (update) => { });
        sock.ev.on('newsletter.reaction', (update) => { });
        sock.ev.on('newsletter.view', (update) => { });
        sock.ev.on('newsletter-participants.update', (update) => {
            //console.log(update)
        });
        sock.ev.on('newsletter-settings.update', (update) => { });
        sock.ev.on('settings.update', (update) => { });
        sock.ev.on("groups.update", async (updates) => {
            try {
                for (const update of updates) {
                    const metadata = await sock.groupMetadata(update.id);
                    groupCache.set(update.id, metadata);
                    await groupsUpdate(sock, update);
                }
            }
            catch (err) {
                console.error("❌ Error procesando groups.update:", err);
            }
        });
    }
    catch (e) {
        isStartingMain = false;
        console.error("❌ Error en main():", e);
    }
}
;
(async () => {
    await initDB();
    const AUTO_CONEXION = process.env.AUTO_CONEXION === "true";
    const IS_FREE_SERVER = process.env.FREE_SERVER_1_ID ||
        process.env.FREE_SERVER_2_ID;
    if (AUTO_CONEXION) {
        await iniciarTodosLosSubbotsUnaSolaVez();
    }
    // Si este server es solo para subbots free, NO arranca bot principal
    if (AUTO_CONEXION && IS_FREE_SERVER && !fs.existsSync(path.join(process.cwd(), "sessions", "main", "creds.json"))) {
        console.log(chalk.yellow("🟡 Server free activo: solo cargando subbots"));
        return;
    }
    await main();
})().catch(console.error);

/*setInterval(() => {
    console.log('♻️ Reiniciando bot automáticamente...');
    process.exit(0);
}, 3600000); //1hs
*/
