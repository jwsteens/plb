const Discord = require('discord.js');
const bot = new Discord.Client();
const fs = require('fs');

const token = JSON.parse(fs.readFileSync("token.json"));
const prefix = '!';
const version = '1.0.1';
const botmod = "Patrol bot access";
const botlogchannel = bot.channels.cache.get("714841700333256744");
const datadir = "logdata";

const { promisify } = require('util')
const sleep = promisify(setTimeout)

function cmds(msg) {
    sendmessage = new Discord.MessageEmbed()
    .setTitle("Commands")
    .setColor("206694")
    .addField("!help, !cmds", "Show all commands to this bot.")
    .addField("!logpatrol", "Log your hours and minutes.\nSyntax: `!logpatrol [username] (hours) [minutes]`")
    .addField("!checklogs", "Check anyone's logs.\nSyntax: `!checklogs [username]`")
    .addField("!deleteentry", "Delete an entry.\nSyntax: `!deleteentry [username] [entrynumber]`\nYou can check the entrynumber with !checklogs.")
    .addField("!deletelogs", "Completely remove someone's entries from the database.\nSyntax: `!deletelogs [username]`")
    .addField("!deletealllogs", "Permanently deletes ALL logs from ALL users.\nSyntax: `!deletealllogs`")
    .addField("!info", "View all info about the bot.");
    msg.channel.send(sendmessage);
}

function log(data, type, user) {
    var time = new Date(Date.now());
    var timeprefix = `${time.getDate()}/${time.getMonth()}/${time.getFullYear()} ${time.getHours()}:${time.getMinutes()}`;
    console.log(`[${timeprefix}]: ${data}       By: ${user}`);
    fs.appendFileSync(datadir + '/log.log', `[${timeprefix}]: ${data}      By: ${user}\n`);
    var logmessage = new Discord.MessageEmbed()
    .setTitle(type)
    .addField("Message", data, true)
    .addField("Prompted by", user, true)
    .setColor("206694")
    .setFooter(timeprefix);
    bot.channels.cache.get("714841700333256744").send(logmessage);
}

function checkformod(msg) {
    if (msg.member.roles.cache.some( r => r.name === botmod)) {
        return true;
    }
}

bot.on('ready', () => {
    log('Bot started up', "Startup", "System");
})

bot.on('message', (message) => {
    if(message.content[0]!=prefix) {
        return;
    }
    const args = message.content.substring(prefix.length).split(' ');
    const username = args[1];
    const filter = msg => msg.author.id === message.author.id;
    var sendmessage = new Discord.MessageEmbed();
    

    switch(args[0]) {
        case 'logpatrol':
            var time = Math.floor(Date.now() / 1000);
            if(args[4]) {
                message.channel.send("Make sure to use the correct format: `!logpatrol [usernanme] (hours) [minutes]`");
                return;
            }
            if(!args[3]) {
                if(!args[1] || !args[2]) {
                    message.channel.send("Make sure to use the correct format: `!logpatrol [usernanme] (hours) [minutes]`");
                    return;
                }
            var minutes = args[2];
            } else if(args[2]==0) {
                var minutes = args[3];
            } else {
                var hours = args[2];
                var minutes = args[3];
            }
            try {
                var data = JSON.parse(fs.readFileSync(datadir + "/" + username + '.json'));
            }
            catch(e) {
                fs.writeFileSync(datadir + "/" + username + '.json', '[]');
                var data = JSON.parse(fs.readFileSync(datadir + "/" + username + '.json'));
                log(`Created new logfile with name ${username}`, "New logfile", message.author);
            }

            data.push({
                    "time": time,
                    "hours": hours,
                    "minutes": minutes
                });
            fs.writeFileSync(datadir + "/" + username + '.json', JSON.stringify(data, null, 2));
            log(`Written data to ${username}.json`, "Entry added", message.author);
            message.react("✅");
            break;

        case 'checklogs':
            if(!args[1] || args[2]) {
                message.channel.send("Make sure to follow the correct format: `!checklogs [username]`")
                return;
            }
            try {
                var data = JSON.parse(fs.readFileSync(datadir + "/" + username + '.json'));

                var p;
                var totalhours = 0;
                var totalminutes = 0;
                var pages = Math.ceil(data.length / 25);

                for (p = 0; p < pages; p++) {
                    sendmessage = new Discord.MessageEmbed()
                    .setTitle("Records for " + username)
                    .setFooter("Page " + (p+1) + " of " + pages)
                    .setColor('206694');
                    var lim = 25;
                    if ((p+1) == pages && pages > 1) {
                        lim = data.length - (pages - 1) * 25;
                    } else if(pages === 1) {
                        lim = data.length;
                    }
                    var i;
                    for (i=0; i < lim; i++) {
                        const logentry = data[(i+p*25)];
                        const unixtime = new Date(logentry.time * 1000);
                        var day = unixtime.getDate();
                        var month = unixtime.getMonth();
                        var year = unixtime.getFullYear();
                        var hour = unixtime.getHours();
                        var minute = unixtime.getMinutes();
                        var time = day + "/" + month + "/" + year + " " + hour + ":" + minute;
                        if (!logentry.hours) {
                            var patroltime = (logentry.minutes + " minutes");
                        } else {
                            var patroltime = (logentry.hours + " hours and " + logentry.minutes + " minutes");
                            totalhours += parseInt(logentry.hours);
                        }
                        sendmessage.addField(1+i+p*25, patroltime + " logged on " + time);
                        totalminutes += parseInt(logentry.minutes);
                    }
                    message.channel.send(sendmessage);
                }

                totalhours += Math.floor(totalminutes / 60);
                remainderminutes = totalminutes % 60;

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Records for " + username)
                .setColor("206694")
                .setDescription(data.length + " entries")
                .addField("Hours patrolled:", totalhours, true)
                .addField("Minutes patrolled:", remainderminutes, true);
                message.channel.send(sendmessage);
                log(`Displayed patrollogs for ${username}`, "Logs requested", message.author);
                break;
            }
            catch(e) {
                message.channel.send("No logs were found under this username.");
                return;
            }

        case 'deleteentry':
            if (!checkformod(message)) {
                message.channel.send("You do not have the right permissions to do this!");
                log("Tried to run deleteentry but had permission errors.", "Permission error", message.author);
                return;
            }
            var askedentry = (args[2]-1);
            if (!args[2] || !args[1] || args[3]) {
                message.channel.send("Please make sure to use the correct format: `!deleteentry [username] [entry]`");
                break;
            }
            sendmessage = new Discord.MessageEmbed()
            .setTitle("Confirmation")
            .setDescription(`Please confirm the deletion of entry ${askedentry} from ${username}'s log by saying "**confirm**".\n **This cannot be undone!**`)
            .setColor("bf1d00")
            .setFooter(`Say "cancel" to cancel`);
            message.channel.send(sendmessage);
            message.channel.awaitMessages(filter, {max: 1, time: 10000})
            .then(collected => {
                if(collected.first().content.toLowerCase() === 'cancel') {
                    message.channel.send("Prompt cancelled.");
                    return;
                } else if(collected.first().content.toLowerCase() !== "confirm") {
                    message.channel.send("Unexpected answer, prompt cancelled.");
                    return;
                }

                var data = JSON.parse(fs.readFileSync(datadir + "/" + username + ".json"));
                data.splice(askedentry, 1);
                fs.writeFileSync(datadir + `/${username}.json`, JSON.stringify(data, null, 2));
                
                log(`Entry deleted in ${username}'s logs`, "Data deleted", message.author);

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Entry deletion")
                .setColor("206694")
                .setDescription("Entry deleted. **Before removing other entries,** make sure to check the logs again, as entries shift after removal.")
                message.channel.send(sendmessage);
            }).catch(collected => {
                console.error(collected);
                message.channel.send("Prompt timed out, cancelling");
            });
            break;
        
        case 'deletelogs':
            if (!checkformod(message)) {
                message.channel.send("You do not have the right permissions to do this!");
                log("Tried to run deletelogs but had permission errors.", "Permission error", message.author);
                return;
            }
            if(!args[1] || args[2]) {
                message.channel.send("Please make sure to use the correct format: `!deletelogs [username]`");
                break;
            }
            sendmessage = new Discord.MessageEmbed()
            .setTitle("Confirmation")
            .setColor("bf1d00")
            .setDescription(`Please confirm the deletion of ${args[1]}'s logs by saying "**confirm**".\n**This cannot be undone!**`)
            .setFooter(`Say "cancel" to cancel`);
            message.channel.send(sendmessage);
            sendmessage = new Discord.MessageEmbed()
            message.channel.awaitMessages(filter, {max: 1, time: 10000})
            .then(collected => {
                if(collected.first().content.toLowerCase() === 'cancel') {
                    message.channel.send("Prompt cancelled.");
                    return;
                } else if(collected.first().content.toLowerCase() !== "confirm") {
                    message.channel.send("Unexpected answer, prompt cancelled.");
                    return;
                }

                fs.unlinkSync(datadir + `/${username}.json`);
                log(`Log removed for ${username}`, "Data deleted", message.author);

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Log deleted")
                .setColor("206694")
                .setDescription("Log deleted")
                message.channel.send(sendmessage);
            }).catch(collected => {
                console.error(collected);
                message.channel.send("Prompt timed out, cancelling");
            });
            break;

        case 'deletealllogs':
            if (!checkformod(message)) {
                message.channel.send("You do not have the right permissions to do this!");
                log("Tried to run deletealllogs but had permission errors.", "Permission error", message.author);
                return;
            }

            sendmessage = new Discord.MessageEmbed()
            .setTitle("Confirmation")
            .setColor("bf1d00")
            .setDescription(`Please confirm the deletion of ***ALL*** logs by saying \`confirm\`.\n**This cannot be undone!**`)
            .setFooter(`Say \`cancel\` to cancel`);
            message.channel.send(sendmessage);
            sendmessage = new Discord.MessageEmbed()

            message.channel.awaitMessages(filter, {max: 1, time: 10000})
            .then(collected => {
                if(collected.first().content.toLowerCase() === 'cancel') {
                    message.channel.send("Prompt cancelled.");
                    return;
                } else if(collected.first().content.toLowerCase() !== "confirm") {
                    message.channel.send("Unexpected answer, prompt cancelled.");
                    return;
                }

                fs.rmdirSync(datadir, {recursive: true});
                fs.mkdirSync(datadir);
                message.channel.send("All logs succesfully deleted.");
                log("All logs wiped", "Data deleted", message.author);

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Entry deletion")
                .setColor("206694")
                .setDescription("All logs wiped.")
                message.channel.send(sendmessage);

            }).catch(collected => {
                console.error(collected);
                message.channel.send("Prompt timed out, cancelling");
            });
            break;

        case 'help':
            cmds(message);
            break;

        case 'cmds':
            cmds(message);
            break;

        case 'info':
            sendmessage = new Discord.MessageEmbed()
            .setTitle("Information")
            .setColor("206694")
            .setDescription("This bot was made by <@216120408393383936>. If you have any suggestions, bug reports or security threats, please DM me.")
            .addField("Version", version);
            message.channel.send(sendmessage);
            break;
    }
})

bot.login(token);