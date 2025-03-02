// ...existing code...

class DebateBase {
  // ...existing constructor and methods...
  
  async generateResponse(step) {
    const { debaterIndex, type } = step;
    const debater = this.getDebater(debaterIndex);
    const prompt = this.generatePrompt(step);
    
    // Get the appropriate model client
    const modelClient = this.getModelClient(debater.model);
    
    // Simple promise-based approach with better error handling
    return new Promise((resolve, reject) => {
      let errorCount = 0;
      const maxRetries = 3;
      
      const attemptGeneration = () => {
        console.log(`Generating ${type} for ${debater.model} (${debater.position})`);
        
        try {
          modelClient.generateResponse(prompt, { model: debater.model })
            .then(response => {
              resolve(response);
            })
            .catch(error => {
              errorCount++;
              console.error(`Error attempt ${errorCount}/${maxRetries}: ${error.message}`);
              
              if (errorCount < maxRetries) {
                console.log(`Retrying... (${errorCount}/${maxRetries})`);
                // Wait before retrying with increasing delay
                setTimeout(attemptGeneration, 2000 * errorCount);
              } else {
                reject(new Error(`Failed to generate response after ${maxRetries} attempts: ${error.message}`));
              }
            });
        } catch (error) {
          reject(error);
        }
      };
      
      attemptGeneration();
    });
  }
  
  // ...existing code...
}

// ...existing code...