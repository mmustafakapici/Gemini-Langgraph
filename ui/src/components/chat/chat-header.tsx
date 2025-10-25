import { Brain, MessageSquareText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function ChatHeader() {
  return (
    <Card className="rounded-b-none border-b-0 shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <CardTitle className="text-2xl font-bold text-foreground">AI Chat</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Your intelligent assistant, ready to help.
            </CardDescription>
          </div>
        </div>
        <MessageSquareText className="h-6 w-6 text-muted-foreground" />
      </CardHeader>
    </Card>
  );
}
