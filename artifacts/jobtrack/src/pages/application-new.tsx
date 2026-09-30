import { Link, useLocation } from "wouter";
import { ArrowLeft } from "lucide-react";
import { emptyInput } from "@/lib/domain";
import { store } from "@/lib/store";
import { ApplicationForm } from "@/components/application-form";
import { PageHeader } from "@/components/jt";
import { useToast } from "@/hooks/use-toast";

export default function ApplicationNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  return (
    <>
      <Link href="/applications" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" data-testid="link-back"><ArrowLeft className="h-4 w-4" /> Applications</Link>
      <PageHeader eyebrow="New entry" title="Add an application" />
      <ApplicationForm
        initial={emptyInput()}
        submitLabel="Save application"
        onCancel={() => navigate("/applications")}
        onSubmit={async (v) => {
          const r = await store.create(v);
          if (r.ok && r.app) {
            toast({ title: "Application saved", description: `${r.app.companyName} is now on your list.` });
            navigate(`/applications/${r.app.id}`);
          }
          return r;
        }}
      />
    </>
  );
}
