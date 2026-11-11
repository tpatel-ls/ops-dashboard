// The page is a client component, which cannot export metadata, so its title
// lives here.
export const metadata = { title: 'Ask · Taskify' };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
