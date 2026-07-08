const { GoogleGenerativeAI } = require('@google/generative-ai')

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const MODEL_NAME = 'gemini-flash-lite-latest'

const model = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.3,
    maxOutputTokens: 2048,
  }
})

const chatModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.7,
    maxOutputTokens: 1024,
  }
})

const fastModel = genAI.getGenerativeModel({
  model: MODEL_NAME,
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 512,
  }
})

module.exports = { genAI, model, chatModel, fastModel }
