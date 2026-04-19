import { Logo } from './ui/logo';

export function PublicNav() {
  return (
    <header className="fixed top-4 left-4 right-4 z-40 mx-auto max-w-6xl">
      <div className="flex items-center justify-between h-14 px-4 rounded-full surface-raised backdrop-blur-xl">
        <Logo />
      </div>
    </header>
  );
}
