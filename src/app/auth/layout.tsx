export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="p-5">
      <div className="max-w-lg mx-auto">{children}</div>
    </main>
  );
}
