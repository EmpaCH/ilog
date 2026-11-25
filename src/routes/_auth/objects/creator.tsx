import { createFileRoute, useLocation } from '@tanstack/react-router'
import { ObjectCreator } from '../../../components/object/ObjectCreator'

export const Route = createFileRoute('/_auth/objects/creator')({
  component: () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode') as 'create' | 'edit' || 'create';
    const objectPermId = searchParams.get('permid');

    return ObjectCreator({
      objectPermId: objectPermId || '',
      mode: mode,
    });
  },
})
