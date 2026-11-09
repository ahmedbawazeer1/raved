/** Every student page fades in when it opens (opacity only, so fixed sheets stay in place). */
export default function StudentTemplate({ children }: { children: React.ReactNode }) {
  return <div className="flex min-w-0 flex-1 flex-col motion-safe:animate-[page-in_.22s_ease-out]">{children}</div>;
}
