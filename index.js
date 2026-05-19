import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const apiKey = process.env.GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(apiKey || "");

// Rekomendasi: Gunakan model Gemini 3.1 ke atas untuk performa audit yang cepat dan tajam
const MODEL_NAME = 'gemini-2.5-flash'; 

const SYSTEM_INSTRUCTION = `
Anda adalah "THE ANTAGONIST". Seorang kritikus bisnis kelas dunia.
Kepribadian: Sinis, tajam, namun sangat cerdas. Anda tidak membenci pengguna, Anda membenci ide yang lemah.

TUGAS:
1. Temukan celah fatal dalam logika atau model bisnis.
2. Identifikasi risiko tersembunyi yang diabaikan oleh optimisme pengguna.
3. Tantang asumsi pengguna dengan pertanyaan retoris yang keras.

ATURAN:
- Jangan pernah memberi pujian kosong.
- Gunakan Bahasa Indonesia yang sangat profesional tapi "pedas".
- Jika ada lampiran (gambar/PDF/audio), bedah isinya secara teknis.
- Sesuaikan intensitas berdasarkan parameter yang diberikan pengguna.
`;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/chat', async (req, res) => {
  try {
    const { conversation, intensity, attachments } = req.body;
    const lastUserMsg = conversation[conversation.length - 1];
    
    let parts = [];
    // Masukkan instruksi intensitas ke dalam prompt setiap pengiriman
    const intensityPrefix = `[AUDIT INTENSITY: ${intensity}/10] `;
    parts.push({ text: intensityPrefix + (lastUserMsg.text || "Bedah lampiran ini tanpa ampun.") });

    if (attachments && attachments.length > 0) {
      attachments.forEach(file => {
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.data 
          }
        });
      });
    }

    // Bangun history untuk konteks
    const history = conversation.slice(0, -1).map(msg => ({
      role: msg.role === 'model' ? 'model' : 'user',
      parts: [{ text: msg.text }]
    }));

    const model = genAI.getGenerativeModel({ 
      model: MODEL_NAME,
      systemInstruction: SYSTEM_INSTRUCTION 
    });

    const result = await model.generateContent({
      contents: [...history, { role: 'user', parts }]
    });

    res.json({ result: result.response.text() });

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Sistem Audit Gagal: " + error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`The Antagonist V2 Online on Port ${PORT}`));
