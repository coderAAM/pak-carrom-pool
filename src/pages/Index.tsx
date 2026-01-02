import { CarromBoard } from '@/components/game/CarromBoard';

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-4 overflow-hidden">
      {/* Header */}
      <header className="text-center mb-4 animate-slide-up">
        <h1 className="text-3xl sm:text-4xl font-display game-title tracking-widest">
          CARROM POOL
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Classic Board Game</p>
      </header>

      {/* Game Board */}
      <main className="flex-1 flex items-center justify-center w-full">
        <CarromBoard />
      </main>

      {/* Footer */}
      <footer className="text-center py-2">
        <p className="text-xs text-muted-foreground">2 Player Local Game</p>
      </footer>
    </div>
  );
};

export default Index;
