// ...existing code...

// Add a configuration option for streaming
const config = {
  useStreaming: true, // Set to false to disable streaming and use complete responses
};

// Modify the method that runs the debate rounds
async runDebateRound(round, format, debater1, debater2, topic, position1, position2) {
  // ...existing code...
  
  try {
    if (config.useStreaming) {
      // Use streaming if enabled
      try {
        const stream = await model.streamResponse(prompt, { maxTokens: 2000 });
        process.stdout.write(`\n\n--- ${modelName} (${position}) - ${stage} ---\n\n\n`);
        
        for await (const text of stream) {
          process.stdout.write(text);
          response += text;
        }
      } catch (error) {
        // If streaming fails, fall back to non-streaming
        console.log(`\nStreaming failed, falling back to complete response mode: ${error.message}`);
        response = await model.getResponse(prompt, { maxTokens: 2000 });
        process.stdout.write(`\n\n--- ${modelName} (${position}) - ${stage} ---\n\n\n${response}`);
      }
    } else {
      // Use non-streaming mode
      response = await model.getResponse(prompt, { maxTokens: 2000 });
      process.stdout.write(`\n\n--- ${modelName} (${position}) - ${stage} ---\n\n\n${response}`);
    }
  } catch (error) {
    console.error(`Error getting response: ${error.message}`);
    response = `[Error: ${error.message}]`;
  }
  
  // ...existing code...
}

// ...existing code...
