import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";

config();

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export default ai;
