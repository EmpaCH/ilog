import { createFileRoute, useLocation } from '@tanstack/react-router'
import { ObjectCreator } from '../../../components/object/ObjectCreator'

export const Route = createFileRoute('/_auth/objects/creator')({
  component: () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode') as 'create' | 'edit' || 'create';
    const objectCode = decodeURIComponent(searchParams.get('objectcode') || '');

    return ObjectCreator({
      objectCode: objectCode || '',
      mode: mode,
    });
  },
})
