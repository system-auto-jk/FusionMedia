const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const multer = require("multer");
const { nanoid } = require("nanoid");
const mime = require("mime");

const app = express();
const PORT = 3000;

// Pastas
const PUBLIC_DIR = path.join(__dirname, "public");
const OUTPUT_DIR = path.join(__dirname, "output");
const OUT_AUDIO = path.join(OUTPUT_DIR, "audio");
const OUT_VIDEOS = path.join(OUTPUT_DIR, "videos");
const OUT_COMBO = path.join(OUTPUT_DIR, "combinacao");
const UPLOADS_DIR = path.join(__dirname, "Uploads");

[PUBLIC_DIR, OUTPUT_DIR, OUT_AUDIO, OUT_VIDEOS, OUT_COMBO, UPLOADS_DIR].forEach(
  (dir) => !fs.existsSync(dir) && fs.mkdirSync(dir, { recursive: true })
);

app.use(express.static(PUBLIC_DIR));
app.use("/output", express.static(OUTPUT_DIR));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOADS_DIR),
  filename: (_, file, cb) => {
    const id = nanoid(8);
    const ext = path.extname(file.originalname) || "." + (mime.getExtension(file.mimetype) || "bin");
    cb(null, `${Date.now()}_${id}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validTypes = ["audio/mpeg", "audio/wav", "video/mp4", "video/mpeg", "video/webm"];
    if (!validTypes.includes(file.mimetype)) return cb(new Error("Formato de arquivo inválido"));
    cb(null, true);
  },
});

const FFMPEG_BIN = process.env.FFMPEG_BIN || "ffmpeg";

function runFFmpeg(args) {
  return new Promise((resolve, reject) => {
    const ff = spawn(FFMPEG_BIN, args, { windowsHide: true });
    let stderr = "";
    ff.stderr.on("data", (data) => stderr += data.toString());
    ff.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.slice(-200)));
    });
    ff.on("error", (err) => reject(new Error("FFmpeg não encontrado ou falhou ao iniciar")));
  });
}

// Combinar áudios
app.post("/api/combine/audio", upload.array("audios"), async (req, res) => {
  const files = req.files.map((f) => f.path);
  if (files.length < 2) {
    files.forEach(fs.unlinkSync);
    return res.status(400).json({ error: "Envie pelo menos 2 áudios." });
  }

  const tempOut = path.join(UPLOADS_DIR, `temp_${nanoid(8)}.wav`);
  const inputs = files.flatMap(f => ['-i', f]);
  const filter = files.map((_, i) => `[${i}:a]`).join('') + `concat=n=${files.length}:v=0:a=1[a]`;
  let args = [
    ...inputs,
    '-filter_complex', filter,
    '-map', '[a]',
    '-c:a', 'pcm_s16le',
    '-y', tempOut
  ];

  try {
    await runFFmpeg(args);
  } catch (e) {
    files.forEach(fs.unlinkSync);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    return res.status(500).json({ error: e.message });
  }

  const duration = req.body.duration ? parseFloat(req.body.duration) : null;
  const format = req.body.format || 'mp3';
  const outName = `audio_combinado_${Date.now()}.${format}`;
  const outPath = path.join(OUT_AUDIO, outName);
  const url = `/output/audio/${outName}`;
  const relativePath = `audio/${outName}`;

  args = ['-i', tempOut];
  if (duration) args.push('-t', duration);
  if (format === 'wav') args.push('-c:a', 'pcm_s16le');
  else args.push('-c:a', 'libmp3lame', '-b:a', '192k');
  args.push('-y', outPath);

  try {
    await runFFmpeg(args);
    files.forEach(fs.unlinkSync);
    fs.unlinkSync(tempOut);
    res.json({ url, relativePath });
  } catch (e) {
    files.forEach(fs.unlinkSync);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    res.status(500).json({ error: e.message });
  }
});

// Combinar vídeos
app.post("/api/combine/videos", upload.array("videos"), async (req, res) => {
  const files = req.files.map((f) => f.path);
  if (files.length < 2) {
    files.forEach(fs.unlinkSync);
    return res.status(400).json({ error: "Envie pelo menos 2 vídeos." });
  }

  const tempOut = path.join(UPLOADS_DIR, `temp_${nanoid(8)}.mp4`);
  const tempListFile = path.join(UPLOADS_DIR, `temp_list_${nanoid(8)}.txt`);
  fs.writeFileSync(tempListFile, files.map((f) => `file '${f}'`).join("\n"));

  let args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', tempListFile,
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '20',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-y', tempOut
  ];

  try {
    await runFFmpeg(args);
  } catch (e) {
    files.forEach(fs.unlinkSync);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
    return res.status(500).json({ error: e.message });
  }

  const duration = req.body.duration ? parseFloat(req.body.duration) : null;
  const outName = `video_combinado_${Date.now()}.mp4`;
  const outPath = path.join(OUT_VIDEOS, outName);
  const url = `/output/videos/${outName}`;
  const relativePath = `videos/${outName}`;

  args = ['-i', tempOut];
  if (duration) args.push('-t', duration);
  args.push('-c', 'copy', '-y', outPath);

  try {
    await runFFmpeg(args);
    files.forEach(fs.unlinkSync);
    fs.unlinkSync(tempOut);
    fs.unlinkSync(tempListFile);
    res.json({ url, relativePath });
  } catch (e) {
    files.forEach(fs.unlinkSync);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    if (fs.existsSync(tempListFile)) fs.unlinkSync(tempListFile);
    res.status(500).json({ error: e.message });
  }
});

// Merge áudio + vídeo
app.post("/api/combine/merge", upload.fields([{ name: "video", maxCount: 1 }, { name: "audio", maxCount: 1 }]), async (req, res) => {
  const v = req.files.video?.[0];
  const a = req.files.audio?.[0];
  if (!v || !a) {
    if (v) fs.unlinkSync(v.path);
    if (a) fs.unlinkSync(a.path);
    return res.status(400).json({ error: "Envie 1 vídeo e 1 áudio." });
  }

  const videoPath = v.path;
  const audioPath = a.path;
  const tempOut = path.join(UPLOADS_DIR, `temp_${nanoid(8)}.mp4`);
  const args = [
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-shortest',
    '-y', tempOut
  ];

  try {
    await runFFmpeg(args);
  } catch (e) {
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    return res.status(500).json({ error: e.message });
  }

  const duration = req.body.duration ? parseFloat(req.body.duration) : null;
  const outName = `video_com_audio_${Date.now()}.mp4`;
  const outPath = path.join(OUT_COMBO, outName);
  const url = `/output/combinacao/${outName}`;
  const relativePath = `combinacao/${outName}`;

  const finalArgs = [
    '-i', tempOut,
    ...(duration ? ['-t', duration] : []),
    '-c', 'copy',
    '-y', outPath
  ];

  try {
    await runFFmpeg(finalArgs);
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    fs.unlinkSync(tempOut);
    res.json({ url, relativePath });
  } catch (e) {
    fs.unlinkSync(videoPath);
    fs.unlinkSync(audioPath);
    if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () =>
  console.log(`🚀 FusionMedia Pro rodando em http://localhost:${PORT}`)
);