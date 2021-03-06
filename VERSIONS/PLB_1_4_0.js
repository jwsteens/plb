/* COLORS:

KMAR:       206694
BRW:        e61515
ERROR:      b50000
SPECIAL:    fcdf03

*/

const Discord = require('discord.js');
const cron = require("node-cron");
const bot = new Discord.Client();
const fs = require('fs');
const process = require('process');

const token = JSON.parse(fs.readFileSync("token.json"));


function preferences ( ) {
    return JSON.parse(fs.readFileSync("preferences.json"));
}

function commands () {
    return JSON.parse(fs.readFileSync("commands.json"));
}

function cmds(msg) { // Replies all possible commands, can be edited in commands.json
    sendmessage = new Discord.MessageEmbed()
    .setTitle("Commands")
    .setColor("206694");
    for (var i of Object.entries(commands())) {
        desc = i[1].replace("{prefix}", preferences().prefix);
        sendmessage.addField(preferences().prefix + i[0], desc, false);
    }
    msg.channel.send(sendmessage);
}

function log(data, type, user) { // All arguments required
    const botlogchannel = bot.channels.cache.get(preferences().botlogchannelid);
    var time = new Date(Date.now());
    var timeprefix = `${time.getDate()}/${time.getMonth()+1}/${time.getFullYear()} ${time.getHours()}:${time.getMinutes()}`;
    console.log(`[${timeprefix}]: ${data}       By: ${user.id}`);
    fs.appendFileSync(preferences().datadirectory+ '/log.log', `[${timeprefix}]: ${data}      By: ${user}\n`);
    var logmessage = new Discord.MessageEmbed()
    .setTitle(type)
    .addField("Description", data, true)
    .addField("Prompted by", user, true)
    .setColor("206694")
    .setFooter(timeprefix);

    if (type == "ERROR") {
        logmessage.setColor("b50000");
        botlogchannel.send("<@216120408393383936>");
    }
    console.log(type)
    if (type == "SHUTDOWN" || type == "RESTART" || type == "STARTUP") {
        logmessage.setColor("fcdf03");
        botlogchannel.send("<@216120408393383936>");
    }
    botlogchannel.send(logmessage);
}

function checkformod(msg) { // Checks whether person sending message is ranked "mod"
    if (msg.member.roles.cache.some( r => r.name === preferences().moderatorrole)) {
        return true;
    }
}

function updateactivity() { // Updates activity next to name, purely for fun, has no further function
    if (!preferences().activities) {
        return;
    }
    
    const activities = JSON.parse(fs.readFileSync("activities.json"));
    var chosen_activity = activities[Math.floor(Math.random()*activities.length)];
    let logcollection = []
    const interactivedatadir = fs.opendirSync(preferences().datadirectory);

    while (true) {
        let dirent = interactivedatadir.readSync();
        if (dirent == null) {
            break;
        } else {
            logcollection.push(dirent);
        }
    }

    interactivedatadir.closeSync();
    
    try {
        var random_user = (logcollection[Math.floor(Math.random()*logcollection.length)].name).slice(0, -5);
        switch (chosen_activity[0]) {
            case "WATCHING":
                bot.user.setActivity(chosen_activity[1], {type: "WATCHING", url: "https://twitch.tv/abnormaalz"})
                .then()
                .catch((error) => {log(`Could not set status: ${error}`, "Status error", "System")});
            break;

            case "PLAYING":
                bot.user.setActivity(chosen_activity[1].replace("{username}", random_user), {type: "PLAYING"})
                .then()
                .catch((error) => {log(`Could not set status: ${error}`, "Status error", "System")});
            break;

            case "LISTENING":
                bot.user.setActivity(chosen_activity[1], {type: "LISTENING"});
            break;

            case "STREAMING":
                bot.user.setActivity(chosen_activity[1], {type: "STREAMING", url: "https://twitch.tv/abnormaalz"});
            break;
        }
           log(`${chosen_activity[0]}: ${chosen_activity[1]}`, "Changed status", "System");
        } catch (error) {
        log(`Could not find random user: ${error}`, "Random user error", "System");
    }
}

function restartsequence() {
    console.log("Restarting")
    preferences = JSON.parse(fs.readFileSync("preferences.json"));
    preferences.restart = true;
    fs.writeFileSync("preferences.json", JSON.stringify(preferences, null, 2));
    require("child_process").spawn("sh", ["START.sh"]);
    setTimeout(() => {
        process.exit()}, 2000)
}

bot.on('ready', () => { // Startup
    console.log(preferences.restart)
    if (preferences.restart == true) {
        preferences.restart = false;
        fs.writeFileSync("preferences.json", JSON.stringify(preferences, null, 2));
        log(`Bot restarted.\nPrefix: ${preferences().prefix}\nPID: \`${process.pid}\``, "RESTART", "System")
    } else {
        log(`Bot started up.\nPrefix: ${preferences().prefix}\nPID: \`${process.pid}\``, "STARTUP", "System");
    }
    updateactivity();
})

cron.schedule("0 0,8,14,20 * * *", () => {
    log("Activity automatically updated (scheduled)", "Activity update", "System");
    updateactivity();
});

bot.on('message', (message) => { // Fires whenever new message is sent in channel

    if (message.content == `<@!${bot.user.id}>`) {
        message.channel.send(`My prefix is \`${preferences().prefix}\`. Run \`${preferences().prefix}cmds\` to see what I am capable of.`);
    } else if (message.content[0]!=preferences().prefix) {
        return;
    }
    const args = message.content.substring(preferences().prefix.length).split(' ');
    
    for(i=0; args.length > i; i++) {

        if(args[i].length == 0) {
            message.channel.send(`Something went wrong with the spacing of your arguments. Please check the spaces between your arguments and try again.`);
            return;
        }
    }

    const username = args[1];
    const filter = msg => msg.author.id === message.author.id;
    var sendmessage = new Discord.MessageEmbed();

    switch(args[0]) {
        case 'logpatrol':
            try {
                var time = Math.floor(Date.now() / 1000);
                if(args[4]) {
                    message.channel.send(`Make sure to use the correct format: \`${preferences().prefix}logpatrol [username] (hours) [minutes]\``);
                    return;
                }
                if(!args[3]) {
                    if(!args[1] || !args[2]) {
                        message.channel.send(`Make sure to use the correct format: \`${preferences().prefix}logpatrol [username] (hours) [minutes]\``);
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
                    var data = JSON.parse(fs.readFileSync(preferences().datadirectory+ "/" + username + '.json'));
                }
                catch(e) {
                    fs.writeFileSync(preferences().datadirectory+ "/" + username + '.json', '[]');
                    var data = JSON.parse(fs.readFileSync(preferences().datadirectory+ "/" + username + '.json'));
                    log(`Created new logfile with name ${username}`, "New logfile", message.author);
                }

                data.push({
                        "time": time,
                        "hours": hours,
                        "minutes": minutes
                    });
                fs.writeFileSync(preferences().datadirectory+ "/" + username + '.json', JSON.stringify(data, null, 2));
                log(`Written data to ${username}.json`, "Entry added", message.author);
                message.react("✅");
                
            } catch(err) {
                message.channel.send('An error has occured. Please ask <@216120408393383936> for further help.');
                log(err, "ERROR", message.author);
            }

                break;

        case 'checkentries':
            if(!args[1] || args[2]) {
                message.channel.send(`Make sure to follow the correct format: \`${preferences().prefix}checkentries [username]\``)
                return;
            }
            
            try {
                var data = JSON.parse(fs.readFileSync(preferences().datadirectory+ "/" + username + '.json'));
            
                var p;
                var totalhours = 0;
                var totalminutes = 0;
                var pages = Math.ceil(data.length / 25);
            
                for (p = 0; p < pages; p++) {
                    sendmessage = new Discord.MessageEmbed()
                    .setTitle("Entries for " + username)
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
                        var month = unixtime.getMonth() + 1;
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
                .setTitle("Entries for " + username)
                .setColor("206694")
                .setDescription(data.length + " entries")
                .addField("Hours patrolled:", totalhours, true)
                .addField("Minutes patrolled:", remainderminutes, true);
                message.channel.send(sendmessage);
                log(`Displayed patrollogs for ${username}`, "Logs requested", message.author);
                break;
            }
            catch {
                message.channel.send("No logs were found under this username.");
                return;
            }

        case 'checktime':
            if(!args[1] || args[2]) {
                message.channel.send(`Make sure to follow the correct format: \`${preferences().prefix}checktime [username]\``)
                return;
            }
            try {
                var data = JSON.parse(fs.readFileSync(preferences().datadirectory+ "/" + username + '.json'));

                var totalhours = 0;
                var totalminutes = 0;

                for (p = 0; p < pages; p++) {

                    for (i=0; i < lim; i++) {
                        const logentry = data[(i+p*25)];
                        if (logentry.hours) {totalhours += parseInt(logentry.hours)};
                        totalminutes += parseInt(logentry.minutes);
                    }
                }

                for (i in data) {
                    const logentry = data[i];
                    if (logentry.hours) {totalhours += parseInt(logentry.hours)};
                    totalminutes += parseInt(logentry.minutes);
                }

                totalhours += Math.floor(totalminutes / 60);
                remainderminutes = totalminutes % 60;

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Logged time for " + username)
                .setColor("206694")
                .setDescription(data.length + " entries")
                .addField("Hours patrolled:", totalhours, true)
                .addField("Minutes patrolled:", remainderminutes, true);
                message.channel.send(sendmessage);
                log(`Displayed time for ${username}`, "Time requested", message.author);
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
                message.channel.send(`Please make sure to use the correct format: \`${preferences().prefix}deleteentry [username] [entry]\``);
                break;
            }

            try {
                var data = JSON.parse(fs.readFileSync(preferences().datadirectory+ "/" + username + ".json"));

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Confirmation")
                .setDescription(`Please confirm the deletion of entry ${askedentry + 1} (${data[askedentry].hours} hours, ${data[askedentry].minutes} minutes) from ${username}'s log by saying "**confirm**".\n **This cannot be undone!**`)
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

                    
                    data.splice(askedentry, 1);
                    fs.writeFileSync(preferences().datadirectory+ `/${username}.json`, JSON.stringify(data, null, 2));
                    
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

            } catch(err) {
                message.channel.send('An error has occured. Please ask <@216120408393383936> for further help.');
                log(err, "ERROR", message.author);
            }

                break;
        
        case 'deletelogs':
            if (!checkformod(message)) {
                message.channel.send("You do not have the right permissions to do this!");
                log("Tried to run deletelogs but had permission errors.", "Permission error", message.author);
                return;
            }
            if(!args[1] || args[2]) {
                message.channel.send(`Please make sure to use the correct format: \`${preferences().prefix}deletelogs [username]\``);
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

                try {
                    fs.unlinkSync(preferences().datadirectory+ `/${username}.json`);
                    log(`Log removed for ${username}`, "Data deleted", message.author);

                    sendmessage = new Discord.MessageEmbed()
                    .setTitle("Log deleted")
                    .setColor("206694")
                    .setDescription("Log deleted")
                    message.channel.send(sendmessage);
                } catch(err) {
                    message.channel.send('An error has occured. Please ask <@216120408393383936> for further help.');
                    log(err, "ERROR", message.author);
                }
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

            if (args[1]) {
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

                fs.rmdirSync(preferences().datadirectory, {recursive: true});
                fs.mkdirSync(preferences().datadir);
                message.channel.send("All logs succesfully deleted.");
                log("All logs wiped", "Data deleted", message.author);

                sendmessage = new Discord.MessageEmbed()
                .setTitle("Deletion status")
                .setColor("206694")
                .setDescription("All logs wiped.")
                message.channel.send(sendmessage);

            }).catch(collected => {
                log(collected, "Error thrown", message.author);
                message.channel.send("Prompt timed out, cancelling");
            });
            break;

        case 'alllogs':
            if (!checkformod(message)) {
                message.channel.send("You do not have the right permissions to do this!");
                log("Tried to run alllogs but had permission errors.", "Permission error", message.author);
                return;
            }

            if (args[1]) {
                return;
            }

            let logcollection = []
            const interactivedatadir = fs.opendirSync(preferences().datadirectory);

            while (true) {
                let dirent = interactivedatadir.readSync();
                if (dirent == null) {
                    break;
                } else {
                    logcollection.push(dirent);
                }
            }

            var p;
            var pages = Math.ceil(logcollection.length / 25);

            for (p = 0; p < pages; p++) {
                sendmessage = new Discord.MessageEmbed()
                .setTitle("All logs")
                .setFooter("Page " + (p+1) + " of " + pages)
                .setColor('206694');
                var lim = 25;

                if ((p+1) == pages && pages > 1) {
                    lim = logcollection.length - (pages - 1) * 25;
                } else if(pages === 1) {
                    lim = logcollection.length;
                }

                for (let i=0; i < lim; i++) {
                    if (logcollection[i].name === "log.log") {
                        continue;
                    }
                    var totalhours = 0;
                    var totalminutes = 0;
                    data = JSON.parse(fs.readFileSync(`${preferences().datadirectory}/${logcollection[i].name}`));
                    for (x in data) {
                        if (data[x].hours) {totalhours += parseInt(data[x].hours)};
                        totalminutes += parseInt(data[x].minutes);
                    }

                    totalhours += Math.floor(totalminutes / 60);
                    var remainderminutes = totalminutes % 60;

                    sendmessage.addField(logcollection[i].name.replace(".json", ""), `${data.length} entries, ${totalhours} hours and ${remainderminutes} minutes`);
                }
                message.channel.send(sendmessage);
            }

            sendmessage = new Discord.MessageEmbed()
            .setTitle("Total logs")
            .setColor("206694")
            .setDescription((logcollection.length - 1) + " logs");
            message.channel.send(sendmessage);
            log(`Displayed all patrollogs`, "All logs requested", message.author);
            interactivedatadir.closeSync();
            break;
            
        case "updateactivity":
            if (preferences().activities_enabled) {
                updateactivity();
                message.reply("updated!");
                break;
            } else {
                message.reply("activities are disabled!");
                break;
            }
            
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
            .addField("Disclaimer", "This bot saves no personal data. It only saves the data you save, and it keeps logs of whoever makes use of the bot (saving the Discord tag). This bot only operates in this server and its internal workings are only accesible by its creator. A select few can interact with the logging system.")
            .addField("Activities", "The activities of the bot (whatever the bot is doing, eg. \`Playing with your logs\` are purely for fun. They aren't functional and do not reflect what the bot is actually doing.")
            .addField("Inquiries", "If you have questions, concerns, found bugs or security threats, please do not hesitate to DM the creator.")
            .addField("Version", preferences().version, true)
            .addField("Creator/owner", "<@216120408393383936>", true);
            message.channel.send(sendmessage);
            break;

        case 'pid':
            message.channel.send(`\`${process.pid}\``)
            break;
        
        case 'shutdown':
            owners = preferences().owners;
            owners.forEach( (oid) => {
                console.log(oid, message.author.id)
                if (toString(oid) == toString(message.author.id)) {
                    console.log("Yeah it's the same")
                    sendmessage = new Discord.MessageEmbed()
                    .setTitle("Confirmation")
                    .setColor("bf1d00")
                    .setDescription(`Please confirm the shutdown of the bot by saying \`confirm\`.\n**The bot can only be started manually after this!**`)
                    .setFooter(`Say \`cancel\` to cancel`);

                    message.channel.send(sendmessage);

                    message.channel.awaitMessages(filter, {max: 1, time: 10000})
                    .then(async collected => {
                        if(collected.first().content.toLowerCase() === 'cancel') {
                            message.channel.send("Prompt cancelled.");
                            return;
                        } else if(collected.first().content.toLowerCase() !== "confirm") {
                            message.channel.send("Unexpected answer, prompt cancelled.");
                            return;
                        }

                        log(`Shutting down...`, `SHUTDOWN`, message.author);
                        setTimeout(() => {process.exit()}, 2000);

                    }).catch(collected => {
                        log(collected, "Error thrown", message.author);
                        message.channel.send("Prompt timed out, cancelling");
                    });
                }
            });

            break;

        case 'restart':
            owners = preferences().owners;
            console.log("I ran tho")
            owners.forEach( (oid) => {
                console.log(oid, message.author.id)
                if (toString(oid) == toString(message.author.id)) {
                    console.log("Yeah it's the same")
                    sendmessage = new Discord.MessageEmbed()
                    .setTitle("Confirmation")
                    .setColor("bf1d00")
                    .setDescription(`Please confirm the restart of the bot by saying \`confirm\`.`)
                    .setFooter(`Say \`cancel\` to cancel`);

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
                            
                        log(`Restarting...`, `RESTART`, message.author)
                        restartsequence()
                    }).catch(collected => {
                        log(collected, "Error thrown", message.author);
                        message.channel.send("Prompt timed out, cancelling");
                    });
                }
            });

            break;
    }
})

bot.login(token);