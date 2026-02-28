import * as Discord from "discord.js";
import * as dotenv from "dotenv";
import { RPS } from "./RPS";
import { slashRegister } from "./slashRegistry";
import { online, version } from "./minecraft";
import connectToDatabase from "./mongo";
import * as fs from "fs";
import OpenAI from "openai";
dotenv.config();

const client = new Discord.Client({

    // intents: ["Guilds", "GuildMessages", "GuildMembers", "GuildMessageReactions", "DirectMessageReactions", "MessageContent"]
    intents: 42499

});

client.on("clientReady", () => {
    console.log("Registering Commands")

    client.guilds.cache.forEach(guild => {
        console.log(`Server: ${guild.name} (${guild.id})`);
        slashRegister(client.user.id, guild.id)
    });

    console.log("Bot is ready :O");
});

// registers the slash commands individually for each server the bot joins.
// its possible to register the commands without the serverID, but that takes an hour to go through and I no wanna during testing
client.on("guildCreate", (guild) => {
    slashRegister(client.user.id, guild.id);
});

// bot code here!
client.on("interactionCreate", async (interaction) => {
    if (interaction.isCommand() && interaction.isChatInputCommand()) {
        // check commands  
        if (interaction.commandName === "github") {
            interaction.reply("Code for this bot can be found here: https://github.com/rmedcraft/mutex\n\nFind the rest of my projects at https://github.com/rmedcraft");
        }
        if (interaction.commandName === "rps") {
            RPS(interaction);
        }
        if (interaction.commandName === "coinflip") {
            const random = Math.floor(Math.random() * 2);
            if (random === 0) {
                interaction.reply("The coin landed on **Heads**");
            } else {
                interaction.reply("The coin landed on **Tails**");
            }
        }
        if (interaction.commandName === "minecraft") {
            const ip = interaction.options.getString("ip");
            if (interaction.options.getSubcommand() === "online") {
                online(interaction, ip);
            }

            if (interaction.options.getSubcommand() === "version") {
                version(interaction, ip);
            }
        }
        if (interaction.commandName === "channels") {
            console.log((interaction.member as Discord.GuildMember).permissions.toArray())
            if (!(interaction.member as Discord.GuildMember).permissions.has("Administrator")) {
                interaction.reply("You need to have admin permissions in the server to run this command");
                return;
            }

            await interaction.deferReply();

            const db = await connectToDatabase();
            const collection = db.collection("servers");

            const serverInfo = await collection.find({ serverID: interaction.guild.id }).toArray();
            // verifies the server info exists
            if (serverInfo.length === 0) {
                collection.insertOne({ serverID: interaction.guild.id });
            }

            if (interaction.options.getSubcommand() === "changeall") {
                const name = interaction.options.getString("name");

                const channelData = {};

                interaction.guild.channels.cache.forEach(async channel => {
                    // add a list of each channelID and its name to an array & put that in mongodb, if the mongodb entry already exists dont do that

                    channelData[channel.id] = channel.name;

                    await channel.setName(name);
                });

                // const userData = {};
                // interaction.guild.members.cache.forEach(async (user) => {
                //     if (user.roles.highest.position < interaction.guild.members.resolve(client.user).roles.highest.position) {
                //         userData[user.id] = user.nickname;

                //         await user.setNickname(name);
                //     }
                // });

                // serverInfo exists if the channelData doesnt exist, we want to update the database if the channelData doesnt exist, dont otherwise
                const serverInfo = await collection.findOne({ serverID: interaction.guild.id, channelData: { $exists: false } });
                if (serverInfo) {
                    collection.updateOne({ serverID: interaction.guild.id }, { $set: { channelData: channelData } });
                    // collection.updateOne({ serverID: interaction.guild.id }, { $set: { userData: userData } });

                    // DM rowan the json for manually reverting this (if necessary)
                    // const rowan = interaction.guild.members.cache.get("302174399283462146");
                    const user = interaction.member.user as Discord.User
                    const userDM = await user.createDM();

                    let objString = "{ ";

                    Object.entries(channelData).forEach(([key, value]: [string, string]) => {
                        objString += `"${key}": "${value}", `;
                    });

                    objString = objString.substring(0, objString.length - 2);

                    objString += " }";

                    let sendString =
                        `This is a backup for the server data. If you're unable to revert your server back, send this to Rowan and he'll fix it
db.servers.updateOne({serverID: "${interaction.guild.id}"}, $set: {channelData: ${objString}})`;

                    if (sendString.length < 2000) {
                        userDM.send(sendString);
                    } else {
                        fs.writeFileSync("temp.txt", sendString);

                        userDM.send({
                            files: [{
                                attachment: "temp.txt",
                                name: "backup.txt"
                            }]
                        }).then(() => {
                            fs.unlinkSync("temp.txt");
                        });
                    }
                }

                interaction.editReply("Changed all channel names to " + name);
                console.log(channelData);
            }
            if (interaction.options.getSubcommand() === "revert") {
                // get the mongoDB entry, get each channel by its channelID, revert them all back to what they were before, delete the mongoDB entry
                const serverInfo = await collection.findOne({ serverID: interaction.guild.id });
                const channelData = serverInfo.channelData;

                if (!channelData) {
                    interaction.editReply("No channel data to revert back to");
                    return;
                }

                console.log(channelData);

                Object.entries(channelData).forEach(([key, value]: [string, string]) => {
                    const channel = interaction.guild.channels.cache.get(key);
                    channel.setName(value);
                });

                // const userData = serverInfo.userData;
                // console.log("Bot Name", interaction.guild.members.resolve(client.user).nickname);
                // Object.entries(userData).forEach(([key, value]: [string, string]) => {
                //     const user = interaction.guild.members.cache.get(key);
                //     if (user.roles.highest.position < interaction.guild.members.resolve(client.user).roles.highest.position) {
                //         user.setNickname(value);
                //     }
                // });

                // deletes the entry so it knows to update it if this is ever run again
                await collection.updateOne({ serverID: interaction.guild.id }, { $unset: { channelData: {} } });
                // await collection.updateOne({ serverID: interaction.guild.id }, { $unset: { userData: {} } });

                interaction.editReply("All names have been reverted back");
            }
        }
        if (interaction.commandName === "countchannels") {
            let textCt = 0;
            let voiceCt = 0;
            interaction.guild.channels.cache.forEach((channel) => {
                if (channel.isTextBased()) {
                    textCt++;
                }
                if (channel.isVoiceBased()) {
                    voiceCt++;
                }
            });

            interaction.reply(`There are ${textCt} text channels\n\nThere are ${voiceCt} voice channels`);
        }
        if (interaction.commandName === "chat") {
            await interaction.deferReply();
            const prompt = interaction.options.getString("prompt");

            const openai = new OpenAI({
                apiKey: process.env.OPENAI_KEY
            });

            const completion = openai.chat.completions.create({
                model: "gpt-4o-mini",
                store: true,
                messages: [
                    { "role": "user", "content": prompt }
                ]
            });

            completion.then((result) => {
                const embed: Discord.EmbedBuilder = new Discord.EmbedBuilder()
                    .setColor(0x00FF00)
                    .setDescription(`${(interaction.member as Discord.GuildMember).nickname}:\n${prompt}\n\nChatGPT:\n${result.choices[0].message.content}`);

                interaction.editReply({
                    embeds: [embed]
                });
            });
        }
    }
});

client.login(process.env.TOKEN);