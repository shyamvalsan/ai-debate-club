import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';

export async function debateAgent({
  topic,
  stance,
  opponentStance,
  chat,
}: {
  topic: string;
  stance: string;
  opponentStance: string;
  chat: ChatOpenAI;
}) {
  // Initialize messages array
  const messages: BaseMessage[] = [];
  
  // Add system message explaining the format
  const systemMessage = new SystemMessage(
    `You are participating in a debate on the topic: "${topic}". 
     You will argue for the stance: "${stance}".
     Your opponent will argue for: "${opponentStance}".
     Provide a compelling argument in a formal debate style.`
  );
  messages.push(systemMessage);
  
  // Generate opening statement
  const openingPrompt = new HumanMessage(
    `Please provide an opening statement for the debate topic: "${topic}" from the perspective of "${stance}".`
  );
  const openingResponse = await chat.invoke([systemMessage, openingPrompt]);
  messages.push(openingPrompt);
  messages.push(openingResponse);
  
  // Generate opponent's response
  const opponentPrompt = new HumanMessage(
    `Now, provide a response from the opponent's perspective of "${opponentStance}" to the previous argument.`
  );
  const opponentResponse = await chat.invoke([...messages, opponentPrompt]);
  messages.push(opponentPrompt);
  messages.push(opponentResponse);
  
  // Generate rebuttal
  const rebuttalPrompt = new HumanMessage(
    `Now, provide a rebuttal from the perspective of "${stance}" addressing the opponent's points.`
  );
  const rebuttalResponse = await chat.invoke([...messages, rebuttalPrompt]);
  messages.push(rebuttalPrompt);
  messages.push(rebuttalResponse);
  
  // Generate opponent's counter-rebuttal
  const counterPrompt = new HumanMessage(
    `Now, provide a counter-rebuttal from the opponent's perspective of "${opponentStance}".`
  );
  const counterResponse = await chat.invoke([...messages, counterPrompt]);
  messages.push(counterPrompt);
  messages.push(counterResponse);
  
  // Generate closing statement
  const closingPrompt = new HumanMessage(
    `Finally, provide a closing statement from the perspective of "${stance}".`
  );
  const closingResponse = await chat.invoke([...messages, closingPrompt]);
  messages.push(closingPrompt);
  messages.push(closingResponse);
  
  return messages;
}
