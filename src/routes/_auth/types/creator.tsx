import { createFileRoute, Router, useLocation, ParsedLocation, HistoryState } from '@tanstack/react-router'
import { ObjectTypeCreator } from '../../../components/type/ObjectTypeCreator.tsx'
import { EMPTY_TYPE_DEFINITION } from '../../../apis/shared/common'
import { convertOpenBISSampleTypeToObjectTypeDefinition, ObjectTypeDefinition } from '../../../apis/type/commonType'
import openbis from '@openbis/openbis.esm';


interface TypeCreatorState extends HistoryState{
  objectType?: ObjectTypeDefinition;
  openbisSampleType?: openbis.SampleType;
  mode?: 'create' | 'edit';
}


export const Route = createFileRoute('/_auth/types/creator')({
  component: () => {
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const mode = searchParams.get('mode') as 'create' | 'edit' || 'create';
    const objectTypeCode = decodeURIComponent(searchParams.get('objecttypecode') || '');

    // check if objectType is passed and if so the propertyAssignments need to be adjusted to our schema of [group, properties] dictionary
    if (objectTypeCode) {
      
    }

    return ObjectTypeCreator({
      objectTypeCode: objectTypeCode || '',
      mode: mode,
    });
  },
})
