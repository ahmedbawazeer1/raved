export default function ApplyLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background">{children}</div>;
}
