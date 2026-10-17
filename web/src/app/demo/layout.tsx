// Staged pages used to record the product demos. Not linked from the app, not indexed.
export const metadata = { robots: { index: false, follow: false } };

export default function DemoLayout({ children }: LayoutProps<"/demo">) {
  return children;
}
