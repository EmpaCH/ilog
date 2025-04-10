import { createFileRoute, useLocation } from "@tanstack/react-router"
import { ObjectHistory } from "../../../components/object/ObjectHistory"

export const Route = createFileRoute('/_auth/objects/history')({
  component: () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const objectCode = searchParams.get('objectcode');

    return ObjectHistory({
      objectCode: objectCode || '',
    });
  },
})
