import * as dotenv from "dotenv";
dotenv.config();

// const { Routes } = require("discord-api-types/v10");
import { Routes } from "discord-api-types/v10";


// const { REST } = require("@discordjs/rest");
import { REST } from "@discordjs/rest";
// const { SlashCommandBuilder } = require("@discordjs/builders");
import { SlashCommandBuilder } from "@discordjs/builders";


const botToken = process.env.TOKEN;

const rest = new REST().setToken(botToken);
export const slashRegister = async (botID: string, serverID: string) => {
    try {
        await rest.put(Routes.applicationGuildCommands(botID, serverID), {
            body: [
                new SlashCommandBuilder().setName("github").setDescription("Look at the code for this bot"),
                new SlashCommandBuilder()
                    .setName("rps")
                    .setDescription("Play Rock Paper Scissors with someone")
                    .addUserOption((option) =>
                        option.setName("opponent")
                            .setDescription("The user you're challenging to a RPS game")
                            .setRequired(true)
                    ),
                new SlashCommandBuilder().setName("coinflip").setDescription("Flip a coin"),
                new SlashCommandBuilder()
                    .setName("minecraft")
                    .setDescription("See who's online in a minecraft server")
                    .addSubcommand((subcommand) => subcommand
                        .setName("online")
                        .setDescription("See who's online in a minecraft server")
                        .addStringOption((option) =>
                            option.setName("ip")
                                .setDescription("The server you want to see whos online for")
                                .setRequired(true)
                        )
                    )
                    .addSubcommand((subcommand) => subcommand
                        .setName("version")
                        .setDescription("See what version this minecraft server is on")
                        .addStringOption((option) =>
                            option.setName("ip")
                                .setDescription("The server you want to see the version for")
                                .setRequired(true)
                        )
                    ),
                new SlashCommandBuilder().setName("channels").setDescription("channel silly")
                    .addSubcommand((subcommand) =>
                        subcommand.setName("changeall")
                            .setDescription("changes all channels to a single name")
                            .addStringOption((option) =>
                                option.setName("name")
                                    .setDescription("The name you want to change all of the channel names to")
                                    .setRequired(true)
                            )
                    )
                    .addSubcommand((subcommand) =>
                        subcommand.setName("revert")
                            .setDescription("reverts all channels back to the previous name")
                    ),
                new SlashCommandBuilder().setName("countchannels").setDescription("count all the channels in your server"),
                new SlashCommandBuilder().setName("transcribe").setDescription("Transcribe a voice message")
                    .addStringOption((option) => 
                        option.setName("messagelink")
                            .setDescription("The link to the message you want to transcribe")
                            .setRequired(false)
                    )
                // new SlashCommandBuilder()
                //     .setName("chat")
                //     .setDescription("Ask ChatGPT a question")
                //     .addStringOption((option) =>
                //         option.setName("prompt")
                //             .setDescription("The prompt for ChatGPT")
                //             .setRequired(true)
                //     ),

            ],
        });
    } catch (error) {
        console.error(error);
    }
};