import { createFileRoute, useLocation } from "@tanstack/react-router"
import { ObjectHistory } from "../../../components/object/ObjectHistory"

export const Route = createFileRoute('/_auth/objects/history')({
  component: () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const objectPermId = searchParams.get('permid');

    return ObjectHistory({
      objectPermId: objectPermId || '',
    });
  },
})
