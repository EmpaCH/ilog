import { createFileRoute } from "@tanstack/react-router";
import { Divider } from "@heroui/react";
import { ImportTypesToIlog } from "../../components/auth/ImportTypesToIlog";
import { LogbookCollectionSettings } from "../../components/logbook/LogbookCollectionSettings";
import { AdminOnly } from "../../components/shared/AdminOnly";

export const Route = createFileRoute("/_auth/settings")({
  component: () => (
    <AdminOnly>
      <div className="md-size-div">
        <h2>Settings</h2>
        <LogbookCollectionSettings />
        <Divider className="my-6" />
        <ImportTypesToIlog />
      </div>
    </AdminOnly>
  ),
});
