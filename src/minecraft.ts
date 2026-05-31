import axios from "axios";
import { ChatInputCommandInteraction, CacheType } from "discord.js";

export async function online(interaction: ChatInputCommandInteraction<CacheType>, serverIP: string) {
    const uri = `https://api.mcsrvstat.us/3/${serverIP}`;

    const { data } = await axios.get(uri);

    if (data.ip === "127.0.0.1") {
        interaction.reply("You didn't enter a valid server IP");
        return;
    }

    if (!data.online) {
        interaction.reply("Server is Offline");
        return;
    }

    const players = data.players;
    let outputMessage = `Online Players in ${serverIP}: \n\n`;

    if (!players.list) {
        if (players.online === 0) {
            interaction.reply(`There aren't any players on ${serverIP} right now`);
        } else {
            interaction.reply(`There are ${players.online} players on ${serverIP}, I can't list all of them!`);
        }
        return;
    }

    for (const player of players.list) {
        outputMessage += `- ${player.name}\n`;
    }

    interaction.reply(outputMessage);
}

export async function version(interaction: ChatInputCommandInteraction<CacheType>, serverIP: string) {
    const uri = `https://api.mcsrvstat.us/3/${serverIP}`;

    const { data } = await axios.get(uri);

    if (data.ip === "127.0.0.1") {
        interaction.reply("You didn't enter a valid server IP");
        return;
    }

    if (!data.online) {
        interaction.reply("Server is Offline");
        return;
    }

    interaction.reply(`${serverIP} is running on version **${data.version}**`);
}