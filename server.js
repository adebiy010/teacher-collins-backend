require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "80mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("Server is working ✅");
});

app.post("/chat", async (req, res) => {
  try {
    console.log("🔥 Incoming request");

    const { message, image, images, mode } = req.body;

    const finalImages = [];

    if (Array.isArray(images)) {
      finalImages.push(...images);
    }

    if (image) {
      finalImages.push(image);
    }

    const userQuestion =
      message && message.trim() !== ""
        ? message
        : "Study the uploaded image or images carefully and answer.";

    const modeInstruction =
      mode === "student"
        ? "You are in Student Mode. Explain simply, step by step, like teaching a learner."
        : "You are in Teacher Mode. Give a clear professional answer suitable for teaching.";

    const content = [
      {
        type: "input_text",
        text: `
You are Teacher Collins AI.

${modeInstruction}

Use this format:

English:
<answer>

Arabic:
<translation>

Question:
${userQuestion}
`,
      },
    ];

    for (const img of finalImages.slice(-5)) {
      content.push({
        type: "input_image",
        image_url: `data:image/jpeg;base64,${img}`,
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 500,
    });

    const text = response.output_text || "No response received.";

    res.json({
      reply: {
        english: text,
        arabic: "",
      },
    });
  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      reply: {
        english: "Error connecting to AI.",
        arabic: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.",
      },
    });
  }
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});