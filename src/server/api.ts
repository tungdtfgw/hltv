import express from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Global Error Handler for Express
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Global Error Handler:", err);
  res.status(500).json({ 
    error: "Express Global Error", 
    message: err.message || "Unknown error",
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    hasApiKey: !!process.env.GEMINI_API_KEY,
    env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { history, documentContext, role, personality, difficulty, lastUserResponse } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY environment variable. Please configure it in your Vercel project settings." });
    }

    const systemInstruction = `
      Bạn đang đóng vai một ${role} (${role === 'phụ huynh' ? 'phụ huynh' : 'học sinh'}) đang đi tìm hiểu thông tin tuyển sinh.
      Tính cách của bạn: ${personality}.
      Mức độ khó: ${difficulty}.
      
      Dữ liệu nền về tuyển sinh của trường:
      ${documentContext}

      NHIỆM VỤ:
      - Bạn sẽ lần lượt đặt câu hỏi cho tư vấn viên (người dùng).
      - Nếu mức độ khó là "chỉ hỏi trong tài liệu", hãy bám sát dữ liệu nền.
      - Nếu mức độ khó là "hỏi thêm bên ngoài", hãy xen kẽ các câu hỏi khó, các tình huống thực tế không có trong tài liệu.
      - Hãy thể hiện đúng tính cách ${personality}.
      - Dựa trên câu trả lời mới nhất của tư vấn viên: "${lastUserResponse}", hãy phản hồi và đặt câu hỏi tiếp theo.
      - Đừng trả lời quá dài, mỗi lần chỉ nên hỏi 1-2 câu.
    `;

    let contents = history.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || "..." }]
    }));

    if (contents.length === 0) {
      contents = [{
        role: 'user',
        parts: [{ text: lastUserResponse || "Bắt đầu phiên tư vấn" }]
      }];
    }

    // Attempting with gemini-2.0-flash or gemini-1.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.8,
      },
    });

    res.json({ message: response.text });
  } catch (error: any) {
    console.error("Chat error:", error);
    res.status(500).json({ 
      error: "Gemini API Error",
      message: error.message || "Internal Server Error",
      details: error.stack
    });
  }
});

app.post("/api/evaluate", async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing GEMINI_API_KEY environment variable." });
    }

    const { history, documentContext, role, personality } = req.body;

    const prompt = `
      Hãy đánh giá phiên tư vấn vừa rồi giữa một tư vấn viên (người dùng) và một ${role} có tính cách ${personality}.
      
      Dữ liệu nền:
      ${documentContext}
      
      Lịch sử cuộc trò chuyện:
      ${JSON.stringify(history)}
      
      Hãy xuất kết quả dưới dạng JSON với cấu trúc sau:
      {
        "accuracy": number (0-100),
        "persuasiveness": number (0-100),
        "attitude": number (0-100),
        "summary": string (tổng quan về buổi tư vấn),
        "errors": [
          {
            "question": string (câu hỏi của người dùng đóng vai),
            "userAnswer": string (câu trả lời của tư vấn viên),
            "correctInfo": string (thông tin đúng từ tài liệu),
            "feedback": string (tại sao sai hoặc thiếu)
          }
        ],
        "suggestions": [
          {
            "situation": string (tình huống khó),
            "sampleAnswer": string (câu trả lời mẫu tốt),
            "behaviorTip": string (mẹo ứng xử với tính cách ${personality})
          }
        ]
      }
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Evaluation error:", error);
    res.status(500).json({ 
      error: "Gemini API Error (Evaluation)",
      message: error.message || "Internal Server Error",
      details: error.stack
    });
  }
});

export default app;
