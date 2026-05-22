# FusionMedia Pro

Aplicacao web para combinar arquivos de audio e video usando Node.js, Express e FFmpeg.

O projeto oferece uma interface simples no navegador para:

- combinar 2 ou mais audios em um unico arquivo MP3 ou WAV;
- combinar 2 ou mais videos em um unico MP4;
- substituir/aplicar um audio em um video;
- limitar opcionalmente a duracao final do arquivo exportado;
- visualizar e baixar o resultado processado.

## Tecnologias

- Node.js
- Express
- Multer
- Nano ID
- FFmpeg
- Bootstrap 5
- Font Awesome

## Requisitos

Antes de executar o projeto, instale:

- Node.js 18 ou superior
- npm
- FFmpeg disponivel no terminal

Para testar se o FFmpeg esta instalado:

```bash
ffmpeg -version
```

Se o comando nao funcionar, instale o FFmpeg e adicione o executavel ao `PATH` do sistema.

Tambem e possivel apontar manualmente para o binario usando a variavel `FFMPEG_BIN`.

Exemplo no Windows PowerShell:

```powershell
$env:FFMPEG_BIN="C:\caminho\para\ffmpeg.exe"
npm start
```

## Instalacao

Clone o repositorio e instale as dependencias:

```bash
npm install
```

## Como executar

Inicie o servidor:

```bash
npm start
```

Acesse no navegador:

```text
http://localhost:3000
```

Por padrao, o servidor roda na porta `3000`.

## Como usar

### Combinar audios

1. Abra a aba **Combinar Audios**.
2. Envie 2 ou mais arquivos MP3 ou WAV.
3. Escolha o formato de saida: MP3 ou WAV.
4. Opcionalmente informe a duracao final em minutos.
5. Clique em **Combinar Audios**.

O arquivo final e salvo em:

```text
output/audio/
```

### Combinar videos

1. Abra a aba **Combinar Videos**.
2. Envie 2 ou mais arquivos MP4, MPEG ou WEBM.
3. Opcionalmente informe a duracao final em minutos.
4. Clique em **Combinar Videos**.

O arquivo final e salvo em:

```text
output/videos/
```

### Substituir audio em video

1. Abra a aba **Substituir Audio em Video**.
2. Envie 1 video.
3. Envie 1 audio.
4. Opcionalmente informe a duracao final em minutos.
5. Clique em **Aplicar Audio no Video**.

O arquivo final e salvo em:

```text
output/combinacao/
```

## Endpoints da API

### `POST /api/combine/audio`

Combina multiplos audios.

Campos do formulario:

- `audios`: arquivos de audio, minimo 2
- `duration`: duracao maxima em segundos, opcional
- `format`: `mp3` ou `wav`

Resposta:

```json
{
  "url": "/output/audio/audio_combinado_123.mp3",
  "relativePath": "audio/audio_combinado_123.mp3"
}
```

### `POST /api/combine/videos`

Combina multiplos videos.

Campos do formulario:

- `videos`: arquivos de video, minimo 2
- `duration`: duracao maxima em segundos, opcional

Resposta:

```json
{
  "url": "/output/videos/video_combinado_123.mp4",
  "relativePath": "videos/video_combinado_123.mp4"
}
```

### `POST /api/combine/merge`

Aplica um audio em um video.

Campos do formulario:

- `video`: arquivo de video
- `audio`: arquivo de audio
- `duration`: duracao maxima em segundos, opcional

Resposta:

```json
{
  "url": "/output/combinacao/video_com_audio_123.mp4",
  "relativePath": "combinacao/video_com_audio_123.mp4"
}
```

## Estrutura do projeto

```text
.
+-- public/
|   +-- index.html          # Interface web
+-- output/
|   +-- audio/              # Audios gerados
|   +-- videos/             # Videos combinados
|   +-- combinacao/         # Videos com audio aplicado
+-- uploads/                # Arquivos temporarios enviados pelo usuario
+-- server.js               # Servidor Express e processamento FFmpeg
+-- package.json
+-- package-lock.json
```

## Limites e formatos aceitos

O upload atual aceita arquivos de ate `100 MB`.

Formatos aceitos:

- Audio: MP3 e WAV
- Video: MP4, MPEG e WEBM

Saidas geradas:

- Audio: MP3 ou WAV
- Video: MP4

## Observacoes importantes

- O processamento depende do FFmpeg instalado no ambiente.
- Os arquivos enviados sao gravados temporariamente na pasta de uploads e removidos apos o processamento.
- Os resultados gerados ficam disponiveis dentro da pasta `output/`.
- Para publicar no GitHub, normalmente nao e recomendado versionar `node_modules/`, arquivos enviados, nem arquivos grandes gerados em `output/`.

## Scripts

```bash
npm start
```

Inicia o servidor Express definido em `server.js`.

## Licenca

Este projeto ainda nao possui uma licenca definida. Antes de publicar ou distribuir, adicione um arquivo `LICENSE` conforme o tipo de uso desejado.
