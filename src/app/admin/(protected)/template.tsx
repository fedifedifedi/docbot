/** Re-mounted on every admin navigation (unlike the layout): each page fades in. */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-up">{children}</div>;
}
