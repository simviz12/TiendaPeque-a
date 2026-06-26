import { notFound } from "next/navigation";
import { CreateUserForm } from "./create-user-form";

type Props = {
  params: Promise<{ secret: string }> | { secret: string };
};

function isValidSecret(secret: string) {
  const expected = process.env.SETUP_USERS_SECRET;
  return Boolean(expected && expected.length >= 40 && secret === expected);
}

export const metadata = {
  title: "Crear usuario - Tienda Casera",
};

export default async function CreateUserPage({ params }: Props) {
  const { secret } = await params;

  if (!isValidSecret(secret)) {
    notFound();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <section className="w-full max-w-md rounded-lg bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h1 className="text-2xl font-black text-slate-950">Crear usuario</h1>
          <p className="mt-1 text-sm font-semibold text-slate-500">
            Acceso privado para crear administradores y vendedores.
          </p>
        </div>

        <CreateUserForm secret={secret} />
      </section>
    </main>
  );
}
