# Evil Guardians Raid Monitor

Cloudflare Worker do bot de Raid do servidor Evil Guardians.

## Variáveis e secrets necessários na Cloudflare

- `DISCORD_TOKEN` (secret)
- `DISCORD_PUBLIC_KEY` (secret)
- `SETUP_SECRET` (secret criado por você para proteger o cadastro dos comandos)
- `DISCORD_APPLICATION_ID` (variável)
- `GUILD_ID` (variável)
- `CHANNEL_ID` (variável)

O projeto consulta `RAID BOSSES` e `RAID CONFIG` pela API da Holy Guardians.
Nunca coloque o token do bot em arquivos do GitHub.
