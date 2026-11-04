import { createFileRoute } from "@tanstack/react-router";
import { ImportTypesToIlog } from "../../components/auth/ImportTypesToIlog";
import { AdminOnly } from "../../components/shared/AdminOnly";

export const Route = createFileRoute("/_auth/import")({
  component: () => <AdminOnly><ImportTypesToIlog /></AdminOnly>,
});
