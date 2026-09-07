import chalk from "chalk";
export var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["ERROR"] = 0] = "ERROR";
    LogLevel[LogLevel["COMMAND"] = 1] = "COMMAND";
    LogLevel[LogLevel["MESSAGE"] = 2] = "MESSAGE";
})(LogLevel || (LogLevel = {}));
export const CURRENT_LOG_LEVEL = LogLevel.COMMAND;
function formatBotLabel(conn) {
    const jidRaw = conn?.user?.id || "";
    const jidClean = jidRaw.replace(/:\d+/, "").split("@")[0];
    const name = conn?.user?.name?.trim() || jidClean || "BOT";
    const conns = globalThis.conns;
    const isSubbot = Array.isArray(conns)
        ? conns.some(c => c?.user?.id && c.user.id === conn?.user?.id)
        : false;
    return (chalk.yellowBright("+" + jidClean) +
        " " +
        chalk.cyanBright("-") +
        " " +
        chalk.bold(name) +
        (isSubbot ? chalk.magenta(" (SUB-BOT)") : chalk.green(" (OFICIAL)")));
}
export function logCommand({ conn, timestamp, sender, isGroup, command }) {
    if (CURRENT_LOG_LEVEL < LogLevel.COMMAND)
        return;
    const botLabel = formatBotLabel(conn);
    console.log(chalk.bgBlue.white.bold(" [ CMD ] ") +
        " " +
        botLabel +
        "\n" +
        chalk.green("From: ") +
        sender +
        "\n" +
        chalk.green("Chat: ") +
        (isGroup ? "Grupo" : "Privado") +
        "\n" +
        chalk.green("Comando: ") +
        chalk.whiteBright(command) +
        "\n");
}
export function logMessage({ conn, sender, isGroup, text }) {
    if (CURRENT_LOG_LEVEL < LogLevel.MESSAGE)
        return;
    const botLabel = formatBotLabel(conn);
    console.log(chalk.bgGray.white.bold(" [ MSG ] ") +
        " " +
        botLabel +
        "\n" +
        chalk.green("From: ") +
        sender +
        "\n" +
        chalk.green("Chat: ") +
        (isGroup ? "Grupo" : "Privado") +
        "\n" +
        chalk.green("Mensaje: ") +
        chalk.white(text) +
        "\n");
}
export function logError(error) {
    const message = error instanceof Error
        ? error.stack || error.message
        : String(error);
    console.error(chalk.bgRed.white.bold(" ERROR ") +
        " " +
        chalk.red(new Date().toISOString()) +
        "\n" +
        chalk.redBright(message));
}
