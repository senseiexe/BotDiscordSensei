require('dotenv').config();
const { 
    Client, GatewayIntentBits, Partials, ActionRowBuilder, EmbedBuilder, 
    ChannelType, PermissionsBitField, StringSelectMenuBuilder, ModalBuilder, 
    TextInputBuilder, TextInputStyle 
} = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const mongoose = require('mongoose');

// --- CONFIGURAÇÃO DO MONGOOSE (BANCO DE DADOS) ---
const counterSchema = new mongoose.Schema({
    id: String,
    seq: Number
});
const Counter = mongoose.model('Counter', counterSchema);

async function getNextSequence(name) {
    let count = await Counter.findOneAndUpdate(
        { id: name },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return count.seq.toString().padStart(4, '0');
}

// --- INICIALIZAÇÃO DO BOT ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers],
    partials: [Partials.Message, Partials.Channel]
});

client.once('ready', async () => {
    // Conecta ao MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🍃 Conectado ao MongoDB!');
    console.log(`✅ Bot online como ${client.user.tag}`);

    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    await guild.commands.create({
        name: 'setup',
        description: 'Cria o painel de tickets profissional',
        defaultMemberPermissions: PermissionsBitField.Flags.Administrator
    });
});

client.on('interactionCreate', async (interaction) => {
    
    // 1. COMANDO /SETUP
    if (interaction.isChatInputCommand() && interaction.commandName === 'setup') {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Atendimento')
            .setDescription('Selecione uma categoria abaixo para iniciar seu atendimento.')
            .setColor('#2b2d31');

        const menu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('select_ticket_type')
                .setPlaceholder('Escolha o motivo do contato...')
                .addOptions([
                    { label: 'Avaliação', value: 'avaliacao', emoji: '📝' },
                    { label: 'Dúvidas', value: 'duvidas', emoji: '❓' },
                    { label: 'Contratar', value: 'contratar', emoji: '🤝' },
                    { label: 'Suporte', value: 'suporte', emoji: '🛠️' },
                ])
        );

        await interaction.channel.send({ embeds: [embed], components: [menu] });
        await interaction.reply({ content: '✅ Painel configurado!', ephemeral: true });
    }

    // 2. ABRINDO TICKET COM ID DO BANCO
    if (interaction.isStringSelectMenu() && interaction.customId === 'select_ticket_type') {
        await interaction.deferReply({ ephemeral: true }); // Evita erro de timeout

        const selectedType = interaction.values[0];
        const ticketId = await getNextSequence('ticketId'); // Busca ID no MongoDB
        const userName = interaction.user.username.toLowerCase().replace(/\s+/g, '-');
        const channelName = `${selectedType}-${ticketId}-${userName}`;

        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: process.env.CATEGORY_ID,
            permissionOverwrites: [
                { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles] },
                { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels] }
            ]
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle(`Ticket #${ticketId} | ${selectedType.toUpperCase()}`)
            .setDescription(`Olá ${interaction.user}, descreva sua solicitação.\n\n` +
                            `⚠️ **LGPD:** Suas mensagens e arquivos serão armazenados para fins de auditoria e segurança.`)
            .setColor('#3498db');

        const manageMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('manage_ticket')
                .setPlaceholder('⚙️ Gerenciar Ticket')
                .addOptions([
                    { label: 'Adicionar Membro', value: 'add_user', emoji: '👤' },
                    { label: 'Remover Membro', value: 'remove_user', emoji: '🚫' },
                    { label: 'Fechar e Salvar', value: 'close_ticket', emoji: '🔒' }
                ])
        );

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [manageMenu] });
        await interaction.editReply(`✅ Ticket criado: ${ticketChannel}`);
    }

    // 3. PAINEL DE GERENCIAMENTO (Fechar / Modais)
    if (interaction.isStringSelectMenu() && interaction.customId === 'manage_ticket') {
        const value = interaction.values[0];

        if (value === 'close_ticket') {
            await interaction.reply('🔒 Salvando histórico e encerrando...');
            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1, filename: `transcript-${interaction.channel.name}.html`, saveImages: true
            });

            const logChannel = interaction.guild.channels.cache.get(process.env.LOG_CHANNEL_ID);
            if (logChannel) await logChannel.send({ files: [attachment] });

            setTimeout(() => interaction.channel.delete(), 5000);
        }

        if (value === 'add_user' || value === 'remove_user') {
            const isAdd = value === 'add_user';
            const modal = new ModalBuilder().setCustomId(isAdd ? 'modal_add' : 'modal_rem').setTitle(isAdd ? 'Adicionar' : 'Remover');
            const input = new TextInputBuilder().setCustomId('userId').setLabel('ID do Usuário').setStyle(TextInputStyle.Short);
            modal.addComponents(new ActionRowBuilder().addComponents(input));
            await interaction.showModal(modal);
        }
    }

    // 4. RESPOSTA DO MODAL
    if (interaction.isModalSubmit()) {
        const userId = interaction.fields.getTextInputValue('userId');
        try {
            const isAdd = interaction.customId === 'modal_add';
            await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: isAdd });
            await interaction.reply(`✅ Usuário ${isAdd ? 'adicionado' : 'removido'}.`);
        } catch { await interaction.reply({ content: '❌ Erro: ID inválido.', ephemeral: true }); }
    }
});

client.login(process.env.TOKEN);