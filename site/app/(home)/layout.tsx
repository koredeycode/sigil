import { Navbar } from '@/components/Navbar';

export default function Layout({ children }: { children: any }) {
  return (
    <div className="flex-1 flex flex-col">
      <Navbar />
      {children}
    </div>
  );
}
