import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mic, PenTool, MessageCircle, Eye } from 'lucide-react';

const practiceTypes = [
  {
    icon: Mic,
    title: 'Speaking Test',
    description: 'Practice pronunciation with audio playback and recording',
    color: 'bg-primary',
    comingSoon: true
  },
  {
    icon: PenTool,
    title: 'Writing Test',
    description: 'Practice writing Korean characters and sentences',
    color: 'bg-secondary',
    comingSoon: true
  },
  {
    icon: MessageCircle,
    title: 'Dialog Test',
    description: 'Practice conversational Korean with simulated dialogs',
    color: 'bg-accent',
    comingSoon: true
  },
  {
    icon: Eye,
    title: 'Color Blind Test',
    description: 'Ishihara color blindness test for EPS requirements',
    color: 'bg-muted-foreground',
    comingSoon: true
  }
];

export default function Practice() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Practice</h1>
        <p className="text-muted-foreground">Test your Korean language skills</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {practiceTypes.map((practice) => (
          <Card key={practice.title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className={`p-4 rounded-xl ${practice.color}`}>
                  <practice.icon className="w-8 h-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-lg text-foreground">{practice.title}</h3>
                    {practice.comingSoon && (
                      <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                        Coming Soon
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{practice.description}</p>
                  <Button 
                    className="mt-4" 
                    variant="outline" 
                    disabled={practice.comingSoon}
                  >
                    Start Practice
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardHeader>
          <CardTitle>Vocabulary Quiz</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Test your knowledge with flashcards and spaced repetition quizzes based on your vocabulary.
          </p>
          <Button className="bg-primary">Start Vocabulary Quiz</Button>
        </CardContent>
      </Card>
    </div>
  );
}
