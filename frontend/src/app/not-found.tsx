import { ButtonLink, Card } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10">
      <Card className="grid justify-items-start gap-2">
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-muted">That page doesn&apos;t exist.</p>
        <ButtonLink href="/" variant="secondary">
          Go home
        </ButtonLink>
      </Card>
    </div>
  );
}
