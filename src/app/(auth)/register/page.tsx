import RegisterForm from "./register-form";

export const metadata = { title: "Register — Tally" };

export default function RegisterPage() {
  return (
    <main className="grid flex-1 place-items-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">
          Create your Tally account
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}
