import * as Discord from "discord.js";
import { cp } from "fs";

export async function RPS(interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>) {
    const opponent = interaction.options.getMember("opponent");

    const challenger = interaction.member;

    // double checks that the values for each of these are guild members, I dont think this ever returns
    if (!(opponent instanceof Discord.GuildMember) || !(challenger instanceof Discord.GuildMember)) {
        interaction.reply("An error has occured, please try again");
        return;
    }

    if (opponent.user.bot) {
        interaction.reply("You can't challenge bots to Rock Paper Scissors,,,");
        return;
    }

    if (opponent === challenger) {
        interaction.reply("You can't challenge yourself,,,dummy");
    }

    const message = await interaction.reply(
        { content: `<@${opponent.user.id}>, **${challenger.displayName}** challenged you to a game of Rock Paper Scissors!!\n\nReact to this message to play Rock Paper Scissors`, fetchReply: true });

    message.react("✅");

    const collectorFilter = (reaction: any, user: Discord.User) => {
        return reaction.emoji.name === "✅" && user === opponent.user;
    };

    const collector = message.createReactionCollector({ filter: collectorFilter, time: 60000, dispose: true });

    collector.on("collect", async (reaction, user) => {
        if (user === opponent.user) {
            collector.stop();
            if (!interaction.channel || !(interaction.channel instanceof Discord.TextChannel)) return

            interaction.channel.send(`Game has started!\n\n<@${challenger.id}> and <@${opponent.id}> Check your dms!`);

            // Call both sendRPS concurrently and wait for both to resolve
            const [chalOut, oppOut] = await Promise.all([
                sendRPS(challenger),
                sendRPS(opponent)
            ]);

            if (chalOut === "") {
                interaction.channel.send(challenger.displayName + " didnt respond in time");
            } else if (oppOut === "") {
                interaction.channel.send(opponent.displayName + " didnt respond in time");
            } else if (chalOut === oppOut) {
                interaction.channel.send(`It was a tie...\n\n${opponent.displayName} and ${challenger.displayName} both played **${chalOut[0].toUpperCase() + chalOut.substring(1)}**`);
            } else if ((chalOut === "paper" && oppOut == "rock") || (chalOut === "scissors" && oppOut === "paper") || (chalOut === "rock" && oppOut === "scissors")) {
                interaction.channel.send(`🏆 ${challenger.displayName} won! 🏆\n\n${challenger.displayName} played **${chalOut[0].toUpperCase() + chalOut.substring(1)}**\n${opponent.displayName} played **${oppOut[0].toUpperCase() + oppOut.substring(1)}**`);
            } else {
                interaction.channel.send(`🏆 ${opponent.displayName} won! 🏆\n\n${challenger.displayName} played **${chalOut[0].toUpperCase() + chalOut.substring(1)}**\n${opponent.displayName} played **${oppOut[0].toUpperCase() + oppOut.substring(1)}**`);
            }

        } else {
            const userReactions = message.reactions.cache.filter(reaction => reaction.users.cache.has(user.id));

            for (const reaction of userReactions.values()) {
                await reaction.users.remove(user.id);
            }
        }
    });

    collector.on("end", (reason: any) => {
        if (reason === "time") {
            if (!interaction.channel || !(interaction.channel instanceof Discord.TextChannel)) return
            interaction.channel.send(`${opponent.displayName} didn't respond in time...`);
        }
    });

    async function sendRPS(member: Discord.GuildMember): Promise<string> {
        const DM = await member.createDM();
        //🪨 📰 ✂️
        const message = await DM.send("What are you playing?\n\n🪨: Rock\n📰: Paper\n✂️: Scissors");

        message.react("🪨");
        message.react("📰");
        message.react("✂️");
        return new Promise<string>((resolve) => {
            const collector = message.createReactionCollector({
                filter: (reaction, user) => {
                    return (reaction.emoji.name === "🪨" || reaction.emoji.name === "📰" || reaction.emoji.name === "✂️") && !user.bot;
                },
                time: 60000, // Collect for 60 seconds
            });

            collector.on("collect", (reaction, user) => {
                let response = "";
                if (reaction.emoji.name === "🪨") {
                    response = "rock";
                } else if (reaction.emoji.name === "📰") {
                    response = "paper";
                } else if (reaction.emoji.name === "✂️") {
                    response = "scissors";
                }
                DM.send(`Your response has been recorded, you played ${response[0].toUpperCase() + response.substring(1)}`);

                // Resolve the promise with the reaction emoji if one is collected
                resolve(response);
                collector.stop();
            });

            collector.on("end", (collected, reason) => {
                // If the collector ends without any reactions, return an empty string
                if (reason === "time") {
                    DM.send("You ran out of time to respond...");
                    resolve(""); // No reaction was made
                }
            });
        });
    }
}