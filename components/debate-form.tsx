import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
// ...existing code...

export function DebateForm() {
  const [topic, setTopic] = useState('');
  const [stance, setStance] = useState('');
  const [opponentStance, setOpponentStance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [debateMessages, setDebateMessages] = useState([]);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setDebateMessages([]);

    try {
      const response = await fetch('/api/debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ topic, stance, opponentStance }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate debate');
      }

      const data = await response.json();
      setDebateMessages(data.messages);
    } catch (err) {
      setError(err.message || 'An error occurred during the debate generation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // ...existing form code...
    <div className="space-y-4 mt-8">
      {isLoading && <p>Generating debate...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {debateMessages.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold">Debate Results</h2>
          {debateMessages.map((message, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>{message.type === 'ai' ? 'AI' : 'Human'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{message.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    // ...rest of component...
  );
}
