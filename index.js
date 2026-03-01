const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    EmbedBuilder, 
    ChannelType, 
    PermissionsBitField, 
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');

const discordTranscripts = require('discord-html-transcripts');

// CONFIGURAÇÕES BÁSICAS (Preencha com seus dados)
const TOKEN = 'SEU_TOKEN_AQUI';
const CATEGORY_ID = 'ID_DA_CATEGORIA_DE_TICKETS'; // ID da categoria onde os tickets serão criados
const LOG_CHANNEL_ID = 'ID_DO_CANAL_DE_LOGS'; // (Opcional) ID do canal onde os transcripts serão salvos

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.once('ready', () => {
    console.log(`✅ Bot online como ${client.user.tag}`);
});

// Comando simples "!setup" para criar o painel principal de tickets
client.on('messageCreate', async (message) => {
    if (message.content === '!setup' && message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const embed = new EmbedBuilder()
            .setTitle('🎫 Central de Atendimento')
            .setDescription('Clique no botão abaixo para abrir um ticket de suporte. Nossa equipe o atenderá em breve.')
            .setColor('#2b2d31');

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_ticket')
                .setLabel('Abrir Ticket')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [button] });
        await message.delete();
    }
});

// Gerenciamento de Interações (Botões, Menus e Modais)
client.on('interactionCreate', async (interaction) => {
    // --- 1. ABRIR TICKET ---
    if (interaction.isButton() && interaction.customId === 'open_ticket') {
        const channelName = `ticket-${interaction.user.username}`;
        
        // Verifica se o usuário já tem um ticket aberto
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === channelName.toLowerCase());
        if (existingChannel) {
            return interaction.reply({ content: `Você já possui um ticket aberto em ${existingChannel}.`, ephemeral: true });
        }

        // Criação do canal privado
        const ticketChannel = await interaction.guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,
            parent: CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: interaction.guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel], // Esconde de todos
                },
                {
                    id: interaction.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles], // Permite o usuário
                },
                {
                    id: client.user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels], // Permite o bot
                }
            ]
        });

        await interaction.reply({ content: `✅ Seu ticket foi criado: ${ticketChannel}`, ephemeral: true });

        // Embed de boas-vindas e Aviso LGPD
        const ticketEmbed = new EmbedBuilder()
            .setTitle('Bem-vindo ao seu Ticket')
            .setDescription(`Olá ${interaction.user}, descreva seu problema e aguarde a equipe.\n\n` +
                            `⚠️ **Aviso de Privacidade (LGPD):**\n` +
                            `Para fins de segurança e qualidade, todas as mensagens enviadas neste canal serão salvas em um histórico fechado ao término do atendimento. Os dados são acessíveis apenas pela administração e tratados conforme a Lei Geral de Proteção de Dados (LGPD).`)
            .setColor('#2ecc71');

        // Painel de Gerenciamento do Ticket (Menu)
        const manageMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('manage_ticket')
                .setPlaceholder('⚙️ Gerenciar Ticket')
                .addOptions([
                    { label: 'Adicionar Membro', description: 'Adiciona um usuário ao ticket', value: 'add_user', emoji: '👤' },
                    { label: 'Remover Membro', description: 'Remove um usuário do ticket', value: 'remove_user', emoji: '🚫' },
                    { label: 'Fechar e Salvar Ticket', description: 'Encerra o ticket e gera o histórico (LGPD)', value: 'close_ticket', emoji: '🔒' }
                ])
        );

        await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [manageMenu] });
    }

    // --- 2. PAINEL DE GERENCIAMENTO (Menu de Seleção) ---
    if (interaction.isStringSelectMenu() && interaction.customId === 'manage_ticket') {
        const value = interaction.values[0];

        // Fechar Ticket e Gerar Transcript
        if (value === 'close_ticket') {
            await interaction.reply({ content: '🔒 Salvando o histórico de mensagens e fechando o ticket...' });

            // Gera o transcript (HTML)
            const attachment = await discordTranscripts.createTranscript(interaction.channel, {
                limit: -1, 
                returnType: 'attachment', 
                filename: `${interaction.channel.name}-historico.html`, 
                saveImages: true,
                poweredBy: false
            });

            // Envia o transcript para o usuário no privado (se possível)
            try {
                await interaction.user.send({ 
                    content: `Seu ticket **${interaction.channel.name}** foi encerrado. Segue em anexo o histórico das mensagens (conforme aviso LGPD).`,
                    files: [attachment] 
                });
            } catch (err) {
                console.log('Não foi possível enviar DM para o usuário.');
            }

            // Envia para o canal de logs do servidor (se configurado)
            if (LOG_CHANNEL_ID) {
                const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    await logChannel.send({ 
                        content: `Histórico do \`${interaction.channel.name}\` encerrado por ${interaction.user.tag}.`,
                        files: [attachment] 
                    });
                }
            }

            // Deleta o canal
            setTimeout(() => interaction.channel.delete(), 5000);
        }

        // Adicionar Membro (Abre um Modal)
        if (value === 'add_user' || value === 'remove_user') {
            const isAdd = value === 'add_user';
            const modal = new ModalBuilder()
                .setCustomId(isAdd ? 'modal_add_user' : 'modal_remove_user')
                .setTitle(isAdd ? 'Adicionar Usuário' : 'Remover Usuário');

            const userIdInput = new TextInputBuilder()
                .setCustomId('userIdInput')
                .setLabel('Insira o ID do Usuário do Discord')
                .setStyle(TextInputStyle.Short)
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(userIdInput));
            await interaction.showModal(modal);
        }
    }

    // --- 3. RECEBENDO DADOS DO MODAL (Adicionar/Remover) ---
    if (interaction.isModalSubmit()) {
        const userId = interaction.fields.getTextInputValue('userIdInput');
        
        try {
            const user = await interaction.guild.members.fetch(userId);

            if (interaction.customId === 'modal_add_user') {
                await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: true, SendMessages: true });
                await interaction.reply({ content: `✅ Usuário ${user} foi **adicionado** ao ticket.`, ephemeral: false });
            } 
            
            if (interaction.customId === 'modal_remove_user') {
                await interaction.channel.permissionOverwrites.edit(userId, { ViewChannel: false, SendMessages: false });
                await interaction.reply({ content: `✅ Usuário ${user.user.username} foi **removido** do ticket.`, ephemeral: false });
            }

        } catch (error) {
            await interaction.reply({ content: `❌ Não foi possível encontrar um usuário com o ID \`${userId}\` no servidor.`, ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);