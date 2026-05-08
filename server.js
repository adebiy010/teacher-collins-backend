require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const OpenAI = require("openai");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const chatMemory = {};

app.get("/", (req, res) => {
  res.send("Teacher Collins AI Backend is working ✅");
});

app.post("/chat", async (req, res) => {
  try {
    console.log("🔥 Incoming request");

    const {
      message,
      image,
      images,
      mode,
      subject,
      userId,
      wordFile,
      wordFileName,
      pdfFile,
      pdfFileName,
    } = req.body;

    const currentUser = userId || "default_user";

    if (!chatMemory[currentUser]) {
      chatMemory[currentUser] = {
        messages: [],
        images: [],
      };
    }

    const userMemory = chatMemory[currentUser];

    if (image) userMemory.images.push(image);
    if (Array.isArray(images)) userMemory.images.push(...images);

    userMemory.images = userMemory.images.slice(-5);

    let documentText = "";

    if (wordFile) {
      const wordBuffer = Buffer.from(wordFile, "base64");
      const wordResult = await mammoth.extractRawText({ buffer: wordBuffer });
      documentText += \n\nWord Document (${wordFileName || "document.docx"}):\n${wordResult.value};
    }

    if (pdfFile) {
      const pdfBuffer = Buffer.from(pdfFile, "base64");
      const pdfResult = await pdfParse(pdfBuffer);
      documentText += \n\nPDF Document (${pdfFileName || "document.pdf"}):\n${pdfResult.text};
    }

    const userQuestion =
      message && message.trim() !== ""
        ? message
        : "Study the uploaded file or image carefully and answer.";

    userMemory.messages.push({
      role: "user",
      text: userQuestion,
    });

    userMemory.messages = userMemory.messages.slice(-10);

    const currentMode = mode || "teacher";
    const currentSubject = subject || "general";

    const modeInstruction =
      currentMode === "student"
        ? "You are in Student Mode. Explain simply, step by step, using easy language."
        : "You are in Teacher Mode. Give a professional teaching explanation suitable for classroom use.";

    let subjectInstruction = "";

    if (currentSubject === "english") {
      subjectInstruction =
        "Focus on English grammar, vocabulary, spelling, reading, writing, and sentence correction.";
    } else if (currentSubject === "math") {
      subjectInstruction =
        "Focus on solving math problems clearly step by step.";
    } else if (currentSubject === "science") {
      subjectInstruction =
        "Focus on science explanations using simple classroom examples.";
    } else if (currentSubject === "homework") {
      subjectInstruction =
        "Check homework carefully. Correct wrong answers and explain the correct answer.";
    } else {
      subjectInstruction = "Answer generally and helpfully.";
    }

    const previousMessages = userMemory.messages
      .map((m, index) => ${index + 1}. ${m.role}: ${m.text})
      .join("\n");

    const content = [
      {
        type: "input_text",
        text: `
You are Teacher Collins AI.

${modeInstruction}

${subjectInstruction}

You can remember recent chat, uploaded images, PDF files, and Word documents during this session.

Recent chat history:
${previousMessages}

Uploaded document text:
${documentText || "No document uploaded."}

Use this format only:

English:
<answer>

Arabic:
<Arabic translation>

Current question:
${userQuestion}
`,
      },
    ];

    for (const img of userMemory.images) {
      content.push({
        type: "input_image",
        image_url: data:image/jpeg;base64,${img},
      });
    }

    const response = await openai.responses.create({
      model: "gpt-4.1",
      input: [
        {
          role: "user",
          content,
        },
      ],
      max_output_tokens: 900,
    });

    const text = response.output_text || "No response received.";

    userMemory.messages.push({
      role: "assistant",
      text,
    });

    userMemory.messages = userMemory.messages.slice(-10);

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

app.post("/clear-memory", (req, res) => {
  const { userId } = req.body;
  const currentUser = userId || "default_user";

  chatMemory[currentUser] = {
    messages: [],
    images: [],
  };

  res.json({
    success: true,
    message: "Memory cleared successfully.",
  });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("Teacher Collins AI server running on port 3000");
});