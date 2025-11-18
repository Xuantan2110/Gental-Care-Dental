const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function classifyMessage(message) {
  const prompt = `
You are a question classifier.
- If the question is related to dentistry, teeth... then return "dental".
- If it is not related, return "non-dental".
- If it is a question like greeting, then return "greetings".
Question: ${message}
  `;

  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
  const result = await model.generateContent(prompt);

  return result.response.text().trim().toLowerCase();
}

const chatbotController = {
  handleChat: async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) {
        return res.status(400).json({ error: "Message required" });
      }

      // 1. Phân loại
      const category = await classifyMessage(message);

      if (category === "greetings") {
        return res.json({
          reply: "Hi, I am Gentle Care Dental's AI assistant, I will answer your dental related questions. Feel free to ask me any dental related questions.",
        });
      }

      if (category !== "dental") {
        return res.json({
          reply: "Sorry, I am Gentle Care Dental's AI assistant, I can only assist with dental related questions.",
        });
      }

      // 2. Nếu là dental → gọi Gemini để trả lời
      const systemInstruction = `
You are a virtual assistant for a dental clinic.
- Respond briefly, politely, and clearly in English.
- If a user asks to make an appointment, ask for their name, phone number, and desired date/time.
- Do not respond to non-dental topics.
      `;

      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-001" });
      const result = await model.generateContent(`
${systemInstruction}

User Question: ${message}
      `);

      res.json({ reply: result.response.text() });
    } catch (err) {
      console.error("Chatbot error:", err);
      res.status(500).json({ error: "Internal server error", detail: err.message });
    }
  },
};

module.exports = chatbotController;
