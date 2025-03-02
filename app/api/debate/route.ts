import { NextResponse } from 'next/server';
import { debateAgent } from '@/lib/agents/debate-agent';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { DebateInputSchema } from '@/lib/types';
// ...existing code...

export async function POST(request: Request) {
  const body = await request.json();
  
  try {
    const { topic, stance, opponentStance } = DebateInputSchema.parse(body);
    
    const chat = new ChatOpenAI({
      modelName: "gpt-3.5-turbo",
      temperature: 0.7,
    });
    
    // Create debate messages in a step-by-step manner
    const debateMessages = await debateAgent({
      topic,
      stance,
      opponentStance,
      chat,
    });
    
    // Return the full debate result at once
    return NextResponse.json({ messages: debateMessages });
    
  } catch (error) {
    console.error('Error in debate route:', error);
    return NextResponse.json(
      { error: 'Failed to generate debate' },
      { status: 500 }
    );
  }
}
