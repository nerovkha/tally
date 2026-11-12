import LoginForm from "./login-form";

export const metadata = { title: "Log in — Tally" };

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const { callbackUrl } = await searchParams;

  return (
    <main className="grid flex-1 place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Log in to Tally</h1>
        <LoginForm
          callbackUrl={
            typeof callbackUrl === "string" ? callbackUrl : undefined
          }
        />
      </div>
    </main>
  );
}
